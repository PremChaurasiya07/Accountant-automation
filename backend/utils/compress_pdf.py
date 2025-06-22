import fitz  # PyMuPDF
from fastapi import UploadFile
from io import BytesIO

def compress_pdf(file: UploadFile) -> BytesIO:
    input_bytes = file.file.read()

    # Load into PyMuPDF
    doc = fitz.open(stream=input_bytes, filetype="pdf")

    # Save to BytesIO with compression
    output = BytesIO()
    doc.save(output, garbage=4, deflate=True, clean=True)
    doc.close()

    output.seek(0)
    return output
