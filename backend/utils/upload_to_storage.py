import uuid
import os
from fastapi import UploadFile,HTTPException
from app.core.supabase import supabase
from utils.compress_image import compress_and_resize_image
from utils.compress_pdf import compress_pdf
import re
from starlette.datastructures import UploadFile as StarletteUploadFile

def sanitize_filename(name: str) -> str:
            # Replace slashes with dashes (or any safe char)
            return re.sub(r"[\/\\]", "-",name)

async def upload_file(file, folder: str, user_id: str, invoice_no: str = None):
    allowed_exts = ["pdf", "jpg", "jpeg", "png", "webp"]

    # Case 1: File is an UploadFile (from form/file upload)
    if isinstance(file, (UploadFile, StarletteUploadFile)):
        filename = file.filename
        file_ext = filename.split('.')[-1].lower()

        if file_ext not in allowed_exts:
            raise ValueError("Unsupported file format")

        if file_ext == "pdf":
            compressed_pdf = compress_pdf(file)
            sanitized_invoice_no = sanitize_filename(invoice_no)
            unique_filename = f"{user_id}/{sanitized_invoice_no}.pdf"
            content = compressed_pdf.read()
            content_type = "application/pdf"
            bucket = "invoices"
        else:
            compressed_data = compress_and_resize_image(file)
            original_name = os.path.splitext(file.filename)[0]
            sanitized_name = sanitize_filename(original_name)
            unique_filename = f"{folder}/{user_id}-{sanitized_name}.webp"
            content = compressed_data.read()
            content_type = "image/webp"
            bucket = "company-assets"

    # Case 2: File is a local PDF file path (used for generated PDFs)
    elif isinstance(file, str) and file.endswith(".pdf") and os.path.exists(file):
        with open(file, "rb") as f:
            content = f.read()
        
        
        sanitized_invoice_no = sanitize_filename(invoice_no)
        unique_filename = f"{user_id}/{sanitized_invoice_no}.pdf"
        content_type = "application/pdf"
        bucket = "invoices"

    else:
        raise ValueError("Unsupported file input")

    # Upload
    try:
        supabase.storage.from_(bucket).upload(
            unique_filename, content, {"content-type": content_type}
        )
    except Exception as e:
        if "The resource already exists" in str(e):
            raise HTTPException(status_code=409, detail="File already exists. Rename or change invoice number.")
        raise e

    public_url = supabase.storage.from_(bucket).get_public_url(unique_filename)
    return {"url": public_url, "filename": unique_filename}