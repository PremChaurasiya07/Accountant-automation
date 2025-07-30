# #code for voice bot

# from app.services.invoice_generator import generate_invoice_pdf1
# from fastapi import FastAPI, HTTPException, Request, Form, File, UploadFile,APIRouter
# from pydantic import BaseModel

# import json
# import os,re
# from app.core.supabase import supabase
# from utils.upload_to_storage import upload_file

# from app.services.invoice_parser import parse_invoice
# from app.services.embedding import embed_and_store_invoice
# from datetime import datetime
# from app.services.gemini import parsed_info


# from app.services.invoice_generator import generate_invoice_pdf3
# from datetime import datetime

# from datetime import date

# from utils.semantic import semantic_search_and_answer
# from langchain.prompts import PromptTemplate

# import pdfplumber
# import tempfile
# import google.generativeai as genai
# import asyncio
# from pydantic import BaseModel
# from langchain_google_genai import ChatGoogleGenerativeAI
# from langchain.prompts import ChatPromptTemplate
# from langchain.schema import messages_from_dict, messages_to_dict, AIMessage, HumanMessage
# from langchain.chains import LLMChain
# from utils.memory_supabase import get_memory, save_memory

# router = APIRouter()
# # supabase memory helper function
# def load_conversation_memory(user_id: str):
#     # Fetch the most recent memory row (assuming you have a timestamp column like "updated_at")
#     res = (
#         supabase.table("conversation_memory")
#         .select("*")
#         .eq("user_id", user_id)
#         .order("updated_at", desc=True)
#         .limit(1)
#         .maybe_single()
#         .execute()
#     )

#     # print("DEBUG - Supabase returned:", res)

#     if res is None or res.data is None:
#         return None

#     mem = res.data.get("memory")

#     if isinstance(mem, dict):
#         # Keep only the last 5 chat messages
#         chat_history = mem.get("chat_history", [])
#         mem["chat_history"] = chat_history[-3:] if isinstance(chat_history, list) else []
#         return mem

#     return None



# def save_conversation_memory(user_id: str, memory: dict):
#     existing = supabase.table("conversation_memory").select("id").eq("user_id", user_id).execute()
#     if existing.data:
#         supabase.table("conversation_memory").update({
#             "memory": memory,
#             "updated_at": "now()"
#         }).eq("user_id", user_id).execute()
#     else:
#         supabase.table("conversation_memory").insert({
#             "user_id": user_id,
#             "memory": memory
#         }).execute()

# def clear_conversation_memory(user_id: str):
#     supabase.table("conversation_memory").delete().eq("user_id", user_id).execute()

# def load_invoice_from_database(invoice_number, user_id):
#     # Fetch invoice record
#     invoice_resp = (
#     supabase.table("invoices_record")
#         .select("*")
#         .eq("invoice_no", invoice_number)
#         .eq("user_id", user_id)
#         .maybe_single()
#         .execute()
#     )

#     if invoice_resp is None or invoice_resp.data is None:
#         return {"message": f"No invoice found with number {invoice_number}."}

#     invoice_data = invoice_resp.data
#     print("invoice data",invoice_data)


   

#     # --- Fetch buyer ---
#     buyer_data = {}
#     buyer_id = invoice_data.get("buyer_id")
#     if buyer_id:
#         buyer_resp = (
#             supabase.table("buyers_record")
#             .select("*")
#             .eq("id", buyer_id)
#             .single()
#             .execute()
#         )
#         if buyer_resp.data:
#             buyer_data = buyer_resp.data

#     # --- Fetch seller ---
#     seller_data = {}
#     seller_id = invoice_data.get("seller_id")
#     if seller_id:
#         seller_resp = (
#             supabase.table("sellers_record")
#             .select("*")
#             .eq("id", seller_id)
#             .single()
#             .execute()
#         )
#         if seller_resp.data:
#             seller_data = seller_resp.data

#     # --- Fetch items ---
#     items_resp = (
#         supabase.table("items_record")
#         .select("*")
#         .eq("product_id", invoice_data["id"])
#         .execute()
#     )
#     items_list = []
#     if items_resp.data:
#         for i in items_resp.data:
#             items_list.append({
#                 "name": i["item_name"],
#                 "hsn": i.get("hsn_code"),
#                 "gst_rate": i.get("gst_rate"),
#                 "quantity": i.get("qty"),
#                 "unit": i.get("per_unit"),
#                 "rate": i.get("item_rate"),
#                 "amount": i.get("item_rate") * i.get("qty") if i.get("item_rate") and i.get("qty") else None
#             })

#     # --- Assemble structured JSON ---
#     return {
#         "intent": "edit",
#         "company": {
#             "name": seller_data.get("name") if seller_data else "",
#             "address": seller_data.get("address") if seller_data else "",
#             "gstin": seller_data.get("gst_no") if seller_data else "",
#             "pan_no": seller_data.get("pan_no") if seller_data else "",
#             "email": seller_data.get("email") if seller_data else "",
#             "contact": seller_data.get("contact") if seller_data else "",
#             "bank_name": seller_data.get("bank_name") if seller_data else "",
#             "ifsc_code": seller_data.get("ifsc_code") if seller_data else "",
#             "account_no": seller_data.get("account_no") if seller_data else "",
#             "logo": seller_data.get("logo") if seller_data else "",
#             "sign": seller_data.get("sign") if seller_data else "",
#             "stamp": seller_data.get("stamp") if seller_data else ""
#         },
#         "invoice": {
#             "number": invoice_data.get("invoice_no"),
#             "date": str(invoice_data.get("invoice_date") or ""),
#             "delivery_note": "",
#             "payment_terms": "",
#             "reference": "",
#             "other_references": "",
#             "buyer_order": "",
#             "buyer_order_date": "",
#             "dispatch_doc": "",
#             "delivery_date": "",
#             "dispatch_through": "",
#             "destination": "",
#             "terms_delivery": ""
#         },
#         "buyer": {
#             "name": buyer_data.get("name") if buyer_data else "",
#             "address": buyer_data.get("address") if buyer_data else "",
#             "gstin": buyer_data.get("gst_no") if buyer_data else "",
#             "state": ""
#         },
#         "items": items_list,
#         "amount_in_words": "",
#         "bank": {
#             "name": seller_data.get("bank_name") if seller_data else "",
#             "account": seller_data.get("account_no") if seller_data else "",
#             "branch_ifsc": seller_data.get("ifsc_code") if seller_data else ""
#         }
#     }


