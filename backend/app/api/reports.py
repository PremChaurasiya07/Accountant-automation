from fastapi import APIRouter, Request, HTTPException, File, UploadFile, Form
from pydantic import BaseModel
from typing import List, Optional
import tempfile
import pdfplumber
import json
import re
from datetime import datetime
import os
from app.services.gemini_invoicefinder import gemini
# Import your project's modules
from app.deps.auth import get_current_user # Assuming gemini is your async helper

from app.core.supabase import supabase

router = APIRouter(
    prefix="/reports",
    tags=["Reports"]
)

# Pydantic model for the date range payload
class DateRangePayload(BaseModel):
    start_date: str
    end_date: str

# --- Endpoint 1: Generate GSTR-1 from Database (Corrected) ---


@router.post("/gstr1-from-db")
async def generate_gstr1_from_database(payload: DateRangePayload, request: Request):
    try:
        user = await get_current_user(request)
        if not user or not user.id:
            raise HTTPException(status_code=401, detail="User not authenticated.")
        user_id = user.id

        seller_res = supabase.table("sellers_record").select("gstin").eq("user_id", user_id).single().execute()
        if not seller_res.data or not seller_res.data.get('gstin'):
            raise HTTPException(status_code=404, detail="Seller GSTIN not found.")
        seller_gstin = seller_res.data['gstin']

        invoices_res = supabase.table("invoices_record") \
            .select("number, date, buyers_record(gstin, state), items_record(quantity, rate, gst_rate)") \
            .eq("user_id", user_id) \
            .gte("date", payload.start_date) \
            .lte("date", payload.end_date) \
            .execute()
        
        # --- Transform Data into GSTR-1 JSON with Correct Formatting ---
        b2b_map = {}
        total_gross_turnover = 0.0

        for invoice in invoices_res.data:
            buyer_record = invoice.get("buyers_record")
            if not buyer_record or not buyer_record.get("gstin"):
                continue

            buyer_gstin = buyer_record["gstin"]
            buyer_state_code = "27" # Default to Maharashtra; can be made dynamic if state codes are stored
            taxable_value = 0.0
            total_cgst = 0.0
            total_sgst = 0.0
            last_gst_rate = 0.0

            for item in invoice.get("items_record", []):
                rate = float(item.get('rate', 0))
                quantity = float(item.get('quantity', 0))
                gst_rate = float(item.get('gst_rate', 0))
                last_gst_rate = gst_rate
                
                item_taxable = rate * quantity
                taxable_value += item_taxable
                
                tax_amount = item_taxable * (gst_rate / 100)
                total_cgst += tax_amount / 2
                total_sgst += tax_amount / 2
            
            invoice_total_value = taxable_value + total_cgst + total_sgst
            
            if invoice_total_value <= 0:
                continue
            
            total_gross_turnover += invoice_total_value

            if buyer_gstin not in b2b_map:
                b2b_map[buyer_gstin] = {"ctin": buyer_gstin, "inv": []}
            
            # --- MODIFIED: All monetary values are now correctly rounded to 2 decimal places ---
            b2b_map[buyer_gstin]["inv"].append({
                "inum": invoice["number"],
                "idt": datetime.strptime(invoice["date"], "%Y-%m-%d").strftime("%d-%m-%Y"),
                "val": round(invoice_total_value, 2),
                "pos": buyer_state_code,
                "rchrg": "N", "inv_typ": "R",
                "itms": [{
                    "num": 1,
                    "itm_det": {
                        "rt": round(last_gst_rate, 2),
                        "txval": round(taxable_value, 2),
                        "iamt": 0.00,
                        "camt": round(total_cgst, 2),
                        "samt": round(total_sgst, 2),
                        "csamt": 0.00
                    }
                }]
            })

        filing_period = datetime.strptime(payload.end_date, "%Y-%m-%d").strftime("%m%Y")
        
        gstr1_json = {
            "gstin": seller_gstin,
            "fp": filing_period,
            "gt": round(total_gross_turnover, 2),
            "cur_gt": round(total_gross_turnover, 2),
            "b2b": list(b2b_map.values())
        }

        return {"success": True, "data": gstr1_json}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# --- Endpoint 2: Generate GSTR-1 from PDF uploads (Your original logic) ---

@router.post("/gstr1-from-pdf")
async def extract_text_from_multiple_pdfs(
    files: List[UploadFile] = File(...),
    fp: Optional[str] = Form(None),
    cur_gt: Optional[str] = Form(None)
):
    try:
        if not files:
            raise HTTPException(status_code=400, detail="No PDF files provided.")

        all_text = ""
        for file in files:
            with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp:
                tmp.write(await file.read())
                tmp_path = tmp.name
            
            try:
                with pdfplumber.open(tmp_path) as pdf:
                    text = "".join(page.extract_text() + "\n" for page in pdf.pages if page.extract_text())
                if text.strip():
                    all_text += f"\n\n--- INVOICE: {file.filename} ---\n{text.strip()}"
            finally:
                os.remove(tmp_path)

        filing_period = fp or datetime.today().strftime("%m%Y")
        turnover = cur_gt if cur_gt is not None else ""

        prompt = f"""
You are an expert GST invoice parser. Extract data from the raw text below to generate a valid GSTR-1 JSON (B2B section only).
Rules:
- Assume all invoices are B2B and intra-state (CGST + SGST).
- Use "rchrg": "N", "inv_typ": "R", "pos": "27".
- Each invoice should have one item entry with "num": 1.
- Use "fp": "{filing_period}".
- Your response must be valid JSON only, with no markdown or explanations.

Raw Invoice Text:
{all_text}
"""
        
        gemini_output = await gemini(prompt)

        if "GEMINI_ERROR" in gemini_output:
            raise HTTPException(status_code=500, detail="Gemini failed to process request.")

        try:
            clean_output = re.sub(r"```json|```", "", gemini_output).strip()
            parsed = json.loads(clean_output)
            return {"success": True, "parsed_gstr1": parsed}
        except json.JSONDecodeError:
            raise HTTPException(status_code=500, detail="Gemini returned invalid JSON.")

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"An unexpected error occurred: {str(e)}")