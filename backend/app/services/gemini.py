import os,json
from dotenv import load_dotenv
import google.generativeai as genai
from datetime import date

# Load environment variables from .env file
load_dotenv()

# Set your API key
genai.configure(api_key=os.environ["GEMINI_API_KEY"])


today = date.today().isoformat()
def parsed_info(data):
    prompt_template = """
You are a strict invoice data extractor and intent detector.
If the input is in Hindi or any local language, translate to English first.
Important:
- DO NOT return markdown or code blocks.
- DO NOT wrap the JSON in triple backticks (```).
- DO NOT prefix with the word "json".
- Return raw JSON only. Output must start with '{' and end with '}'.
- If unsure or missing values, use "" for empty strings, null for unknown, or [] for lists.
- This JSON will be parsed directly. Any non-JSON output will cause failure.

Give only valid JSON output matching the structure below. Do not explain. Do not include the phrase "here is the JSON". Do not include markdown. This is an example format only; values are placeholders:
If the `template_id` is "temp3", then respond ONLY in this format. Do not use any other format.
If the `invoice.date` field is not provided by the user, use the `{today_date}` value as the default.
{
"intent":(create/edit/delete/query any one),
"company": {
                    "name": "Chaurasiya pharma",
                    "address": "Shop No.2,Shiv Ashish Building,Star Complex Road,Opp Sai Mandir,Golani Phata,Vasai (East)",
                    "district": "Palghar-401208",
                    "mobile": "9664395486",
                    "phone": "",
                    "gstin": "27BEJPP4176E1Z9",
                    "state": "Maharashtra, Code : 27",
                    "contact": "+9011191086",
                    "email": "jkentpd15@gmail.com"
                },
                "invoice": {
                    "number": "JK0569/24-25",
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
                },
                "buyer": {
                    "name": "Prem Chaurasiya Pharma Equipments",
                    "address": "Opp Phase-2 Parmar Building Near Vasai Phata,\nVasai Dist.-Palghar",
                    "gstin": "27AHQPC7120E1ZK",
                    "state": "Maharashtra, Code : 27"
                },
                "items": [
                    {
                    "name": "Delrin Rod 20mm White Rod",
                    "hsn": "39169090",
                    "gst_rate": 18,
                    "quantity": 13.86,
                    "unit": "kg",
                    "rate": 380.00,
                    "amount": 5266.80
                    },
                    {
                    "name": "Caster Wheel Ss202",
                    "description": "3\"I Red Pu Wheel Lock",
                    "hsn": "830220",
                    "gst_rate": 18,
                    "quantity": 26,
                    "unit": "pcs",
                    "rate": 400.00,
                    "amount": 10400.00
                    },
                    {
                    "name": "Caster Wheel Ss202",
                    "description": "3 I Red Pu Wheel Lock Mov",
                    "hsn": "830220",
                    "gst_rate": 18,
                    "quantity": 26,
                    "unit": "pcs",
                    "rate": 300.00,
                    "amount": 7800.00
                    }
                ],
                "amount_in_words": "INR Twenty Seven Thousand Six Hundred Ninety One Only",
                "bank": {
                    "name": "Bank of Maharashtra",
                    "account": "60513819000",
                    "branch_ifsc": "Waliv Vasai(East) & MAHB0001718"
                }
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
    "gemini-1.5-flash",
    generation_config={
        "max_output_tokens": 2048,
        "temperature": 0.3,
        "top_p": 0.95,
    }
)

    response = model.generate_content(prompt)
    print(response)
    return response.text