# # ----------------------
# # Model setup
# # ----------------------
# llm = ChatGoogleGenerativeAI(
#     model="gemini-1.5-flash",
#     google_api_key=os.getenv("GEMINI_API_KEY"),
#     temperature=0.3,
#     max_output_tokens=2048,
# )

# # ----------------------
# # Request Schema
# # ----------------------
# class InputData(BaseModel):
#     user_id: str
#     input_value: str
#     invoice_no: str

# # ----------------------
# # Prompt Templates
# # ----------------------

# main_prompt = PromptTemplate(
#      template="""
# You are a strict invoice data extractor and intent detector.

# If the input is in Hindi or any local language, translate to English first.

# **Rules:**
# 1. Always detect the correct intent.
# 2. If the user is asking about reports, totals, summaries, or general questions about invoices or sales, return:
#    {{
#      "intent": "query"
#    }}
# 3. If the user wants to edit an *existing invoice* by specifying its invoice number, return:
#    {{
#      "intent": "edit_existing",
#      "invoice_number": "<number> that the user has given in prompt not the current one "
#    }}
# 4. If the intent is to create or edit the current invoice in progress, return the **full JSON** as shown below.
# 5. For all other intents, return:
#    {{
#      "intent": ("create"/"edit"/"edit_existing"/"delete"/"query"/"confirm"/"answer_sales_question"/"reset")
#    }}

# **Important:**
# - DO NOT return markdown or code blocks.
# - DO NOT wrap the JSON in triple backticks.
# - DO NOT prefix with 'json'.
# - The output must start with '{{' and end with '}}'.
# - If you return the full JSON (for create or edit), ALWAYS fill the "invoice.date" field with today's date: {today_date}.
# - If the user does not specify a date, still fill the date with {today_date}.
# - DO NOT leave "date" as null or empty.
# - **CRITICAL**: Always use the provided invoice number "{invoice_no}" in the "invoice.number" field. DO NOT leave it as null.

# Additional instructions:
# - For each item, calculate amount = quantity × rate (round to 2 decimals).
# - For each item, calculate gst_amount if not null or 0 else skip= (amount × gst_rate / 100) (round to 2 decimals).
# - Then calculate subtotal = sum of all item amounts.
# - Then calculate total_gst = sum of all gst_amount.
# - Then calculate total = subtotal + total_gst (rounded to nearest integer).
# - Then convert total into `amount_in_words` field (e.g., "INR Twenty Seven Thousand Six Hundred Ninety One Only").

# **Full JSON Example:**
# {{
# "intent": "create",
# "company": {{
#     "name": "Chaurasiya pharma",
#     "address": "Shop No.2,Shiv Ashish Building,Star Complex Road,Opp Sai Mandir,Golani Phata,Vasai (East)",
#     "district": "Palghar-401208",
#     "mobile": "9664395486",
#     "phone": "",
#     "gstin": "27BEJPP4176E1Z9",
#     "state": "Maharashtra, Code : 27",
#     "contact": "+9011191086",
#     "email": "jkentpd15@gmail.com"
# }},
# "invoice": {{
#     "number": "{invoice_no}",  // Use the provided invoice number here
#     "date": "{today_date}",
#     "delivery_note": " ",
#     "payment_terms": "",
#     "reference": "",
#     "other_references": "",
#     "buyer_order": "",
#     "buyer_order_date": "",
#     "dispatch_doc": "",
#     "delivery_date": "",
#     "dispatch_through": "",
#     "destination": "",
#     "terms_delivery": ""
# }},
# "buyer": {{
#     "name": "Prem Chaurasiya Pharma Equipments",
#     "address": "Opp Phase-2 Parmar Building Near Vasai Phata,\nVasai Dist.-Palghar",
#     "gstin": "27AHQPC7120E1ZK",
#     "state": "Maharashtra, Code : 27"
# }},
# "items": [
#     {{
#     "name": "Delrin Rod 20mm White Rod",
#     "hsn": "39169090",
#     "gst_rate": 18,
#     "quantity": 13.86,
#     "unit": "kg",
#     "rate": 380.00,
#     "amount": 5266.80
#     }},
#     {{
#     "name": "Caster Wheel Ss202",
#     "description": "3\"I Red Pu Wheel Lock",
#     "hsn": "830220",
#     "gst_rate": 18,
#     "quantity": 26,
#     "unit": "pcs",
#     "rate": 400.00,
#     "amount": 10400.00
#     }}],
# "amount_in_words": "INR Twenty Seven Thousand Six Hundred Ninety One Only",
# "bank": {{
#     "name": "Bank of Maharashtra",
#     "account": "60513819000",intent
#     "branch_ifsc": "Waliv Vasai(East) & MAHB0001718"
# }}
# }}

# Previous JSON:
# {prior_json}

# User input:
# {user_input}
# """,
#     input_variables=["prior_json", "user_input", "today_date", "invoice_no"]
# )

# fallback_prompt = PromptTemplate(
#     template="""
# You are a helpful invoice assistant.

# The user's intent is: {intent}

# If intent is 'query':
# - Answer their question about sales, invoices, buyer data, or any other relevant detail.
# - If needed, politely ask them to specify more context (like invoice number or date range).

# If intent is 'delete':
# - Confirm deletion.

# If intent is 'reset':
# - Confirm reset.

# If you don't understand:
# - Ask for clarification.

# Never return JSON. Only reply with plain text.

