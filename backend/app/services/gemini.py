

import os
import json
from dotenv import load_dotenv
import google.generativeai as genai
from datetime import date

# Load environment variables from .env file
load_dotenv()

# --- Simplified Gemini API Configuration ---
try:
    api_key = os.getenv("GEMINI_API_KEY_1")
    if not api_key:
        raise ValueError("GEMINI_API_KEY not found in environment variables.")
    genai.configure(api_key=api_key)
    print("Gemini API configured successfully.")
except ValueError as e:
    print(f"Error: {e}")
    api_key = None # Flag that configuration failed

today = date.today().strftime('%d-%m-%Y')

def parsed_info(data):
    if not api_key:
        return json.dumps({"error": "Gemini API key not configured."})

    # This prompt matches the 'master JSON' format required by the PDF generator.
    prompt_template = """
You are a strict invoice data extractor.
Your task is to extract information from the user's query and format it into a raw JSON object.
Translate any Hindi or local language input to English before processing.

CRITICAL RULES:
- Your entire output MUST be a single, raw JSON object.
- The output must start with '{' and end with '}'.
- DO NOT use markdown, code blocks (```), or any text before or after the JSON.
- If a value is not provided by the user, use an empty string "" or an empty list [].
- If the user doesn't specify an invoice date, use today's date: "{today_date}".

The JSON output must follow this exact structure:

{
  "invoice": {
    "title": "Tax Invoice",
    "number": "VAI/001",
    "date": "{today_date}",
    "due_date": ""
  },
  "company": {
    "name": "Your Company Name",
    "address": "Your Company Address",
    "state": "Your Company State",
    "gstin": "Your Company GSTIN",
    "logo_path": ""
  },
  "buyer": {
    "name": "Buyer Name",
    "address": "Buyer Address",
    "state": "Buyer State",
    "gstin": "",
    "signature_path": ""
  },
  "items": [
    {
      "name": "Item 1 Name",
      "hsn": "123456",
      "quantity": 1,
      "unit": "Pcs",
      "rate": 15000.00,
      "gst_rate": 18
    }
  ],
  "bank": {
    "name": "Bank Name",
    "account": "Account Number",
    "branch_ifsc": "IFSC Code"
  },
  "terms_and_conditions": [
    "First term.",
    "Second term."
  ]
}

User query: "{data}"
"""

    data_str = json.dumps(data, ensure_ascii=False)
    prompt = (
        prompt_template
        .replace("{data}", data_str)
        .replace("{today_date}", today)
    )

    model = genai.GenerativeModel(
        "gemini-2.0-flash",
        generation_config={"response_mime_type": "application/json"} # Use JSON mode
    )

    # --- Simplified API Call ---
    try:
        response = model.generate_content(prompt)
        print("Successfully generated content from API.")
        return response.text
    except Exception as e:
        error_message = f"API call failed. Error: {e}"
        print(error_message)
        return json.dumps({"error": error_message})