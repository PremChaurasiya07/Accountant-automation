from app.services.invoice_generator import generate_invoice_pdf1
from fastapi import FastAPI, HTTPException, Request, Form, File, UploadFile
from pydantic import BaseModel
from typing import List, Optional
import json
import os,re
from fastapi.middleware.cors import CORSMiddleware
from app.core.supabase import supabase
from app.services.gemini import parsed_info
from app.services.invoice_parser import parse_invoice
from datetime import datetime
from app.deps.auth import get_current_user
from utils.upload_to_storage import upload_file
from app.services.invoice_generator import generate_invoice_pdf3
from datetime import datetime
from app.api import auth
from app.api import invoice
from app.api import product
from datetime import date
from app.api.invoice import edit_invoice

import pdfplumber
import tempfile
import google.generativeai as genai
import asyncio

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



# route to save user_company info
def get_user_id_from_token(token: str = Form(...)) -> str:
    # decode Supabase JWT here (or use middleware)
    # simplified for example:
    user = supabase.auth.get_user(token)
    if not user or not user.user:
        raise HTTPException(status_code=401, detail="Invalid token")
    return user.user.id


class InputData(BaseModel):
    input_value: str
    invoice_no:str

genai.configure(api_key=os.environ["GEMINI_API_KEY"])

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