# User input:
# {user_input}
# """,
#     input_variables=["intent", "user_input"]
# )


# # ----------------------
# # Chains
# # ----------------------
# chain = LLMChain(
#     llm=llm,
#     prompt=main_prompt
# )

# fallback_chain = LLMChain(
#     llm=llm,
#     prompt=fallback_prompt
# )

# # ----------------------
# # Main Endpoint
# # ----------------------
# @router.post("/voice_bot")
# async def voice_bot(data: InputData, request: Request):
#     user_id = data.user_id
#     user_input = data.input_value
#     invoice_no = data.invoice_no
#     print(user_input,invoice_no)

#     memory = load_conversation_memory(user_id)
#     if memory is None:
#         memory = {
#             "last_intent": None,
#             "partial_invoice": {
#                 "intent": "",
#                 "company": {},
#                 "invoice": {},
#                 "buyer": {},
#                 "items": [],
#                 "amount_in_words": "",
#                 "bank": {}
#             },
#             "chat_history": []
#         }

#     partial_invoice = memory.get("partial_invoice", {})
#     last_intent = memory.get("last_intent")
#     print("last intent",last_intent)
#     chat_history = memory.get("chat_history", [])
#     limited_history = chat_history[-5:]

#     chain_input = {
#         "prior_json": json.dumps(partial_invoice, ensure_ascii=False),
#         "user_input": user_input,
#         "today_date": date.today().isoformat(),
#         "invoice_no": invoice_no
#     }
#     print("Chain input invoice_no:", chain_input["invoice_no"])
    
#     result = chain.invoke(chain_input)

#     text_response = result["text"]
#     print("text response", text_response)

#     def clean_json(text: str) -> str:
#         import re
#         cleaned = re.sub(r"^```(json)?", "", text.strip(), flags=re.IGNORECASE)
#         cleaned = re.sub(r"```$", "", cleaned.strip())
#         return cleaned.strip()

#     try:
#         cleaned = clean_json(text_response)
#         updated_data = json.loads(cleaned)
#     except json.JSONDecodeError as e:
#         return {
#             "error": "Model did not return valid JSON.",
#             "raw_output": text_response,
#             "exception": str(e)
#         }

#     intent = updated_data.get("intent")
#     print("intent", intent)
#     memory["last_intent"] = intent



# #for edit
#     async def update_invoice_from_partial(parsed_invoice: dict, user_id: str):
#             try:
#                 print("Parsed invoice:", parsed_invoice)
#                 invoice_no = parsed_invoice.get("invoice_number")
#                 if not invoice_no:
#                     raise HTTPException(status_code=400, detail="Invoice number is required")

#                 # Fetch invoice with joined data
#               # Step 1: Fetch invoice + buyer + seller (excluding items)
#                 invoice_resp = (
#                     supabase.table("invoices_record")
#                     .select(
#                         """
#                         *,
#                         buyers_record(*),
#                         sellers_record(*)
#                         """
#                     )
#                     .eq("invoice_no", invoice_no)
#                     .eq("user_id", user_id)
#                     .single()
#                     .execute()
#                 )

#                 invoice_data = invoice_resp.data

#                 # Step 2: Get items separately where product_id = invoice.id
#                 items_resp = (
#                     supabase.table("items_record")
#                     .select("*")
#                     .eq("product_id", invoice_data["id"])
#                     .execute()
#                 )

#                 # Step 3: Attach items to invoice_data manually
#                 invoice_data["items_record"] = items_resp.data


#                 print("Invoice response:", invoice_resp)

#                 if not invoice_resp.data:
#                     raise HTTPException(status_code=404, detail="Invoice not found")

#                 invoice = invoice_resp.data
#                 buyer = invoice.get("buyers_record", {})
#                 seller = invoice.get("sellers_record", {})
#                 items = invoice.get("items_record", [])

#                 # Prepare invoice data to send
#                 dataToSend = {
#                     "intent":"edit",
#                     "challan_date": invoice.get("challan_date"),
#                     "challan_no": invoice.get("challan_no"),
#                     "invoice_date": invoice.get("invoice_date"),
#                     "invoice_no": invoice.get("invoice_no"),
#                     "purchase_date": invoice.get("purchase_date"),
#                     "purchase_no": invoice.get("purchase_no"),
#                     "vehicle_no": invoice.get("vehicle_no"),
#                     "buyer_id": invoice.get("buyer_id"),
#                     "seller_id": invoice.get("seller_id"),

#                     "products_json": [
#                         {
#                             "description": item.get("item_name"),
#                             "hsn": item.get("hsn_code"),
#                             "quantity": item.get("qty", 0),
#                             "rate": item.get("item_rate", 0),
#                             "per": item.get("per_unit", ""),
#                             "amount": item.get("qty", 0) * item.get("item_rate", 0)
#                         }
#                         for item in items
#                     ],

#                     "sub_total": sum(item.get("qty", 0) * item.get("item_rate", 0) for item in items),
#                     "cgst_amount": invoice.get("cgst_amount", 0),
#                     "sgst_amount": invoice.get("sgst_amount", 0),
#                     "total_gst_amount": invoice.get("total_gst_amount", 0),
#                     "total_amount": invoice.get("total_amount", 0),
#                     "gst_percentage": invoice.get("gst_percentage", 0),

#                     # Client (buyer) details
#                     "client_name": buyer.get("name"),
#                     "client_address": buyer.get("address"),
#                     "client_gstin": buyer.get("gst_no"),
#                     "client_phone": buyer.get("phone_no"),

#                     # Seller details
#                     "seller_name": seller.get("name"),
#                     "seller_address": seller.get("address"),
#                     "seller_email": seller.get("email"),
#                     "seller_gst_no": seller.get("gst_no"),
#                     "seller_pan_no": seller.get("pan_no"),
#                     "seller_logourl": seller.get("logo"),
#                     "seller_sign": seller.get("sign"),
#                     "seller_stamp": seller.get("stamp"),
#                     "seller_contact": seller.get("contact"),
#                 }

