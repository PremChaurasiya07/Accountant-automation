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

