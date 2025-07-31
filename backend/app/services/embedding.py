# import google.generativeai as genai
# import num2words
# from app.core.supabase import supabase
# import json

# def transform_for_creation(input_data: dict) -> dict:
#     """
#     Transforms the initial data structure into the format required for invoice creation,
#     including calculations for subtotal, GST, and total amount.
#     """
#     # 1. Map existing data and add required placeholder fields
#     company_in = input_data.get("company", {})
#     invoice_in = input_data.get("invoice", {})
#     buyer_in = input_data.get("buyer", {})
#     items_in = input_data.get("items", [])
#     bank_in = input_data.get("bank", {})

#     output_data = {
#         "intent": "create",
#         "company": {
#             "name": company_in.get("name"),
#             "address": company_in.get("address"),
#             "district": None,
#             "mobile": company_in.get("contact"),
#             "phone": None,
#             "gstin": company_in.get("gst_no"),
#             "state": "Maharashtra",
#             "contact": None,
#             "email": company_in.get("email")
#         },
#         "invoice": {
#             "number": invoice_in.get("number"),
#             "date": invoice_in.get("date"),
#             "delivery_note": None, "payment_terms": None, "reference": None,
#             "other_references": None, "buyer_order": None, "buyer_order_date": None,
#             "dispatch_doc": None, "delivery_date": None, "dispatch_through": None,
#             "destination": None, "terms_delivery": None
#         },
#         "buyer": {
#             "name": buyer_in.get("name"),
#             "address": buyer_in.get("address"),
#             "gstin": buyer_in.get("gstin"),
#             "state": "Maharashtra"
#         },
#         "bank": bank_in
#     }

#     # 2. Process items and perform calculations
#     subtotal = 0
#     total_gst = 0
#     output_items = []

#     for item in items_in:
#         quantity = item.get("quantity", 0) or 0
#         rate = item.get("rate", 0) or 0
#         item_amount = quantity * rate
        
#         gst_rate = 18  # Assumption: Using a default 18% GST. Modify as needed.
#         hsn_code = item.get("hsn", "0000") # Use HSN from AI or fallback to placeholder
#         gst_amount = round(item_amount * (gst_rate / 100), 2)
        
#         output_items.append({
#             "name": item.get("name"), "hsn": hsn_code, "gst_rate": gst_rate,
#             "quantity": quantity, "unit": None, "rate": rate,
#             "amount": item_amount, "gst_amount": gst_amount
#         })
        
#         subtotal += item_amount
#         total_gst += gst_amount

#     total = round(subtotal + total_gst, 2)

#     # 3. Convert total to words
#     rupees, paise = divmod(total, 1)
#     paise = int(round(paise * 100))
#     amount_words = ""
#     if rupees > 0:
#         amount_words += f"{num2words(int(rupees), lang='en_IN').title()} Rupees"
#     if paise > 0:
#         amount_words += f" And {num2words(paise, lang='en_IN').title()} Paise"
#     amount_words = (amount_words.strip() or "Zero Rupees") + " Only."

#     # 4. Add calculated fields to the final output
#     output_data.update({
#         "items": output_items,
#         "amount_in_words": amount_words,
#         "subtotal": subtotal,
#         "total_gst": total_gst,
#         "total": total
#     })
    
#     return output_data
# # ✅ END: Added Transformation Function

# def embed_and_store_invoice(invoice_id: int, invoice_data: dict):
#     """
#     Embeds semantically distinct chunks of invoice data and stores them in Supabase.
#     """
#     chunks_to_embed = []
#     invoice_no = invoice_data.get('invoice', {}).get('number', '')

#     # Chunk 1: Header (Contains all top-level invoice details)
#     invoice_text = (
#         f"Invoice No: {invoice_no}\n"
#         f"Date: {invoice_data.get('invoice', {}).get('date', '')}\n"
#         f"Amount in words: {invoice_data.get('amount_in_words', '')}"
#     )
#     chunks_to_embed.append(("invoice", invoice_text))

#     # Chunk 2: Buyer details (Focused only on the buyer)
#     buyer_text = (
#         f"Information for the buyer on invoice {invoice_no}:\n"
#         f"Buyer name: {invoice_data.get('buyer', {}).get('name', '')}\n"
#         f"Address: {invoice_data.get('buyer', {}).get('address', '')}\n"
#         f"GSTIN: {invoice_data.get('buyer', {}).get('gstin', '')}"
#     )
#     chunks_to_embed.append(("buyer", buyer_text))

#     # Chunk 3: Items (Focused only on the line items)
#     items_list = [
#         f"- {i.get('name', '')} ({i.get('quantity', '')} {i.get('unit', '')} @ {i.get('rate', '')})"
#         for i in invoice_data.get("items", [])
#     ]
#     if items_list:
#         # Correctly construct the string *after* the list is joined
#         items_text = (
#             f"Line items for invoice {invoice_no}:\n"
#             + "\n".join(items_list)
#         )
#         chunks_to_embed.append(("items", items_text))

#     print(f"Generating embeddings for {len(chunks_to_embed)} chunks...")
    