#                 print("dataToSend:", dataToSend)

#                 # Attempt parsing
#                 try:
#                     redefined_data = parsed_info(dataToSend)
#                     parsed = json.loads(redefined_data)
#                 except Exception as parse_error:
#                     raise HTTPException(status_code=400, detail=f"Parsing failed: {str(parse_error)}")

#             except Exception as e:
#                 raise HTTPException(status_code=500, detail=f"Unexpected error: {str(e)}")

#             print('c')


#             invoice_id = invoice_resp.data["id"]
#             old_url = invoice_resp.data.get("invoice_url")
#             template_no = invoice_resp.data.get("template_no")
#             if not template_no:
#                 raise HTTPException(status_code=400, detail="Template number missing")

#             # Remove old PDF
#             if old_url:
#                 filename = old_url.split("/")[-1].split("?")[0]
#                 supabase.storage.from_("invoices").remove([f"{user_id}/{filename}"])
            
#             print("parseddata:",parsed)

#             # Generate new PDF
#             try:
#                 if template_no=='temp1':
#                     pdf_path = generate_invoice_pdf3(parsed)
#                 # elif template_no=='temp2':
#                 #     pdf_path = generate_invoice_pdf2(parsed)
#                 # elif template_no=='temp3':
#                 #     pdf_path = generate_invoice_pdf3(parsed)
#             except Exception as pdf_error:
#                 raise HTTPException(status_code=500, detail=f"PDF generation failed: {str(pdf_error)}")

#             # Upload new PDF
#             storage_result = await upload_file(
#                 pdf_path,
#                 folder="invoices",
#                 user_id=user_id,
#                 invoice_no=invoice_no
#             )
#             new_url = storage_result["url"]

#             # Helper: normalize date
#             def normalize_date(value):
#                 if not value:
#                     return None
#                 value = value.strip()
#                 if not value:
#                     return None
#                 try:
#                     return datetime.strptime(value, "%Y-%m-%d").date().isoformat()
#                 except Exception:
#                     return None

#             # Update invoice record
#             update_data = {
#                 "invoice_date": normalize_date(dataToSend.get("invoice_date")),
#                 "invoice_url": new_url,
#                 "vehicle_no": dataToSend.get("vehicle_no"),
#                 "challan_no": dataToSend.get("challan_no"),
#                 "challan_date": normalize_date(dataToSend.get("challan_date")),
#                 "purchase_no": dataToSend.get("purchase_no"),
#                 "purchase_date": normalize_date(dataToSend.get("purchase_date")),
#             }
#             supabase.table("invoices_record").update(update_data).eq("id", invoice_id).execute()

#             # Remove old items
#             supabase.table("items_record").delete().eq("product_id", invoice_id).execute()

#             # Insert new items
#             new_items = []
#             for item in dataToSend.get("products_json", []):
#                 new_items.append({
#                     "product_id": invoice_id,  # <-- this should not be null
#                     "item_name": item["description"],
#                     "hsn_code": item.get("hsn"),
#                     "gst_rate": item.get("gst_rate"),
#                     "item_rate": item.get("rate"),
#                     "per_unit": item.get("unit"),
#                     "qty": item.get("quantity"),
#                 })
#             if new_items:
#                 supabase.table("items_record").insert(new_items).execute()

#             # Update buyer if buyer_id exists
#             buyer_id = dataToSend.get("buyer_id")
#             if buyer_id:
#                 buyer_update_data = {
#                     "name": dataToSend.get("client_name"),
#                     "address": dataToSend.get("client_address"),
#                     "gst_no": dataToSend.get("client_gstin"),
#                     "email": "",
#                     "phone_no": dataToSend.get("client_phone"),
#                 }
#                 buyer_update_data = {k: v for k, v in buyer_update_data.items() if v is not None}
#                 supabase.table("buyers_record").update(buyer_update_data).eq("id", buyer_id).execute()

#             # Cleanup temp file
#             if os.path.exists(pdf_path):
#                 os.remove(pdf_path)

#             return {
#                 "message": "✅ Invoice updated successfully",
#                 "invoice_id": invoice_id,
#                 "url": new_url
#             }

# #for create 
#     async def create_invoice_from_data(parsed: dict, user_id: str, template_no: str):
#         """
#         Creates invoice, buyer, items, PDF, and returns invoice_id and URL.
#         """
#         invoice_no = parsed["invoice"]["number"]
#         if not invoice_no:
#             raise HTTPException(status_code=400, detail="Invoice number is required")

#         # 🛑 Check if invoice exists
#         existing_invoice = (
#             supabase.table("invoices_record")
#             .select("id")
#             .eq("invoice_no", invoice_no)
#             .eq("user_id", user_id)
#             .execute()
#         )
#         if existing_invoice.data and len(existing_invoice.data) > 0:
#             return {
#                 "message": f"Invoice {invoice_no} already exists.",
#                 "invoice_id": existing_invoice.data[0]["id"]
#             }

#         # Generate PDF
#         if not template_no:
#             raise HTTPException(status_code=400, detail="Template ID is required")
#         if template_no == "temp1":
#             pdf_path = generate_invoice_pdf3(parsed)
#         else:
#             raise HTTPException(status_code=400, detail=f"Unknown template {template_no}")

#         # Normalize date helper
#         def normalize_date(value):
#             try:
#                 if value and value.strip():
#                     return datetime.strptime(value.strip(), "%Y-%m-%d").date().isoformat()
#             except Exception:
#                 return None
#             return None

#         # Upload PDF
#         storage_result = await upload_file(
#             pdf_path,
#             folder="invoices",
#             user_id=user_id,
#             invoice_no=invoice_no
#         )
#         storage_url = storage_result["url"]

#         # Insert Buyer
#         buyer_data = {
#             "name": parsed["buyer"]["name"],
#             "gst_no": parsed["buyer"].get("gstin", ""),
#             "email": "",
#             "address": parsed["buyer"]["address"],
#             "phone_no": ""
#         }
#         buyer_resp = supabase.table("buyers_record").insert(buyer_data).execute()
#         buyer_id = buyer_resp.data[0]["id"]

