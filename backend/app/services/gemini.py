


# import os
# import json
# from dotenv import load_dotenv
# import google.generativeai as genai
# from datetime import date

# # Load environment variables from .env file
# load_dotenv()

# # --- NEW: Gemini API Key Manager ---
# class GeminiAPIKeyManager:
#     """
#     Manages a pool of Gemini API keys to handle rate limits gracefully.
#     It fetches keys from environment variables like GEMINI_API_KEY_1, GEMINI_API_KEY_2, etc.
#     """
#     def __init__(self):
#         self.keys = self._load_keys()
#         self.current_key_index = 0
#         if not self.keys:
#             raise ValueError("No Gemini API keys found in environment variables (e.g., GEMINI_API_KEY_1).")
#         self._configure_genai()

#     def _load_keys(self) -> list[str]:
#         """Loads all GEMINI_API_KEY_n from environment variables."""
#         keys = []
#         i = 1
#         while True:
#             key = os.getenv(f"GEMINI_API_KEY_{i}")
#             if key:
#                 keys.append(key)
#                 i += 1
#             else:
#                 break
#         print(f"Loaded {len(keys)} Gemini API keys.")
#         return keys

#     def _configure_genai(self):
#         """Configures the genai library with the current key."""
#         print(f"Configuring Gemini with API Key index {self.current_key_index}")
#         genai.configure(api_key=self.get_key())

#     def get_key(self) -> str:
#         """Returns the current API key."""
#         return self.keys[self.current_key_index]

#     def switch_to_next_key(self) -> bool:
#         """
#         Rotates to the next available API key.
#         Returns False if it has cycled through all available keys.
#         """
#         start_index = self.current_key_index
#         self.current_key_index = (self.current_key_index + 1) % len(self.keys)
#         self._configure_genai()
        
#         # If we have looped back to the start, all keys have been tried
#         if self.current_key_index == start_index:
#             print("Warning: Cycled through all available API keys.")
#             return False
#         return True

# # Instantiate the key manager
# try:
#     key_manager = GeminiAPIKeyManager()
# except ValueError as e:
#     print(f"Error: {e}")
#     key_manager = None

# today = date.today().isoformat()

# def parsed_info(data):
#     if not key_manager:
#         return json.dumps({"error": "Gemini API Key Manager not initialized."})

#     prompt_template = """
# You are a strict invoice data extractor and intent detector.
# If the input is in Hindi or any local language, translate to English first.
# Important:
# - DO NOT return markdown or code blocks.
# - DO NOT wrap the JSON in triple backticks (```).
# - DO NOT prefix with the word "json".
# - Return raw JSON only. Output must start with '{' and end with '}'.
# - If unsure or missing values, use "" for empty strings, null for unknown, or [] for lists.
# - This JSON will be parsed directly. Any non-JSON output will cause failure.

# Give only valid JSON output matching the structure below. Do not explain. Do not include the phrase "here is the JSON". Do not include markdown. This is an example format only; values are placeholders:

# Additional instructions:
# - For each item, calculate amount = quantity × rate (round to 2 decimals).
# - For each item, calculate gst_amount = (amount × gst_rate / 100) (round to 2 decimals).
# - Then calculate subtotal = sum of all item amounts.
# - Then calculate total_gst = sum of all gst_amount.
# - Then calculate total = subtotal + total_gst (rounded to nearest integer).
# - Then convert total into `amount_in_words` field (e.g., "INR Twenty Seven Thousand Six Hundred Ninety One Only").

# If the `invoice.date` field is not provided by the user, use the `{today_date}` value as the default.
# {
# "intent":(create/edit/delete/query any one),
# "company": {
#         "name": "Chaurasiya pharma",
#         "address": "Shop No.2,Shiv Ashish Building,Star Complex Road,Opp Sai Mandir,Golani Phata,Vasai (East)",
#         "district": "Palghar-401208",
#         "mobile": "9664395486",
#         "phone": "",
#         "gstin": "27BEJPP4176E1Z9",
#         "state": "Maharashtra, Code : 27",
#         "contact": "+9011191086",
#         "email": "jkentpd15@gmail.com"
#     },
#     "invoice": {
#         "number": "JK0569/24-25",
#         "date": "{today_date}",
#         "delivery_note": " ",
#         "payment_terms": "",
#         "reference": "",
#         "other_references": "",
#         "buyer_order": "",
#         "buyer_order_date": "",
#         "dispatch_doc": "",
#         "delivery_date": "",
#         "dispatch_through": "",
#         "destination": "",
#         "terms_delivery": ""
#     },
#     "buyer": {
#         "name": "Prem Chaurasiya Pharma Equipments",
#         "address": "Opp Phase-2 Parmar Building Near Vasai Phata,\nVasai Dist.-Palghar",
#         "gstin": "27AHQPC7120E1ZK",
#         "state": "Maharashtra, Code : 27"
#     },
#     "items": [
#         {
#         "name": "Delrin Rod 20mm White Rod",
#         "hsn": "39169090",
#         "gst_rate": 18,
#         "quantity": 13.86,
#         "unit": "kg",
#         "rate": 380.00,
#         "amount": 5266.80
#         },
#         {
#         "name": "Caster Wheel Ss202",
#         "description": "3\\"I Red Pu Wheel Lock",
#         "hsn": "830220",
#         "gst_rate": 18,
#         "quantity": 26,
#         "unit": "pcs",
#         "rate": 400.00,
#         "amount": 10400.00
#         },
#         {
#         "name": "Caster Wheel Ss202",
#         "description": "3 I Red Pu Wheel Lock Mov",
#         "hsn": "830220",
#         "gst_rate": 18,
#         "quantity": 26,
#         "unit": "pcs",
#         "rate": 300.00,
#         "amount": 7800.00
#         }
#     ],
#     "amount_in_words": "INR Twenty Seven Thousand Six Hundred Ninety One Only",
#     "bank": {
#         "name": "Bank of Maharashtra",
#         "account": "60513819000",
#         "branch_ifsc": "Waliv Vasai(East) & MAHB0001718"
#     }
#     }

# User query: "{data}"
# """
#     data_str = json.dumps(data, ensure_ascii=False)
#     prompt = (
#         prompt_template
#         .replace("{data}", data_str)
#         .replace("{today_date}", today)
#     )

#     model = genai.GenerativeModel(
#         "gemini-1.5-flash",
#         generation_config={
#             "max_output_tokens": 2048,
#             "temperature": 0.3,
#             "top_p": 0.95,
#         }
#     )

#     # --- NEW: Retry logic with key switching ---
#     for _ in range(len(key_manager.keys)):
#         try:
#             response = model.generate_content(prompt)
#             print("Successfully generated content with API key index:", key_manager.current_key_index)
#             print(response)
#             return response.text
#         except Exception as e:
#             print(f"API call failed with key index {key_manager.current_key_index}. Error: {e}")
#             print("Switching to the next API key...")
#             if not key_manager.switch_to_next_key():
#                 # This means we've tried all keys and failed
#                 error_message = "All Gemini API keys have failed. Please check your keys and quotas."
#                 print(error_message)
#                 return json.dumps({"error": error_message})
    
#     # This part should ideally not be reached
#     final_error = "Failed to generate content after trying all available API keys."
#     print(final_error)
#     return json.dumps({"error": final_error})



import os
import json
from dotenv import load_dotenv
import google.generativeai as genai
from datetime import date

# Load environment variables from .env file
load_dotenv()

# --- Simplified Gemini API Configuration ---
try:
    api_key = os.getenv("GEMINI_API_KEY")
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
        "gemini-1.0-pro",
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