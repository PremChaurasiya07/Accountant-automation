from PIL import Image
from io import BytesIO
from fastapi import UploadFile
import os

def compress_and_resize_image(file: UploadFile, max_size=(512, 512), quality=80) -> BytesIO:
    image = Image.open(file.file)
    image = image.convert("RGB")  # Ensure compatible format
    image.thumbnail(max_size)

    output = BytesIO()
    image.save(output, format='WEBP', quality=quality)
    output.seek(0)

    return output