#         # Get Seller
#         seller_resp = (
#             supabase.table("sellers_record")
#             .select("id")
#             .eq("user_id", user_id)
#             .single()
#             .execute()
#         )
#         seller_id = seller_resp.data["id"]

#         # Insert Invoice
#         invoice_data = {
#             "challan_date": normalize_date(parsed.get("challan_date")),
#             "challan_no": parsed.get("challan_no"),
#             "invoice_date": normalize_date(parsed["invoice"]["date"]),
#             "invoice_no": invoice_no,
#             "purchase_date": normalize_date(parsed.get("purchase_date")),
#             "purchase_no": parsed.get("purchase_no"),
#             "vehicle_no": parsed.get("vehicle_no"),
#             "invoice_url": storage_url,
#             "buyer_id": buyer_id,
#             "seller_id": seller_id,
#             "template_no": template_no,
#             "user_id": user_id
#         }
#         invoice_resp = supabase.table("invoices_record").insert(invoice_data).execute()
#         invoice_id = invoice_resp.data[0]["id"]

#         # Insert Items
#         records = []
#         for item in parsed.get("items", []):
#             records.append({
#                 "product_id": invoice_id,
#                 "item_name": item["name"],
#                 "hsn_code": item.get("hsn"),
#                 "gst_rate": item.get("gst_rate"),
#                 "item_rate": item.get("rate"),  # Assuming 'rate' is unit price
#                 "per_unit": item.get("unit"),
#                 "qty": item.get("quantity"),
#             })
#         supabase.table("items_record").insert(records).execute()

#         # Remove temp PDF
#         if os.path.exists(pdf_path):
#             os.remove(pdf_path)

#         return {
#             "message": "Invoice created successfully",
#             "invoice_id": invoice_id,
#             "url": storage_url
#         }

#     # EDIT EXISTING: Load an invoice to edit
#     # if intent == "edit_existing":
#     #     invoice_number = updated_data.get("invoice_number")
#     #     if not invoice_number:
#     #         return {"message": "Please specify the invoice number you want to edit."}

#     #     existing_invoice = load_invoice_from_database(invoice_number, user_id)
#     #     if not existing_invoice:
#     #         return {"message": f"No invoice found with number {invoice_number}."}

#     #     memory["partial_invoice"] = existing_invoice
#     #     memory["chat_history"] = limited_history + [
#     #         {"role": "human", "content": user_input},
#     #         {"role": "ai", "content": f"Loaded invoice {invoice_number}. What would you like to change?"}
#     #     ]
#     #     save_conversation_memory(user_id, memory)

#     #     return {"message": f"Loaded invoice {invoice_number}. What would you like to change?"}

#     # EDIT: Update an invoice
#     if intent == "edit_existing":
#         print('edit')
#         print("updated data", updated_data)
#         result = await update_invoice_from_partial(
#             parsed_invoice=updated_data,
#             user_id=user_id
#         )
#         clear_conversation_memory(user_id)
#         return result

#     # CREATE: Gather invoice data
#     if intent == "create":
#         print('create')
#         invoice = updated_data.get("invoice", {})
#         buyer = updated_data.get("buyer", {})
#         items = updated_data.get("items", [])
#         missing = []
#         if not invoice.get("number"):
#             missing.append("invoice number")
#         if not invoice.get("date"):
#             missing.append("invoice date")
#         if not buyer.get("name"):
#             missing.append("buyer name")
#         if not buyer.get("address"):
#             missing.append("buyer address")
#         if not items:
#             missing.append("items")

#         if missing:
#             return {"message": f"Please provide: {', '.join(missing)}"}

#         def format_gst(gst_value):
#             if gst_value is None:
#                 return "0"
#             return str(gst_value)

#         # Build plain text summary of items
#         items_summary = "\n".join(
#             [
#                 "- {}, qty: {}, rate: {}, gst: {}%".format(
#                     i.get("name", ""),
#                     i.get("quantity", ""),
#                     i.get("rate", ""),
#                     format_gst(i.get("gst_rate"))
#                 )
#                 for i in items
#             ]
#         )

#         # Build the confirmation message without **
#         message_text = (
#             "✅ All details received:\n\n"
#             "Invoice Number: {}\n"
#             "Date: {}\n"
#             "Buyer: {}\n"
#             "Address: {}\n\n"
#             "Items:\n{}\n\n"
#             "Say 'confirm' to save this invoice.".format(
#                 invoice.get("number", ""),
#                 invoice.get("date", ""),
#                 buyer.get("name", ""),
#                 buyer.get("address", ""),
#                 items_summary
#             )
#         )

#         # Store partial invoice and chat history in memory
#         memory["partial_invoice"] = updated_data
#         memory["chat_history"] = limited_history + [
#             {"role": "human", "content": user_input},
#             {"role": "ai", "content": message_text}
#         ]

#         save_conversation_memory(user_id, memory)

#         return {
#             "message": message_text,
#             "pending_action": "awaiting_confirmation"
#         }

#     # CONFIRM: Finalize invoice creation
#     if intent == "confirm":
#         print('confirm')
#         if last_intent == "create":
#             parsed = memory["partial_invoice"]
#             print("parsed",parsed)
#             template_no = parsed.get("template_id") or "temp1"
#             result = await create_invoice_from_data(parsed, user_id, template_no)

#             # Embed after saving
#             embed_and_store_invoice(result["invoice_id"], parsed)

#             clear_conversation_memory(user_id)
#             return {"message": result["url"]}
#         else:
#             return {"message": "There is no invoice in progress to confirm."}
        
#     answer_prompt = PromptTemplate(
#         input_variables=["user_question", "retrieved_context"],
#         template="""
#         You are a helpful invoice assistant.
#         Use the context below to answer the question.
#         If the context doesn't contain the answer, say you don't have enough information.

