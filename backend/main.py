from app.services.invoice_generator import generate_invoice_pdf1
from fastapi import FastAPI, HTTPException, Request, Form, File, UploadFile
from pydantic import BaseModel
from typing import List, Optional
import json
import os,re
from fastapi.middleware.cors import CORSMiddleware
from datetime import datetime
from app.services.invoice_generator import generate_invoice_pdf3
from datetime import datetime
from app.api import auth
from app.api import invoice
from app.api import product
from app.api import voice_bot
from app.api import drive

import pdfplumber
import tempfile
import google.generativeai as genai
import asyncio
from pydantic import BaseModel


app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000","https://vyapari.vercel.app"],  # Or restrict to your frontend origin e.g. ["http://localhost:3000"]
    allow_credentials=True,
    allow_methods=["*"],  # Allow POST, GET, OPTIONS, etc.
    allow_headers=["*"],
)


# auth routing
app.include_router(auth.router) 

# invoice routing
app.include_router(invoice.router)

# product routing
app.include_router(product.router, prefix="/api")

# voicebot routing
app.include_router(voice_bot.router)

# drive routing
app.include_router(drive.router)



class InputData(BaseModel):
    input_value: str
    invoice_no:str
    user_id:str

genai.configure(api_key=os.environ["GEMINI_API_KEY_1"])

async def gemini(prompt: str) -> str:
    try:
        print("🔥 Sending prompt to Gemini...")
        model = genai.GenerativeModel("gemini-1.5-flash")

        # Run blocking Gemini code in async context
        loop = asyncio.get_event_loop()
        response = await loop.run_in_executor(None, lambda: model.generate_content(prompt))
        
        output = response.text.strip()
        print("✅ Gemini output received.",output)
        return output
    except Exception as e:
        print("❌ Gemini Error:", str(e))
        return "GEMINI_ERROR"


@app.post("/ocr")
async def extract_text_from_multiple_pdfs(
    files: List[UploadFile] = File(...),
    fp: Optional[str] = Form(None),
    cur_gt: Optional[str] = Form(None)
):
    try:
        if not files:
            return {"success": False, "error": "❌ No PDF files provided."}

        all_text = ""
        for file in files:
            filename = file.filename
            with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp:
                tmp.write(await file.read())
                tmp_path = tmp.name

            with pdfplumber.open(tmp_path) as pdf:
                text = ""
                for page in pdf.pages:
                    page_text = page.extract_text()
                    if page_text:
                        text += page_text + "\n"

            if text.strip():
                all_text += f"\n\n📄 Invoice File: {filename}\n------------------\n{text.strip()}\n------------------"
            else:
                all_text += f"\n\n📄 Invoice File: {filename}\n------------------\n(No text extracted)\n------------------"

        # Fallbacks
        today = datetime.today()
        filing_period = fp or today.strftime("%m%Y")  # e.g., 062025
        turnover = cur_gt if cur_gt is not None else ""

        # Prompt to Gemini
        prompt = f"""
You are an expert GST invoice parser and GSTR-1 generator.

Below is raw extracted text from multiple invoice PDFs. Generate valid GSTR-1 JSON (B2B section only).

Assumptions:
- All invoices are B2B and intra-state (CGST + SGST)
- Use "rchrg": "N"
- Use "inv_typ": "R"
- Each item should use "num": 1
- Use "fp": "{filing_period}"
- Use "cur_gt": {json.dumps(turnover)}

Format Example:
{{
  "gstin": "<SELLER_GSTIN>",
  "fp": "{filing_period}",
  "cur_gt": {json.dumps(turnover)},
  "b2b": [
    {{
      "ctin": "<BUYER_GSTIN>",
      "inv": [
        {{
          "inum": "<INVOICE_NUMBER>",
          "idt": "<DD-MM-YYYY>",
          "val": <TOTAL_VALUE>,
          "pos": "27",
          "rchrg": "N",
          "inv_typ": "R",
          "itms": [
            {{
              "num": 1,
              "itm_det": {{
                "rt": <GST_RATE>,
                "txval": <TAXABLE_AMOUNT>,
                "iamt": 0.00,
                "camt": <CGST>,
                "samt": <SGST>,
                "csamt": 0.00
              }}
            }}
          ]
        }}
      ]
    }}
  ]
}}

⚠️ Your response must be:
- Valid JSON only
- No markdown or explanation
- Strictly follow the schema

Raw Invoices:
{all_text}
"""

        print("📤 Final Prompt Preview (truncated):")
        print(prompt[:1500])
        gemini_output = await gemini(prompt)

        if gemini_output == "GEMINI_ERROR":
            return {"success": False, "error": "❌ Gemini failed to process request."}

        try:
            clean_output = re.sub(r"```json|```", "", gemini_output).strip()
            parsed = json.loads(clean_output)
            print(parsed)
            return {
                "success": True,
                "parsed_gstr1": parsed
            }
        except json.JSONDecodeError:
            return {
                "success": False,
                "error": "❌ Gemini returned invalid JSON.",
                "raw_output": gemini_output
            }

    except Exception as e:
        return {
            "success": False,
            "error": f"❌ Exception: {str(e)}"
        }
    
