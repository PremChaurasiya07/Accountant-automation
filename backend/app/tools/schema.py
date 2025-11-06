# Create this new file: app/tools/schemas.py

from pydantic import BaseModel, Field
from typing import List, Optional, Literal, Union

# --- 1. Reusable Data Models ---
class ItemData(BaseModel):
    """A simple, reusable model for a single line item's data."""
    name: str = Field(..., description="Name of the item, e.g., 'chair'.")
    quantity: float = Field(..., description="Quantity of the item, e.g., 2.0.")
    rate: Optional[float] = Field(None, description="Rate per unit (Optional. If not provided, I will try to find it in your history/products).")
    unit: str = Field("pcs", description="Unit of the item, e.g., 'pcs' or 'kg'.")
    hsn: Optional[str] = Field(None, description="HSN code for the item.")
    gst_rate: Optional[float] = Field(None, description="GST rate for this item, e.g., 18.0.")
    description: Optional[str] = Field(None, description="An optional description for the item.")
    product_id: Optional[str] = Field(None, description="Optional: The UUID from the 'products' table this item is linked to for inventory.")

class GstUpdateCommand(BaseModel):
    """Defines a command to apply or remove GST from the *entire* invoice."""
    action: Literal["apply", "remove"] = Field(..., description="Action to perform on GST.")
    rate: float = Field(..., description="The GST rate to apply, e.g., 18.0.")
    apply_to_all_items: bool = Field(True, description="Whether to apply this GST to all items.")

class DiscountUpdateCommand(BaseModel):
    """Defines a command to apply or remove a discount from the *entire* invoice."""
    action: Literal["apply", "remove"]
    type: Literal["percentage", "fixed"]
    value: float
    scope: Literal["total"] = "total"

# --- 2. Models for Tool 1: Invoice Creation ---
class InvoiceCreateCommand(BaseModel):
    """
    This is the main payload the agent must construct for 'run_invoice_creation_workflow'.
    It passes *only* the information the user provides.
    """
    buyer_name: str = Field(..., description="The name of the buyer, e.g., 'Aatish Pharma Solutions'.")
    items: List[ItemData] = Field(..., description="A list of all items to add to the invoice.")
    gst: Optional[GstUpdateCommand] = Field(None, description="GST command, if user mentioned it (e.g., 'include 18% gst').")
    discount: Optional[DiscountUpdateCommand] = Field(None, description="Discount command, if user mentioned it.")
    date: Optional[str] = Field(None, description="Invoice date (YYYY-MM-DD), if specified. Defaults to today.")
    due_date: Optional[str] = Field(None, description="Invoice due date (YYYY-MM-DD), if specified.")

# --- 3. Models for Tool 2: Invoice Update ---
class ItemAddCommand(BaseModel):
    action: Literal["add"]
    item: ItemData = Field(..., description="The new item to add.")

class ItemRemoveCommand(BaseModel):
    action: Literal["remove"]
    identifier: str = Field(..., description="Name of the item to remove, e.g., 'chair'.")

class ItemPartialUpdateData(BaseModel):
    name: Optional[str] = Field(None, description="The new name for the item.")
    quantity: Optional[float] = Field(None, description="The new quantity.")
    rate: Optional[float] = Field(None, description="The new rate.")
    gst_rate: Optional[float] = Field(None, description="The new GST rate.")

class ItemUpdateCommand(BaseModel):
    action: Literal["update"]
    identifier: str = Field(..., description="Name of the item to update, e.g., 'chair'.")
    changes: ItemPartialUpdateData = Field(..., description="The specific fields to change.")

class InvoiceDetailsUpdateCommand(BaseModel):
    date: Optional[str] = Field(None, description="New invoice date (YYYY-MM-DD).")
    due_date: Optional[str] = Field(None, description="New due date (YYYY-MM-DD).")
    title: Optional[str] = Field(None, description="New title, e.g., 'Proforma Invoice'.")

class InvoiceUpdateCommands(BaseModel):
    """
    This is the main payload for the 'run_invoice_update_workflow' tool.
    It is a container for one or more commands to update an invoice.
    """
    gst: Optional[GstUpdateCommand] = Field(None, description="Command to update the invoice's overall GST.")
    discount: Optional[DiscountUpdateCommand] = Field(None, description="Command to update the invoice's overall discount.")
    details: Optional[InvoiceDetailsUpdateCommand] = Field(None, description="Command to update invoice details like due_date.")
    line_items: Optional[List[Union[ItemAddCommand, ItemUpdateCommand, ItemRemoveCommand]]] = Field(None, description="List of commands to add, remove, or update line items.")

# --- 4. Models for Tool 3: Buyer Update ---
class BuyerUpdateArgs(BaseModel):
    """A set of partial updates for a buyer. All fields are optional."""
    name: str = Field(..., description="The name of the buyer to update.") # Added name
    email: Optional[str] = Field(None, description="The new email address for the buyer.")
    phone_no: Optional[str] = Field(None, description="The new phone number for the buyer.")
    address: Optional[str] = Field(None, description="The new address for the buyer.")
    gstin: Optional[str] = Field(None, description="The new GSTIN for the buyer.")
    state: Optional[str] = Field(None, description="The new state for the buyer.")
    
# --- 5. Models for Low-Level Functions (Your existing models) ---
# These are used *internally* by your low-level helpers.
class CreateItem(BaseModel):
    name: str
    quantity: float
    rate: float
    unit: str
    hsn: Optional[str] = ""
    gst_rate: Optional[float] = 0
    description: Optional[str] = None # <-- ADDED
    product_id: Optional[str] = None  # <-- ADDED

class CreateBuyer(BaseModel):
    name: str
    address: str
    state: Optional[str] = ""
    gstin: Optional[str] = ""
    phone_no: Optional[str] = ""
    email: Optional[str] = ""

class CreateInvoiceDetails(BaseModel):
    number: str
    date: str
    due_date: str
    title: Optional[str] = "Tax Invoice"

class InvoiceCreateData(BaseModel):
    """The main payload the *low-level create_invoice* function expects."""
    invoice: CreateInvoiceDetails
    buyer: CreateBuyer
    items: List[CreateItem] # <-- This now uses the fixed CreateItem
    terms_and_conditions: Optional[List[str]] = []
    set_payment_reminder: Optional[bool] = False

class UpdateItem(BaseModel):
    id: Optional[int] = Field(None, description="ID of existing item. Leave None for new items.")
    name: Optional[str] = None
    quantity: Optional[float] = None
    rate: Optional[float] = None
    unit: Optional[str] = None
    hsn: Optional[str] = None
    gst_rate: Optional[float] = None
    delete: Optional[bool] = False
    description: Optional[str] = None # <-- ADDED
    product_id: Optional[str] = None  # <-- ADDED


class UpdateBuyer(BaseModel):
    name: str
    address: str
    state: Optional[str] = ""
    gstin: Optional[str] = ""
    phone_no: Optional[str] = ""
    email: Optional[str] = ""

class UpdateInvoiceDetails(BaseModel):
    id: int = Field(..., description="The database ID of the invoice to update.")
    number: str
    date: str
    due_date: str
    title: Optional[str] = "Tax Invoice"

class InvoiceUpdateData(BaseModel):
    """This is the main payload the *low-level update_invoice* function expects."""
    invoice: UpdateInvoiceDetails
    buyer: UpdateBuyer
    items: List[UpdateItem] # <-- This now uses the fixed UpdateItem
    terms_and_conditions: Optional[List[str]] = []
    set_payment_reminder: Optional[bool] = False