#         Context:
#         {retrieved_context}

#         Question:
#         {user_question}

#         Answer:
#         """
#     )

#     answer_chain = LLMChain(
#         llm=llm,
#         prompt=answer_prompt
#     )

#     def embed_text(text: str) -> list[float]:
#         """
#         Generate embedding vector for the input text using Gemini embeddings.
#         """
#         response = genai.embed_content(
#             model="models/embedding-001",
#             content=text,
#             task_type="retrieval_document"
#         )
#         return response["embedding"]
    
#    # QUERY: Semantic search first, fallback if no results
#     if intent == "query":
#         reply = await semantic_search_and_answer(
#             user_input=user_input,
#             user_id=user_id,
#             embed_function=embed_text,    # your embedding function
#             supabase_client=supabase,     # your Supabase client
#             fallback_chain=fallback_chain,
#             llm_chain=answer_chain,
#             top_k=5
#         )
#         print("reply:", reply)

#         memory["chat_history"] = limited_history + [
#             {"role": "human", "content": user_input},
#             {"role": "ai", "content": reply}
#         ]
#         save_conversation_memory(user_id, memory)

#         return {"message": reply}

# currently working

# app/routes/voice_bot.py

# import json
# import os
# from fastapi import APIRouter, HTTPException
# from pydantic import BaseModel
# from datetime import date
# from typing import Union, List
# from dotenv import load_dotenv
# from num2words import num2words # 👈 Added import
# import math # 👈 Added import

# # --- LangChain & Google AI Imports ---
# from app.services.embedding import embed_and_store_invoice
# from langchain_google_genai import ChatGoogleGenerativeAI
# from langchain.prompts import PromptTemplate
# from langchain.chains import LLMChain
# import google.generativeai as genai
# from google.api_core.exceptions import ResourceExhausted # For specific error handling

# # --- App-specific Imports ---
# from app.core.supabase import supabase
# from app.services.memory_manager import load_conversation_memory, save_conversation_memory, clear_conversation_memory
# from app.services.invoice_actions import load_invoice_for_edit, create_invoice, update_invoice, get_next_invoice_number
# from utils.semantic import semantic_search_and_answer

# # --- Load Environment Variables from .env file ---
# load_dotenv()

# # --- Router Initialization ---
# router = APIRouter()

# #======================================================================
# # 	API KEY MANAGER
# #======================================================================
# class ApiKeyManager:
#     """Manages and rotates a list of API keys to handle rate limits."""
#     def __init__(self):
#         self.keys: List[str] = self._load_keys_from_env()
#         self.current_key_index: int = 0
#         if not self.keys:
#             raise ValueError("No GEMINI_API_KEYs found. Set at least GEMINI_API_KEY_1 in your .env file.")

#     def _load_keys_from_env(self) -> List[str]:
#         """Loads keys from environment variables (e.g., GEMINI_API_KEY_1)."""
#         found_keys = []
#         i = 1
#         while True:
#             key = os.getenv(f"GEMINI_API_KEY_{i}")
#             if key:
#                 found_keys.append(key)
#                 i += 1
#             else:
#                 break
#         print(f"✅ Loaded {len(found_keys)} Gemini API key(s).")
#         return found_keys

#     def get_key(self) -> Union[str, None]:
#         """Gets the current key. Returns None if all are exhausted."""
#         if self.current_key_index < len(self.keys):
#             return self.keys[self.current_key_index]
#         return None

#     def switch_to_next_key(self):
#         """Moves to the next key."""
#         self.current_key_index += 1

# # Initialize a single instance of the manager for the application
# key_manager = ApiKeyManager()


# #======================================================================
# # 	PROMPT TEMPLATES & HELPERS
# #======================================================================
# main_prompt_template = PromptTemplate(
#  	input_variables=["prior_json", "user_input", "today_date", "invoice_no"],
#  	template="""
# You are a master invoice assistant AI. Your task is to manage invoice data based on user input and conversation history.
# **Rules:**
# 1. First, detect the user's primary intent. Intents can be: `create`, `edit`, `edit_existing`, `confirm_creation`, `confirm_edit`, `query`, `reset`.
# 2. If the user says "edit invoice <number>", your intent is `edit_existing`. ONLY return:
#  	`{{"intent": "edit_existing", "invoice_number": "<number>"}}`
# 3. If `prior_json` contains a full invoice and the user asks to modify it (e.g., "change the buyer name to X"), your intent is `edit`. Apply the changes to the `prior_json` and return the **full, updated JSON**.
# 4. If the user wants to create a new invoice, your intent is `create`. Fill the JSON with all details from the user's input.
# 5. If the user says "confirm", "save it", or similar, check the last intent. If they were creating, the intent is `confirm_creation`. If they were editing, it's `confirm_edit`.
# 6. For general questions ("total sales", "who is buyer X"), the intent is `query`. Return: `{{"intent": "query"}}`
# 7. If the user says "reset" or "start over", the intent is `reset`. Return: `{{"intent": "reset"}}`
# 8. **CRITICAL**: Always use today's date `{today_date}` for any new invoice or when a date is not specified. The invoice number for a new invoice MUST be `{invoice_no}`. Do not change the invoice number during an edit.
# 9. Your output MUST be a valid JSON object, starting with `{{` and ending with `}}`. Do not use markdown backticks.
# **Previous JSON State:**
# {prior_json}
# **User Input:**
# {user_input}
# """
# )

# answer_prompt_template = PromptTemplate(
#  	input_variables=["user_question", "retrieved_context"],
#  	template="""
# You are a helpful invoice assistant. Use the context below to answer the user's question.
# If the context doesn't contain the answer, say that you don't have enough information based on the documents provided.
# Context:
# {retrieved_context}
# Question:
# {user_question}
# Answer:
# """
# )

