import os
import logging
import pandas as pd
from dotenv import load_dotenv
from supabase import create_client, Client
import google.generativeai as genai
from tqdm import tqdm
import time

load_dotenv()
logging.basicConfig(level=logging.INFO)

# --- Configuration ---
EXCEL_FILE_PATH = "hsn_codes.xlsx"
DESCRIPTION_COLUMN = "Description"
HSN_CODE_COLUMN = "HSN Code"

# --- Initialize Clients ---
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_KEY")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY_1")

if not all([SUPABASE_URL, SUPABASE_SERVICE_KEY, GEMINI_API_KEY]):
    raise ValueError("One or more required environment variables are missing.")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
genai.configure(api_key=GEMINI_API_KEY)

def index_data():
    try:
        # --- STEP 1: Fetch HSN codes that are ALREADY in the database ---
        logging.info("Checking for already indexed HSN codes in the database...")
        response = supabase.table("hsn_codes").select("hsn_code").execute()
        existing_hsn_codes = {str(item['hsn_code']) for item in response.data}
        logging.info(f"Found {len(existing_hsn_codes)} existing records. They will be skipped.")

        # --- STEP 2: Load the Excel file and filter out the records we already have ---
        df = pd.read_excel(EXCEL_FILE_PATH, header=2, usecols="B,C")
        df[HSN_CODE_COLUMN] = df[HSN_CODE_COLUMN].astype(str) # Ensure HSN codes are strings
        
        # Keep only the rows that are NOT in the set of existing codes
        df_to_process = df[~df[HSN_CODE_COLUMN].isin(existing_hsn_codes)].copy()
        
        # Drop any rows that might have an empty description after filtering
        clean_df = df_to_process.dropna(subset=[DESCRIPTION_COLUMN]).copy()

        texts_to_embed = clean_df[DESCRIPTION_COLUMN].tolist()
        if not texts_to_embed:
            logging.info("✅ All HSN codes are already indexed. No new data to process.")
            return

        logging.info(f"Found {len(texts_to_embed)} new descriptions to embed and index...")

        # --- STEP 3: Process the remaining data in batches with retries ---
        all_embeddings = []
        batch_size = 100 
        for i in tqdm(range(0, len(texts_to_embed), batch_size), desc="Embedding Batches"):
            batch_texts = texts_to_embed[i:i + batch_size]
            
            # Simple retry logic for each batch
            retries = 3
            for attempt in range(retries):
                try:
                    response = genai.embed_content(
                        model="models/text-embedding-004",
                        content=batch_texts,
                        task_type="retrieval_document"
                    )
                    all_embeddings.extend(response["embedding"])
                    break # Success, break the retry loop
                except Exception as e:
                    logging.warning(f"Batch {i//batch_size + 1} failed on attempt {attempt + 1}/{retries}. Error: {e}")
                    if attempt < retries - 1:
                        time.sleep(5) # Wait 5 seconds before retrying
                    else:
                        raise # If all retries fail, raise the exception

        clean_df['embedding'] = all_embeddings
        
        records_to_insert = []
        for index, row in clean_df.iterrows():
            records_to_insert.append({
                "hsn_code": str(row[HSN_CODE_COLUMN]),
                "description": row[DESCRIPTION_COLUMN],
                "embedding": row["embedding"]
            })

        logging.info(f"Inserting {len(records_to_insert)} new records into the database...")
        supabase.table("hsn_codes").insert(records_to_insert).execute()
        logging.info("✅ Successfully indexed new batch of HSN codes.")

    except Exception as e:
        logging.error(f"❌ An error occurred during indexing: {e}")

if __name__ == "__main__":
    index_data()