@app.post("/voice_bot")
async def voice_bot(data:InputData,request:Request):
    print(data.input_value)
    parsed_data = json.loads(parsed_info(data.input_value))  # ✅ No await
    print(parsed_data)

    # if parsed_data.get('intent')!='create':
    #     return {
    #             "message": "Not able to do that, just able to create invoice",
    #         }

    if parsed_data.get('intent')=='create':
       
        try:
            # data = await request.json())
            # template_no=data.get('template_id')
            # print('templateid',template_no)
            # redefined_data = parsed_info(data)
            print('a')
            invoice_no = data.invoice_no
            if not invoice_no:
                raise HTTPException(status_code=400, detail="Invoice number is required")
            print('b')
            # 🛑 Check if invoice already exists
            existing_invoice = supabase.table("invoices_record").select("id").eq("invoice_no", invoice_no).execute()
            if existing_invoice.data and len(existing_invoice.data) > 0:
                return {
                    "message": f"Invoice with number {invoice_no} already exists.",
                    "invoice_id": existing_invoice.data[0]["id"]
                }
            print('start')
            pdf_path=generate_invoice_pdf3(parsed_data)
            print("PDF path:", pdf_path)
            # if not template_no:
            #     return {
            #         'message':'template unknown'
            #     }
            # elif template_no=='temp1':
            # # ✅ Proceed with creation
            #     pdf_path = generate_invoice_pdf1(parsed)
            #     print("PDF path:", pdf_path)
            # elif template_no=='temp2':
            # # ✅ Proceed with creation
            #     pdf_path = generate_invoice_pdf2(parsed)
            #     print("PDF path:", pdf_path)

            def normalize_date(value):
                try:
                    if isinstance(value, datetime):
                        return value.date().isoformat()
                    if isinstance(value, date):
                        return value.isoformat()
                    if value and isinstance(value, str) and value.strip():
                        return datetime.strptime(value.strip(), "%Y-%m-%d").date().isoformat()
                except Exception as e:
                    print("Date parse error:", e)
                return None


            user = await get_current_user(request)
            user_id = user.id
            if not user_id:
                raise HTTPException(status_code=401, detail="User not logged in")
            print('c')
            try:
                storage_result = await upload_file(
                    pdf_path,
                    folder="invoices",
                    user_id=user_id,
                    invoice_no=invoice_no
                )
                print("Upload successful:", storage_result)
            except Exception as e:
                print("Upload failed:", e)

            print('d')
            storage_url = storage_result["url"]
            file_path = storage_result["filename"]
            print('e')
            # Insert buyer
            buyer_data = {
                "name": parsed_data["buyer"]["name"],
                "gst_no": parsed_data["buyer"]["gstin"],
                "email": "",
                "address": parsed_data["buyer"]["address"],
                "phone_no": ""
            }
            print(buyer_data)
            buyer_response = supabase.table("buyers_record").insert(buyer_data).execute()
            print('d')
            if not buyer_response.data or not isinstance(buyer_response.data, list):
                raise HTTPException(status_code=500, detail="Failed to insert buyer")
            buyer_id = buyer_response.data[0]["id"]

            # Get seller ID
            seller_response = supabase.table("sellers_record").select("id").eq("user_id", user_id).single().execute()
            if not seller_response.data:
                raise HTTPException(status_code=404, detail="Seller not found")
            seller_id = seller_response.data["id"]

            

            today = date.today()
            print(today)  # e.g. 2025-06-21

            # Insert invoice
            invoice_data = {
                "challan_date": normalize_date(parsed_data.get("challan_date")),
                "challan_no": parsed_data.get("challan_no"),
                "invoice_date": normalize_date(parsed_data.get("invoice", {}).get("date")) or today.isoformat(),
                "invoice_no": invoice_no,
                "purchase_date": normalize_date(parsed_data.get("purchase_date")),
                "purchase_no": parsed_data.get("purchase_no"),
                "vehicle_no": parsed_data.get("vehicle_no"),
                "invoice_url": storage_url,
                "buyer_id": buyer_id,
                "seller_id": seller_id,
                # "template_no":parsed_data.get("template_id", template_no),
                "user_id":user_id
            }

            invoice_response = supabase.table("invoices_record").insert(invoice_data).execute()
            invoice_id = invoice_response.data[0]["id"]

            # Insert items
            records = []
            for item in parsed_data.get("items", []):
                records.append({
                    "product_id": invoice_id,
                    "item_name": f"{item['name']}",
                    "hsn_code": item["hsn"],
                    "gst_rate": item["gst_rate"],
                    "item_rate": item["amount"],
                    "per_unit": item["rate"],
                    "qty": item["quantity"],
            })
            supabase.table("items_record").insert(records).execute()

            if os.path.exists(pdf_path):
                os.remove(pdf_path)

            return {
                "message": "Invoice created successfully",
                "invoice_id": invoice_id,
                "url": storage_url
            }

        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Error creating invoice: {str(e)}")
        
    elif parsed_data.get("intent") == "edit": 
        user_input_value = data.input_value.strip()
        if not user_input_value:
            return {"error": "❌ No input provided to edit the invoice."}

        invoice_no_prompt = f"""
            You are a multilingual assistant designed to extract invoice numbers reliably.

            Instructions:
            1. If the input is in Hindi or any other language, translate it to English first.
            2. Then, extract **only the first valid invoice number** mentioned in the text.
            3. Invoice numbers typically look like:
            - 46/2025-26
            - INV/23/2024
            - CE/29/2025
            4. Ignore other invoice numbers if more than one is present.
            5. Ignore any invoice numbers in metadata, JSON, or seller records.
            6. Do not explain anything. Do not add context. Just return the invoice number.

            ❗ Final Output:
            Return **only** the invoice number (e.g. 029/2025-26). No extra words, no explanation, no markdown.

            User input:
            {user_input_value}
            """
        extracted_invoiceno_raw = await gemini(invoice_no_prompt)
        if not extracted_invoiceno_raw:
            return {"error": "❌ Gemini did not return any invoice number."}

        extracted_invoiceno = extracted_invoiceno_raw.replace("`", "").replace('"', '')
        match = re.search(r"\b(?:[A-Z]+\/)?\d{2,3}\/\d{4}-\d{2}\b", extracted_invoiceno)
        if not match:
            return {"error": "❌ No valid invoice number found in Gemini output."}
        extracted_invoiceno = match.group(0)
        print("✅ Extracted Invoice No:", extracted_invoiceno)

        # Fetch invoice
        invoice_response =  supabase.table("invoices_record").select("*").eq("invoice_no", extracted_invoiceno).execute()
        if not invoice_response.data:
            return {"error": f"❌ Invoice '{extracted_invoiceno}' not found."}
        invoice_data = invoice_response.data[0]

        # Fetch buyer
        buyer_data = {}
        buyer_id = invoice_data.get("buyer_id") or parsed.get("buyer_id")
        if buyer_id:
            buyer_response =  supabase.table("buyers_record").select("*").eq("id", buyer_id).execute()
            if buyer_response.data:
                buyer_data = buyer_response.data[0]

        # Fetch items
        item_data = []
        invoice_id = invoice_data.get("id")
        if invoice_id:
            item_response =  supabase.table("items_record").select("*").eq("product_id", invoice_id).execute()
            if item_response.data:
                item_data = item_response.data

        today_date = datetime.today().strftime("%Y-%m-%d")

        update_prompt = f"""
            You will receive:
            - existing_invoice
            - buyer
            - items
            - user_query

            🎯 Update and return new full JSON (no explanation, no extra fields).

            Additional instructions:
            - For each item, calculate amount = quantity × rate (round to 2 decimals).
            - For each item, calculate gst_amount = (amount × gst_rate / 100) (round to 2 decimals).
            - Then calculate subtotal = sum of all item amounts.
            - Then calculate total_gst = sum of all gst_amount.
            - Then calculate total = subtotal + total_gst (rounded to nearest integer).
            - Then convert total into `amount_in_words` field (e.g., "INR Twenty Seven Thousand Six Hundred Ninety One Only").

                    

            If invoice date is missing, use today: {today_date}

            Output format must match exactly:
            {{
                "intent": "edit",
                "company": {{
                    "name": "Chaurasiya pharma",
                    "address": "Shop No.2,Shiv Ashish Building,Star Complex Road,Opp Sai Mandir,Golani Phata,Vasai (East)",
                    "district": "Palghar-401208",
                    "mobile": "9664395486",
                    "phone": "",
                    "gstin": "27BEJPP4176E1Z9",
                    "state": "Maharashtra, Code : 27",
                    "contact": "+9011191086",
                    "email": "jkentpd15@gmail.com"
                }},
                "invoice": {{
                    "number": {extracted_invoiceno},
                    "date": "{today_date}",
                    "delivery_note": " ",
                    "payment_terms": "",
                    "reference": "",
                    "other_references": "",
                    "buyer_order": "",
                    "buyer_order_date": "",
                    "dispatch_doc": "",
                    "delivery_date": "",
                    "dispatch_through": "",
                    "destination": "",
                    "terms_delivery": ""
                }},
                "buyer": {{
                    "name": "Prem Chaurasiya Pharma Equipments",
                    "address": "Opp Phase-2 Parmar Building Near Vasai Phata,\\nVasai Dist.-Palghar",
                    "gstin": "27AHQPC7120E1ZK",
                    "state": "Maharashtra, Code : 27"
                }},
                "items": [
                    {{
                    "name": "Delrin Rod 20mm White Rod",
                    "hsn": "39169090",
                    "gst_rate": 18,
                    "quantity": 13.86,
                    "unit": "kg",
                    "rate": 380.00,
                    "amount": 5266.80
                    }},
                    {{
                    "name": "Caster Wheel Ss202",
                    "description": "3\\\"I Red Pu Wheel Lock",
                    "hsn": "830220",
                    "gst_rate": 18,
                    "quantity": 26,
                    "unit": "pcs",
                    "rate": 400.00,
                    "amount": 10400.00
                    }},
                    {{
                    "name": "Caster Wheel Ss202",
                    "description": "3 I Red Pu Wheel Lock Mov",
                    "hsn": "830220",
                    "gst_rate": 18,
                    "quantity": 26,
                    "unit": "pcs",
                    "rate": 300.00,
                    "amount": 7800.00
                    }}
                ],
                "amount_in_words": "INR Twenty Seven Thousand Six Hundred Ninety One Only",
                "bank": {{
                    "name": "Bank of Maharashtra",
                    "account": "60513819000",
                    "branch_ifsc": "Waliv Vasai(East) & MAHB0001718"
                }}
                }}

            existing_invoice:
            {json.dumps(invoice_data)}

            buyer:
            {json.dumps(buyer_data)}

            items:
            {json.dumps(item_data)}

            Extracted invoice number : {extracted_invoiceno} use this invoice number only strictly not the 2 one that comes in prompt

            user_query:
            {user_input_value}
        """

        updated_info_raw = await gemini(update_prompt)
        if not updated_info_raw or "{" not in updated_info_raw:
            return {"error": "❌ Gemini failed to generate valid JSON.", "raw_output": updated_info_raw}

        try:
            cleaned_json = updated_info_raw.strip().replace("```json", "").replace("```", "")
            updated_invoice_data = json.loads(cleaned_json)
            print("✅ Updated Invoice JSON:", updated_invoice_data)

            redefined_data = parsed_info(updated_invoice_data)
            parsed = json.loads(redefined_data)
            print('m')
            parsed["invoice"]["number"] = extracted_invoiceno
            invoice_no = extracted_invoiceno
            print('invoice no',invoice_no)
            if not invoice_no:
                raise HTTPException(status_code=400, detail="Invoice number is required")

            user = await get_current_user(request)
            user_id = user.id
            if not user_id:
                raise HTTPException(status_code=401, detail="User not logged in")

            invoice_resp =  supabase.table("invoices_record").select("*").eq("invoice_no", invoice_no).limit(1).execute()
            if not invoice_resp.data or not isinstance(invoice_resp.data, list):
                raise HTTPException(status_code=404, detail="Invoice not found")

            invoice_record = invoice_resp.data[0]
            invoice_id = invoice_record["id"]
            old_url = invoice_record.get("invoice_url")
            template_no = invoice_record.get("template_no")

            if old_url:
                filename = old_url.split("/")[-1].split("?")[0]
                supabase.storage.from_("invoices").remove([f"{user_id}/{filename}"])
                print("🧹 Removed old invoice file:", filename)

            try:
                    pdf_path = generate_invoice_pdf3(parsed)
                # elif template_no=='temp2':
                #     pdf_path = generate_invoice_pdf2(parsed)
                # elif template_no=='temp3':
                #     pdf_path = generate_invoice_pdf3(parsed)
            except Exception as pdf_error:
                raise HTTPException(status_code=500, detail=f"PDF generation failed: {str(pdf_error)}")

            upload_result = await upload_file(pdf_path, folder="invoices", user_id=user_id, invoice_no=invoice_no)
            new_url = upload_result["url"]

            def normalize_date(value):
                try:
                    if value and value.strip():
                        return datetime.strptime(value.strip(), "%Y-%m-%d").date().isoformat()
                except Exception:
                    return None
                return None

            update_data = {
                "challan_date": normalize_date(parsed.get("challan_date")),
                "challan_no": parsed.get("challan_no"),
                "invoice_date": normalize_date(parsed["invoice"]["date"]),
                "purchase_date": normalize_date(parsed.get("purchase_date")),
                "purchase_no": parsed.get("purchase_no"),
                "vehicle_no": parsed.get("vehicle_no"),
                "invoice_url": new_url,
            }
            supabase.table("invoices_record").update(update_data).eq("id", invoice_id).execute()

            supabase.table("items_record").delete().eq("product_id", invoice_id).execute()
            new_items = [{
                "product_id": invoice_id,
                "item_name": item["name"],
                "hsn_code": item["hsn"],
                "gst_rate": item["gst_rate"],
                "item_rate": item["amount"],
                "per_unit": item["rate"],
                "qty": item["quantity"],
            } for item in parsed.get("items", [])]
            supabase.table("items_record").insert(new_items).execute()

            if parsed.get("buyer") and buyer_id:
                buyer_update_data = {
                    "name": parsed["buyer"]["name"],
                    "gst_no": parsed["buyer"]["gstin"],
                    "email": "",
                    "address": parsed["buyer"]["address"],
                    "phone_no": ""
                }
                buyer_update_data = {k: v for k, v in buyer_update_data.items() if v is not None}
                supabase.table("buyers_record").update(buyer_update_data).eq("id", buyer_id).execute()

            if os.path.exists(pdf_path):
                os.remove(pdf_path)

            return {
                "message": "✅ Invoice updated successfully",
                "invoice_id": invoice_id,
                "url": new_url
            }

        except json.JSONDecodeError as e:
            print("❌ JSON parsing failed:", e)
            print("🔎 Gemini Output:", updated_info_raw)
            return {"error": "❌ Gemini returned invalid JSON.", "raw_output": updated_info_raw}