# fallback_prompt_template = PromptTemplate(
#  	input_variables=["user_input"],
#  	template="""
# You are a helpful invoice assistant. You were asked the following question but could not find any specific invoices related to it.
# Answer as helpfully as you can, or ask for more clarification (like an invoice number or date range). Do not make up information.
# User Question: {user_input}
# Answer:
# """
# )

# # ✅ START: Added Transformation Function
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

# def embed_text(text: str) -> list[float]:
#     """Generates an embedding vector for the given text."""
#     genai.configure(api_key=key_manager.keys[0]) # Use the first key for embeddings
#     try:
#         response = genai.embed_content(
#             model="models/embedding-001", content=text, task_type="retrieval_document"
#         )
#         return response["embedding"]
#     except Exception as e:
#         print(f"Error generating embedding: {e}")
#         return [0.0] * 768


# # --- Pydantic Request Model ---
# class InputData(BaseModel):
#     user_id: str
#     input_value: str


# #======================================================================
# # 	MAIN API ENDPOINT
# #======================================================================
# @router.post("/voice_bot")
# async def voice_bot(data: InputData):
#     user_id = data.user_id
#     user_input = data.input_value

#     # Automatically determine the next invoice number for this user.
#     next_invoice_no = await get_next_invoice_number(user_id)


#     memory = load_conversation_memory(user_id)
#     partial_invoice = memory.get("partial_invoice", {})
#     last_intent = memory.get("last_intent")

#     # --- API Key Failover Loop ---
#     result = None
#     key_manager.current_key_index = 0 # Reset to the first key for each new request

#     while (current_api_key := key_manager.get_key()) is not None:
#         llm = ChatGoogleGenerativeAI(model="gemini-1.5-flash", google_api_key=current_api_key, temperature=0.1)
#         main_chain = LLMChain(llm=llm, prompt=main_prompt_template)
        
#         chain_input = {
#         "prior_json": json.dumps(partial_invoice, ensure_ascii=False),
#         "user_input": user_input,
#         "today_date": date.today().isoformat(),
#         "invoice_no": next_invoice_no # Use the number we fetched
#         }

#         try:
#             print(f"Attempting API call with key #{key_manager.current_key_index + 1}...")
#             result = await main_chain.ainvoke(chain_input)
#             print("✅ API call successful.")
#             break
#         except ResourceExhausted:
#             print(f"⚠️ Key #{key_manager.current_key_index + 1} exhausted. Switching...")
#             key_manager.switch_to_next_key()
#             continue
#         except Exception as e:
#             raise HTTPException(status_code=500, detail=f"An unexpected error occurred with the AI service: {str(e)}")

#     if result is None:
#         raise HTTPException(
#             status_code=429, # Too Many Requests
#             detail="All available API keys have exceeded their quotas. Please try again later."
#         )

#     # --- Process Successful Response ---
#     try:
#         raw_response = result["text"].strip()
#         cleaned_response = raw_response.strip("```json").strip("```").strip()
#         updated_data = json.loads(cleaned_response)
#         print("updateddata:", updated_data)
#     except Exception as e:
#         raise HTTPException(status_code=500, detail=f"Failed to parse AI JSON response: {str(e)}")

#     final_invoice_data = memory["partial_invoice"]
#     provided_invoice_no = final_invoice_data.get("invoice", {}).get("number")
#     if not provided_invoice_no:
#         next_invoice_no = await get_next_invoice_number(user_id)
#     else:
#         next_invoice_no = provided_invoice_no

#     intent = updated_data.get("intent")
#     if intent:
#         memory["last_intent"] = intent

#     # --- Intent Handling Logic ---
#     if intent == "edit_existing":
#         invoice_number = updated_data.get("invoice_number")
#         if not invoice_number:
#             return {"message": "Please specify the invoice number you want to edit."}
#         try:
#             invoice_to_edit = await load_invoice_for_edit(invoice_number, user_id)
#             memory["partial_invoice"] = invoice_to_edit
#             save_conversation_memory(user_id, memory)
#             return {"message": f"Loaded invoice {invoice_number}. What would you like to change?"}
#         except HTTPException as e:
#             return {"message": e.detail}

#     elif intent == "edit":
#         memory["partial_invoice"] = updated_data
#         save_conversation_memory(user_id, memory)
#         return {
#             "message": "I have updated the invoice with your changes. Say 'confirm edit' to save, or continue making changes.",
#             "pending_action": "awaiting_edit_confirmation"
#         }

#     elif intent == "confirm_edit":
#         if last_intent not in ["edit", "edit_existing"]:
#             return {"message": "There are no pending edits to confirm."}
#         final_invoice_data = memory["partial_invoice"]
#         invoice_id = final_invoice_data.get("id")
#         if not invoice_id:
#             return {"message": "Could not find the ID of the invoice to update. Please start the edit process again."}
#         try:
#             result = await update_invoice(invoice_id, final_invoice_data, user_id)
#             embed_and_store_invoice(result["invoice_id"], transformed_data)
#             clear_conversation_memory(user_id)
#             return {"message": result['message'], "url": result['url']}
#         except Exception as e:
#             return {"message": f"Failed to update invoice: {str(e)}"}

#     elif intent == "create":
#         memory["partial_invoice"] = updated_data
#         save_conversation_memory(user_id, memory)

#         # --- 1. Validate the AI's Output ---
#         buyer = updated_data.get("buyer", {})
#         items = updated_data.get("items", [])
        
#         if not buyer or not items:
#             return {
#                 "message": "I have some details, but I'm missing either the buyer information or the items. What else can I add?",
#                 "invoice_preview": None
#             }

#         # Check if any item is missing a quantity or rate
#         incomplete_items = []
#         for item in items:
#             if item.get("quantity") is None or item.get("rate") is None:
#                 incomplete_items.append(item.get("name", "an unnamed item"))
        
#         # If there are incomplete items, ask the user for more information
#         if incomplete_items:
#             missing_items_str = ", ".join(incomplete_items)
#             return {
#                 "message": f"I'm missing some details. Could you please provide the quantity and rate for: {missing_items_str}?",
#                 "invoice_preview": None
#             }

