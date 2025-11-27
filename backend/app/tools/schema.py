from typing import List, Optional, Literal, Any
from pydantic import BaseModel, Field, model_validator

# --- SHARED ITEM MODEL ---

class InvoiceItem(BaseModel):
    name: str = Field(..., description="Name of the product or service")
    quantity: float = Field(default=1.0, description="Quantity of the item")
    # Agent often confuses rate/price. We handle this via validator.
    rate: Optional[float] = Field(default=0.0, description="Unit price/rate.") 
    gst_rate: Optional[float] = Field(default=0.0, description="GST percentage (e.g. 18).")
    hsn: Optional[str] = Field(default=None, description="HSN Code.")
    unit: Optional[str] = Field(default="pcs", description="Unit (e.g. kg, pcs).")
    description: Optional[str] = Field(default="", description="Item description.")

    @model_validator(mode='before')
    @classmethod
    def map_price_to_rate(cls, data: Any) -> Any:
        """Fix common AI hallucination: using 'price' instead of 'rate'"""
        if isinstance(data, dict):
            if 'price' in data and ('rate' not in data or data['rate'] == 0):
                data['rate'] = data.pop('price')
            
            # Handle 'gst' vs 'gst_rate'
            if 'gst' in data and 'gst_rate' not in data:
                data['gst_rate'] = data.pop('gst')
        return data

# --- INVOICE CREATION MODELS ---

class InvoiceCreateCommand(BaseModel):
    buyer_name: str = Field(..., description="Name of the buyer")
    items: List[InvoiceItem] = Field(..., description="List of items")
    date: Optional[str] = Field(default=None, description="Invoice Date (YYYY-MM-DD)")
    due_date: Optional[str] = Field(default=None, description="Due Date (YYYY-MM-DD)")

# --- INVOICE UPDATE MODELS ---

class UpdateItemAction(BaseModel):
    action: Literal['add', 'update', 'remove'] = Field(..., description="Action to perform")
    identifier: Optional[str] = Field(default=None, description="Item name to update/remove")
    item: Optional[InvoiceItem] = Field(default=None, description="New item details (for add)")
    changes: Optional[InvoiceItem] = Field(default=None, description="Changes (for update)")

    @model_validator(mode='after')
    def smart_consolidate(self):
        """
        Fix AI structural errors in Update actions.
        If AI sends 'item' for an update (instead of 'changes'), fix it.
        """
        # Case: Update action, but AI put data in 'item' instead of 'changes'
        if self.action == 'update':
            if not self.changes and self.item:
                self.changes = self.item
            
            # Case: Identifier missing, but Name is present in changes
            if not self.identifier and self.changes and self.changes.name:
                self.identifier = self.changes.name
        
        # Case: Remove action, missing identifier but has item
        if self.action == 'remove' and not self.identifier and self.item:
             self.identifier = self.item.name
             
        return self

class GstUpdate(BaseModel):
    action: Literal['apply', 'remove']
    rate: float

class InvoiceDetailsUpdate(BaseModel):
    date: Optional[str] = None
    due_date: Optional[str] = None

class InvoiceUpdateCommands(BaseModel):
    line_items: Optional[List[UpdateItemAction]] = Field(default=None)
    gst: Optional[GstUpdate] = Field(default=None)
    details: Optional[InvoiceDetailsUpdate] = Field(default=None)

# --- INTERNAL MODELS (DB/PDF) ---

class CreateItem(BaseModel):
    name: str
    quantity: float
    rate: float
    gst_rate: float
    hsn: str
    unit: str
    description: str
    product_id: Optional[str] = None

class CreateBuyer(BaseModel):
    id: int
    name: str
    address: str
    state: Optional[str] = None
    gstin: Optional[str] = None
    phone_no: Optional[str] = None
    email: Optional[str] = None

class CreateInvoiceDetails(BaseModel):
    number: str
    date: str
    due_date: str

class InvoiceCreateData(BaseModel):
    invoice: CreateInvoiceDetails
    buyer: CreateBuyer
    items: List[CreateItem]

class UpdateItem(BaseModel):
    id: Optional[int] = None
    name: str
    quantity: float
    rate: float
    gst_rate: float
    hsn: Optional[str] = ""
    unit: str = "pcs"
    description: str = ""
    delete: Optional[bool] = False
    product_id: Optional[str] = None

class UpdateBuyer(BaseModel):
    name: str
    address: str
    state: Optional[str]
    gstin: Optional[str]
    phone_no: Optional[str]
    email: Optional[str]

class UpdateInvoiceDetails(BaseModel):
    id: int
    number: str
    date: str
    due_date: str
    title: str

class InvoiceUpdateData(BaseModel):
    invoice: UpdateInvoiceDetails
    buyer: UpdateBuyer
    items: List[UpdateItem]

class BuyerUpdateArgs(BaseModel):
    name: str
    email: Optional[str] = None
    phone_no: Optional[str] = None
    address: Optional[str] = None
    gstin: Optional[str] = None