#     # Prepare data for a single, efficient batch insertion
#     records_to_insert = []
#     for chunk_type, content in chunks_to_embed:
#         response = genai.embed_content(
#             model="models/text-embedding-004", # Use the recommended newer model
#             content=content,
#             task_type="retrieval_document"
#         )
#         embedding = response["embedding"]

#         # This dictionary structure maps directly to your SQL table schema
#         records_to_insert.append({
#             "invoice_id": invoice_id,
#             "chunk_type": chunk_type,
#             "content": content,
#             "embedding": embedding,
#             "field_tags": [chunk_type],
#             "metadata": {"invoice_no": invoice_no} # Supabase client handles dict->jsonb
#         })

#     # Store all chunks in a single database call for better performance
#     supabase.table("invoice_embeddings").insert(records_to_insert).execute()
    
#     print(f"✅ Successfully stored {len(records_to_insert)} chunks for invoice ID {invoice_id}.")


import google.generativeai as genai
import num2words
from app.core.supabase import supabase
import json

# --- ADD THIS NEW FUNCTION ---
def get_query_embedding(text: str) -> list[float]:
    """
    Generates an embedding for a given text query.
    """
    try:
        response = genai.embed_content(
            model="models/text-embedding-004",
            content=text,
            task_type="retrieval_query" # Use 'retrieval_query' for user questions
        )
        return response["embedding"]
    except Exception as e:
        print(f"❌ Error generating query embedding: {e}")
        return []
# --- END OF NEW FUNCTION ---


def transform_for_creation(input_data: dict) -> dict:
    """
    Transforms the initial data structure into the format required for invoice creation,
    including calculations for subtotal, GST, and total amount.
    """
    # ... (rest of your existing function is correct) ...
    # 1. Map existing data and add required placeholder fields
    company_in = input_data.get("company", {})
    invoice_in = input_data.get("invoice", {})
    buyer_in = input_data.get("buyer", {})
    items_in = input_data.get("items", [])
    bank_in = input_data.get("bank", {})

    output_data = {
        "intent": "create",
        "company": {
            "name": company_in.get("name"),
            "address": company_in.get("address"),
            "district": None,
            "mobile": company_in.get("contact"),
            "phone": None,
            "gstin": company_in.get("gst_no"),
            "state": "Maharashtra",
            "contact": None,
            "email": company_in.get("email")
        },
        "invoice": {
            "number": invoice_in.get("number"),
            "date": invoice_in.get("date"),
            "delivery_note": None, "payment_terms": None, "reference": None,
            "other_references": None, "buyer_order": None, "buyer_order_date": None,
            "dispatch_doc": None, "delivery_date": None, "dispatch_through": None,
            "destination": None, "terms_delivery": None
        },
        "buyer": {
            "name": buyer_in.get("name"),
            "address": buyer_in.get("address"),
            "gstin": buyer_in.get("gstin"),
            "state": "Maharashtra"
        },
        "bank": bank_in
    }

    # 2. Process items and perform calculations
    subtotal = 0
    total_gst = 0
    output_items = []

    for item in items_in:
        quantity = item.get("quantity", 0) or 0
        rate = item.get("rate", 0) or 0
        item_amount = quantity * rate
        
        gst_rate = 18  # Assumption: Using a default 18% GST. Modify as needed.
        hsn_code = item.get("hsn", "0000") # Use HSN from AI or fallback to placeholder
        gst_amount = round(item_amount * (gst_rate / 100), 2)
        
        output_items.append({
            "name": item.get("name"), "hsn": hsn_code, "gst_rate": gst_rate,
            "quantity": quantity, "unit": None, "rate": rate,
            "amount": item_amount, "gst_amount": gst_amount
        })
        
        subtotal += item_amount
        total_gst += gst_amount

    total = round(subtotal + total_gst, 2)

    # 3. Convert total to words
    rupees, paise = divmod(total, 1)
    paise = int(round(paise * 100))
    amount_words = ""
    if rupees > 0:
        amount_words += f"{num2words(int(rupees), lang='en_IN').title()} Rupees"
    if paise > 0:
        amount_words += f" And {num2words(paise, lang='en_IN').title()} Paise"
    amount_words = (amount_words.strip() or "Zero Rupees") + " Only."

    # 4. Add calculated fields to the final output
    output_data.update({
        "items": output_items,
        "amount_in_words": amount_words,
        "subtotal": subtotal,
        "total_gst": total_gst,
        "total": total
    })
    
    return output_data


# def embed_and_store_invoice(invoice_id: int, invoice_data: dict):
#     """
#     Embeds semantically distinct chunks of invoice data and stores them in Supabase.
#     """
#     # ... (this existing function is correct for its purpose) ...
#     chunks_to_embed = []
#     invoice_no = invoice_data.get('invoice', {}).get('number', '')

#     # Chunk 1: Header (Contains all top-level invoice details)
#     invoice_text = (
#         f"Invoice No: {invoice_no}\n"
#         f"Date: {invoice_data.get('invoice', {}).get('date', '')}\n"
#         f"Amount in words: {invoice_data.get('amount_in_words', '')}"
#     )
#     chunks_to_embed.append(("invoice", invoice_text))