#         # --- 2. Perform Calculations Safely ---
#         # At this point, all items have a quantity and rate. We still use defaults for safety.
#         subtotal = sum((item.get("quantity", 0) or 0) * (item.get("rate", 0) or 0) for item in items)
        
#         # Assuming a single GST rate for the whole invoice. Default to 0%.
#         gst_rate = updated_data.get("gst", 0) 
#         gst_amount = round(subtotal * gst_rate, 2)
#         total = round(subtotal + gst_amount, 2)

#         # --- 3. Format the Preview Message ---
#         item_lines = []
#         for i, item in enumerate(items):
#             # Use robust access to prevent errors
#             quantity = item.get('quantity', 0) or 0
#             rate = item.get('rate', 0) or 0
#             amount = quantity * rate
#             item_lines.append(
#                 f"{i+1}. {item.get('name')} | Qty: {quantity} | Rate: ₹{rate} | Amt: ₹{amount}"
#             )
#         item_summary = "\n".join(item_lines)

#         # Assemble the final message for the user
#         preview_message = f"""🧾 Invoice Preview
#     - Invoice Number: {next_invoice_no}
#     👤 Buyer Details
#     - Name: {buyer.get('name', 'N/A')}
#     - Phone: {buyer.get('phone', 'N/A')}
#     - GSTIN: {buyer.get('gstin', 'N/A')}
#     - Address: {buyer.get('address', 'N/A')}

#     📦 Items
#     {item_summary}

#     💰 Summary
#     - Subtotal: ₹{subtotal}
#     - GST ({int(gst_rate * 100)}%): ₹{gst_amount}
#     - Total: ₹{total}

#     ✅ Say 'confirm' to create the invoice."""

#         # Structure the data for the frontend to display
#         preview_data = {
#             "buyer": buyer,
#             "items": items,
#             "subtotal": subtotal,
#             "gst_rate": gst_rate,
#             "gst_amount": gst_amount,
#             "total": total
#         }

#         return {
#             "message": preview_message,
#             "pending_action": "awaiting_creation_confirmation",
#             "invoice_preview": preview_data
#         }

#     elif intent == "confirm_creation":
#         if last_intent not in ["create", "edit"]:
#             return {"message": "There is no new invoice to confirm."}
        
#         # ✅ START: Updated Logic
#         # 1. Get the invoice data from memory (AI's format)
#         final_invoice_data = memory["partial_invoice"]
        
#         # 2. Transform the data to the required format for the creation service
#         try:
#             transformed_data = transform_for_creation(final_invoice_data)
#         except Exception as e:
#             # Handle potential errors during transformation (e.g., missing keys)
#             print(f"Error transforming invoice data: {e}")
#             return {"message": f"Error preparing invoice data for creation: {str(e)}"}
        
#         template_no = "temp1"
        
#         try:
#             # 3. Use the TRANSFORMED data to create the invoice
#             result = await create_invoice(transformed_data, user_id, template_no, next_invoice_no)
#             embed_and_store_invoice(result["invoice_id"], transformed_data)
#             clear_conversation_memory(user_id)
#             return {"message": f"Invoice created! You can view it here:\n {result['url']}"}
#         except Exception as e:
#             return {"message": f"Failed to create invoice: {str(e)}"}
#         # ✅ END: Updated Logic

#     elif intent == "reset":
#         clear_conversation_memory(user_id)
#         return {"message": "Okay, I've cleared our conversation. Let's start over."}

#     elif intent == "query":
#         # Use the key that we know works from the main loop to initialize query chains
#         working_key = key_manager.get_key()
#         query_llm = ChatGoogleGenerativeAI(model="gemini-1.5-flash", google_api_key=working_key, temperature=0.1)
#         answer_chain = LLMChain(llm=query_llm, prompt=answer_prompt_template)
#         fallback_chain = LLMChain(llm=query_llm, prompt=fallback_prompt_template)

#         reply = await semantic_search_and_answer(
#             user_input=user_input,
#             user_id=user_id,
#             embed_function=embed_text,
#             supabase_client=supabase,
#             fallback_chain=fallback_chain,
#             llm_chain=answer_chain,
#             top_k=5
#         )
#         memory["chat_history"].extend([{"role": "human", "content": user_input}, {"role": "ai", "content": reply}])
#         save_conversation_memory(user_id, memory)
#         print("reply:", reply)
#         return {"message": reply}

#     else:
#         save_conversation_memory(user_id, memory)
#         return {"message": "I'm not sure how to handle that. Can you please clarify?"}


# app/routes/voice_bot.py

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from dotenv import load_dotenv

from app.api.agents.invoice_agent import get_vyapari_agent_executor

# --- Load Environment Variables ---
load_dotenv()

# --- Router and Request Model ---
router = APIRouter()

class InputData(BaseModel):
    user_id: str
    input_value: str

#======================================================================
#   VOICE BOT API ENDPOINT
#======================================================================
@router.post("/voice_bot")
async def voice_bot(data: InputData):
    """
    This endpoint uses a voice bot to handle user requests.
    """
    if not data.user_id or not data.input_value:
        raise HTTPException(status_code=400, detail="user_id and input_value are required.")

    try:
        # 1. Get the agent for the specific user. This loads their unique
        #    conversation history and tools.
        agent_executor = get_vyapari_agent_executor(data.user_id)

        # 2. Invoke the agent with the user's input.
        #    The agent will now autonomously reason, use tools, and
        #    generate a response.
        response = await agent_executor.ainvoke({"input": data.input_value})

        # 3. Return the agent's final output to the user.
        return {"message": response.get("output", "I'm sorry, I encountered an issue. Please try again.")}

    except Exception as e:
        # Log the full error for debugging
        print(f"An error occurred in the autonomous agent: {e}")
        # Return a generic error to the user
        raise HTTPException(status_code=500, detail=f"An unexpected error occurred: {str(e)}")