@app.post("/parse_invoice")
async def parse_invoice_endpoint(request:Request):
    sample_data =await request.json()
    # printed_data = json.loads(parsed_info(sample_data["input_value"]))  # ✅ No await
    # print(printed_data)
    pdf_file = generate_invoice_pdf3(sample_data, "sample_invoice.pdf")
    print(f"Invoice generated: {pdf_file}")

# #code for voice bot
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
#      "invoice_number": "<number>"
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
#     "number": "JK0569/24-25",
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
#     input_variables=["prior_json", "user_input", "today_date"]
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
# @app.post("/voice_bot")
# async def voice_bot(data: InputData, request: Request):
#     user_id = data.user_id
#     user_input = data.input_value

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

#     result = chain.invoke({
#         "prior_json": json.dumps(partial_invoice, ensure_ascii=False),
#         "user_input": user_input,
#         "today_date": date.today().isoformat()
#     })

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
#         try:
#             invoice_no = parsed_invoice.get("invoice", {}).get("number")
#             if not invoice_no:
#                 raise HTTPException(status_code=400, detail="Invoice number is required")

#             # Fetch existing invoice
#             invoice_resp = (
#                 supabase.table("invoices_record")
#                 .select("*")
#                 .eq("invoice_no", invoice_no)
#                 .eq("user_id", user_id)
#                 .single()
#                 .execute()
#             )
#             if not invoice_resp.data:
#                 raise HTTPException(status_code=404, detail="Invoice not found")

#             invoice_id = invoice_resp.data["id"]
#             old_url = invoice_resp.data.get("invoice_url")
#             template_no = invoice_resp.data.get("template_no")
#             if not template_no:
#                 raise HTTPException(status_code=400, detail="Template number missing")

#             # Remove old PDF
#             if old_url:
#                 filename = old_url.split("/")[-1].split("?")[0]
#                 supabase.storage.from_("invoices").remove([f"{user_id}/{filename}"])

#             # Generate new PDF
#             try:
#                 if template_no=='temp1':
#                     pdf_path = generate_invoice_pdf3(parse_invoice)
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
#                 "invoice_date": normalize_date(parsed_invoice["invoice"].get("date")),
#                 "invoice_url": new_url,
#                 "vehicle_no": parsed_invoice.get("vehicle_no"),
#                 "challan_no": parsed_invoice.get("challan_no"),
#                 "challan_date": normalize_date(parsed_invoice.get("challan_date")),
#                 "purchase_no": parsed_invoice.get("purchase_no"),
#                 "purchase_date": normalize_date(parsed_invoice.get("purchase_date")),
#             }
#             supabase.table("invoices_record").update(update_data).eq("id", invoice_id).execute()

#             # Remove old items
#             supabase.table("items_record").delete().eq("product_id", invoice_id).execute()

#             # Insert new items
#             new_items = []
#             for item in parsed_invoice.get("items", []):
#                 new_items.append({
#                     "product_id": invoice_id,
#                     "item_name": item["name"],
#                     "hsn_code": item.get("hsn"),
#                     "gst_rate": item.get("gst_rate"),
#                     "item_rate": item.get("rate"),
#                     "per_unit": item.get("unit"),
#                     "qty": item.get("quantity"),
#                 })
#             if new_items:
#                 supabase.table("items_record").insert(new_items).execute()

#             # Update buyer if buyer_id exists
#             buyer_id = parsed_invoice.get("buyer_id")
#             if buyer_id:
#                 buyer_update_data = {
#                     "name": parsed_invoice["buyer"].get("name"),
#                     "address": parsed_invoice["buyer"].get("address"),
#                     "gst_no": parsed_invoice["buyer"].get("gstin"),
#                     "email": "",
#                     "phone_no": ""
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

#         except HTTPException as he:
#             raise he
#         except Exception as e:
#             raise HTTPException(status_code=500, detail=f"Error updating invoice: {str(e)}")

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
#     if intent == "edit_existing":
#         invoice_number = updated_data.get("invoice_number")
#         if not invoice_number:
#             return {"message": "Please specify the invoice number you want to edit."}

#         existing_invoice = load_invoice_from_database(invoice_number, user_id)
#         if not existing_invoice:
#             return {"message": f"No invoice found with number {invoice_number}."}

#         memory["partial_invoice"] = existing_invoice
#         memory["chat_history"] = limited_history + [
#             {"role": "human", "content": user_input},
#             {"role": "ai", "content": f"Loaded invoice {invoice_number}. What would you like to change?"}
#         ]
#         save_conversation_memory(user_id, memory)

#         return {"message": f"Loaded invoice {invoice_number}. What would you like to change?"}

#     # EDIT: Update an invoice
#     if intent == "edit":
#         print('edit')
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
#         print(reply)

#         memory["chat_history"] = limited_history + [
#             {"role": "human", "content": user_input},
#             {"role": "ai", "content": reply}
#         ]
#         save_conversation_memory(user_id, memory)

#         return {"message": reply}

