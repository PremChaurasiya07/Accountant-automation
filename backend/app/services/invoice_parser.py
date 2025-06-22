import os
import re
def parse_invoice(raw_invoice_data):
    """
    Parses raw invoice data to extract and format necessary details,
    especially handling numerical quantities robustly.

    Args:
        raw_invoice_data (dict): A dictionary containing raw invoice information.

    Returns:
        dict: A processed dictionary with extracted and formatted data,
              ready for PDF generation.
    """
    processed_data = raw_invoice_data.copy() # Work on a copy

    # Process product items to ensure quantities are numeric
    items = processed_data.get("product", [])
    processed_items = []
    for item in items:
        processed_item = item.copy() # Work on a copy of the item

        pcs = processed_item.get("pcs_or_weight")

        # Robustly extract numeric quantity
        qty_raw_str = ""
        if isinstance(pcs, (int, float)):
            qty_raw_str = str(pcs)
        elif pcs is not None:
            qty_raw_str = str(pcs)
        
        numeric_qty = 0.0
        qty_match = re.search(r'(\d+\.?\d*)', qty_raw_str)
        if qty_match:
            try:
                numeric_qty = float(qty_match.group(1))
            except ValueError:
                numeric_qty = 0.0
        
        processed_item["numeric_quantity"] = numeric_qty # Add a new key for numeric quantity
        
        # Ensure 'pcs_or_weight' is a string for consistent display in PDF if it contains units
        if not isinstance(processed_item.get("pcs_or_weight"), str):
            processed_item["pcs_or_weight"] = str(processed_item.get("pcs_or_weight", ""))

        # Ensure rate and base_price are floats
        processed_item["rate"] = float(processed_item.get("rate", 0.0))
        processed_item["base_price"] = float(processed_item.get("base_price", 0.0))

        processed_items.append(processed_item)
    
    processed_data["product"] = processed_items

    # Ensure other numeric fields are floats
    processed_data["packing_and_forwarding"] = float(processed_data.get("packing_and_forwarding", 0.0))
    processed_data["round_off"] = float(processed_data.get("round_off", 0.0))
    processed_data["cgst_rate"] = float(processed_data.get("cgst_rate", 0.09))
    processed_data["sgst_rate"] = float(processed_data.get("sgst_rate", 0.09))

    return processed_data