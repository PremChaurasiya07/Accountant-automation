from fastapi import APIRouter, UploadFile, Form, File, HTTPException
from fastapi.responses import JSONResponse
from typing import Optional
import shutil
import os
import uuid
from app.core.supabase import supabase

router = APIRouter()

# Helper function to upload image to Supabase bucket
def upload_image_to_bucket(image: UploadFile, user_id: str):
    file_ext = image.filename.split(".")[-1].lower()
    allowed_exts = ["jpg", "jpeg", "png", "webp"]

    if file_ext not in allowed_exts:
        raise HTTPException(status_code=400, detail="Invalid image format")

    # Create unique filename
    filename = f"{user_id}_{uuid.uuid4()}.{file_ext}"
    bucket_name = "product-images"

    # Read file content
    content = image.file.read()

    # Upload to Supabase
    try:
        supabase.storage.from_(bucket_name).upload(
            path=filename,
            file=content,
            file_options={"content-type": f"image/{file_ext}"}
          
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Image upload failed: {str(e)}")

    public_url = supabase.storage.from_(bucket_name).get_public_url(filename)
    return public_url


@router.post("/add-product")
async def add_product(
    name: str = Form(...),
    description: Optional[str] = Form(None),
    hsn: Optional[str] = Form(None),
    gst: Optional[float] = Form(None),
    rate: Optional[float] = Form(None),
    stock: Optional[int] = Form(None),
    unit: Optional[str] = Form(None),
    alertStock: Optional[int] = Form(None),
    user_id: str = Form(...),
    image: Optional[UploadFile] = File(None),
):
    try:
        image_url = None
        if image:
            image_url = upload_image_to_bucket(image, user_id)

        # Prepare product data
        product_data = {
            "name": name,
            "description": description,
            "hsn": hsn,
            "gst": gst,
            "rate": rate,
            "stock": stock,
            "unit": unit,
            "alert_stock": alertStock,
            "image_url": image_url,
            "user_id": user_id,
        }

        # Insert into Supabase
        insert_response = supabase.from_("products").insert(product_data).execute()

        if hasattr(insert_response, "error") and insert_response.error:
            raise HTTPException(status_code=500, detail=str(insert_response.error))

        return JSONResponse(content={"message": "Product added", "product": product_data})

    except Exception as e:
        print("⚠️ Error while adding product:", str(e))
        raise HTTPException(status_code=500, detail=str(e))
