# app/tools/invoice_tools.py

import json
from app.models.state import ConversationState
from app.services.invoice_actions import (
    load_invoice_for_edit, create_invoice, update_invoice, get_next_invoice_number
)
from app.services.embedding import embed_and_store_invoice
from utils.semantic import semantic_search_and_answer
from num2words import num2words

def _transform_and_calculate(invoice_data: dict) -> dict:
    """Helper to calculate totals, GST, and amounts for a given invoice dictionary."""
    items_in = invoice_data.get("items", [])
    subtotal = sum((item.get("quantity", 0) or 0) * (item.get("rate", 0) or 0) for item in items_in)
    gst_rate_percent = 18
    total_gst = round(subtotal * (gst_rate_percent / 100), 2)
    total = round(subtotal + total_gst, 2)
    rupees, paise = divmod(total, 1)
    amount_words = f"{num2words(int(rupees), lang='en_IN').title()} Rupees"
    if paise > 0:
        amount_words += f" And {num2words(int(round(paise * 100)), lang='en_IN').title()} Paise"
    amount_words += " Only."
    invoice_data.update({
        "subtotal": subtotal, "total_gst": total_gst, "total": total,
        "amount_in_words": amount_words, "gst_rate": gst_rate_percent
    })
    return invoice_data

# --- REFACTORED TOOL DEFINITIONS ---

async def update_draft_invoice(state: ConversationState, updates: dict) -> dict:
    """
    Use this tool to add or modify details of an invoice that is currently being created or edited.
    The 'updates' argument should be a dictionary containing the new or changed fields.
    """
    if not state.draft_invoice:
        state.draft_invoice["invoice"] = {"number": await get_next_invoice_number(state.user_id)}
    
    for key, value in updates.items():
        if isinstance(value, dict) and key in state.draft_invoice:
            state.draft_invoice[key].update(value)
        else:
            state.draft_invoice[key] = value
            
    return {"status": "success", "data": {"message": "Draft updated."}}

async def finalize_invoice(state: ConversationState) -> dict:
    """
    Use this tool when the user confirms they want to save the final invoice.
    """
    if not state.draft_invoice or not state.draft_invoice.get("items"):
        return {"status": "error", "data": {"message": "Draft is empty or has no items."}}

    is_update = "id" in state.draft_invoice
    try:
        final_data = _transform_and_calculate(state.draft_invoice.copy())
        if is_update:
            result = await update_invoice(final_data["id"], final_data, state.user_id)
            message = f"Invoice {final_data['invoice']['number']} updated."
        else:
            result = await create_invoice(final_data, state.user_id, "temp1", final_data.get("invoice", {}).get("number"))
            message = "New invoice created."
        
        embed_and_store_invoice(result["invoice_id"], final_data)
        state.draft_invoice = {}  # Clear the draft
        return {"status": "success", "data": {"message": message, "url": result.get("url")}}
    except Exception as e:
        return {"status": "error", "data": {"message": f"Failed to finalize: {str(e)}"}}

async def load_existing_invoice(state: ConversationState, invoice_number: int) -> dict:
    """
    Use this tool when the user wants to edit a specific, existing invoice by providing its number.
    """
    try:
        invoice_to_edit = await load_invoice_for_edit(invoice_number, state.user_id)
        state.draft_invoice = invoice_to_edit
        return {"status": "success", "data": {"message": f"Loaded invoice {invoice_number} for editing."}}
    except Exception as e:
        return {"status": "error", "data": {"message": str(e)}}

async def query_existing_invoices(state: ConversationState, user_question: str) -> dict:
    """
    Use this tool to answer general questions about past invoices.
    """
    # Placeholder for your actual RAG implementation call
    # In a real scenario, you'd call semantic_search_and_answer here
    answer = f"This is the answer to your question about: '{user_question}'"
    return {"status": "success", "data": {"answer": answer}}

def reset_conversation(state: ConversationState) -> dict:
    """
    Use this tool when the user wants to discard the current draft and start over.
    """
    state.draft_invoice = {}
    state.chat_history = []
    return {"status": "success", "data": {"message": "State cleared."}}
