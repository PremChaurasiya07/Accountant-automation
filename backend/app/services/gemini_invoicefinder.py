import os, json, re
from dotenv import load_dotenv
from datetime import date
import google.generativeai as genai

load_dotenv()
genai.configure(api_key=os.environ["GEMINI_API_KEY2"])



today = date.today().isoformat()

def gemini(data):

    data_str = json.dumps(data, ensure_ascii=False)
    prompt = data.replace("{data}", data_str)

    model = genai.GenerativeModel(
        "gemini-1.5-flash",
        generation_config={
            "max_output_tokens": 1024,
            "temperature": 0.3,
            "top_p": 0.9,
        },
    )

    response = model.generate_content(prompt)
    raw_response = response.text.strip()
    print("Gemini raw response:", raw_response)
    return raw_response