#     # Chunk 2: Buyer details (Focused only on the buyer)
#     buyer_text = (
#         f"Information for the buyer on invoice {invoice_no}:\n"
#         f"Buyer name: {invoice_data.get('buyer', {}).get('name', '')}\n"
#         f"Address: {invoice_data.get('buyer', {}).get('address', '')}\n"
#         f"GSTIN: {invoice_data.get('buyer', {}).get('gstin', '')}"
#     )
#     chunks_to_embed.append(("buyer", buyer_text))

#     # Chunk 3: Items (Focused only on the line items)
#     items_list = [
#         f"- {i.get('name', '')} ({i.get('quantity', '')} {i.get('unit', '')} @ {i.get('rate', '')})"
#         for i in invoice_data.get("items", [])
#     ]
#     if items_list:
#         # Correctly construct the string *after* the list is joined
#         items_text = (
#             f"Line items for invoice {invoice_no}:\n"
#             + "\n".join(items_list)
#         )
#         chunks_to_embed.append(("items", items_text))

#     print(f"Generating embeddings for {len(chunks_to_embed)} chunks...")
    
#     # Prepare data for a single, efficient batch insertion
#     records_to_insert = []
#     for chunk_type, content in chunks_to_embed:
#         response = genai.embed_content(
#             model="models/text-embedding-004", # Use the recommended newer model
#             content=content,
#             task_type="retrieval_document" # Use 'retrieval_document' for storing
#         )
#         embedding = response["embedding"]

#         # This dictionary structure maps directly to your SQL table schema
#         records_to_insert.append({
#             "invoice_id": invoice_id,
#             "chunk_type": chunk_type,
#             "content": content,
#             "embedding": embedding,
#             "field_tags": [chunk_type],
#             "metadata": {"invoice_no": invoice_no} # Supabase client handles dict->jsonb
#         })

#     # Store all chunks in a single database call for better performance
#     supabase.table("invoice_embeddings").insert(records_to_insert).execute()
    
#     print(f"✅ Successfully stored {len(records_to_insert)} chunks for invoice ID {invoice_id}.")



def embed_and_store_invoice(invoice_id: int, invoice_data: dict):
    """
    Embeds semantically distinct chunks of invoice data, including a full summary,
    and stores them in Supabase for robust retrieval.
    """
    chunks_to_embed = []
    invoice_no = invoice_data.get('invoice', {}).get('number', '')

    # --- Chunk 1: Header (Unchanged) ---
    invoice_text = (
        f"Invoice No: {invoice_no}\n"
        f"Date: {invoice_data.get('invoice', {}).get('date', '')}\n"
        f"Amount in words: {invoice_data.get('amount_in_words', '')}"
    )
    chunks_to_embed.append(("header", invoice_text))

    # --- Chunk 2: Buyer details (Unchanged) ---
    buyer_text = (
        f"Information for the buyer on invoice {invoice_no}:\n"
        f"Buyer name: {invoice_data.get('buyer', {}).get('name', '')}\n"
        f"Address: {invoice_data.get('buyer', {}).get('address', '')}\n"
        f"GSTIN: {invoice_data.get('buyer', {}).get('gstin', '')}"
    )
    chunks_to_embed.append(("buyer", buyer_text))

    # --- Chunk 3: Items (Unchanged) ---
    items_list = [
        f"- {i.get('name', '')} ({i.get('quantity', '')} {i.get('unit', 'pcs')} @ {i.get('rate', '')})"
        for i in invoice_data.get("items", [])
    ]
    if items_list:
        items_text = (
            f"Line items for invoice {invoice_no}:\n"
            + "\n".join(items_list)
        )
        chunks_to_embed.append(("items", items_text))

    # --- NEW: Chunk 4: Full Summary ---
    # This chunk contains all critical information in one place.
    # It acts as a fallback to ensure the agent always gets complete context.
    full_summary_text = (
        f"Full summary for Invoice No: {invoice_no}.\n"
        f"Date: {invoice_data.get('invoice', {}).get('date', '')}.\n"
        f"Buyer: {invoice_data.get('buyer', {}).get('name', '')}, located at {invoice_data.get('buyer', {}).get('address', '')}.\n"
        f"Items on this invoice are:\n"
        + "\n".join(items_list)
    )
    chunks_to_embed.append(("full_summary", full_summary_text))


    print(f"Generating embeddings for {len(chunks_to_embed)} chunks...")
    
    records_to_insert = []
    for chunk_type, content in chunks_to_embed:
        response = genai.embed_content(
            model="models/text-embedding-004",
            content=content,
            task_type="retrieval_document"
        )
        embedding = response["embedding"]

        records_to_insert.append({
            "invoice_id": invoice_id,
            "chunk_type": chunk_type,
            "content": content,
            "embedding": embedding,
            "field_tags": [chunk_type],
            "metadata": {"invoice_no": invoice_no}
        })

    # Store all chunks in a single database call
    supabase.table("invoice_embeddings").insert(records_to_insert).execute()
    
    print(f"✅ Successfully stored {len(records_to_insert)} chunks for invoice ID {invoice_id}.")

