# import os
# import requests
# from io import BytesIO
# from reportlab.lib import colors
# from reportlab.lib.pagesizes import A4
# from reportlab.lib.units import mm
# from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, Image, PageBreak
# from reportlab.lib.styles import ParagraphStyle
# from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT

# # --- HELPER FUNCTIONS ---
# def safe_get(data_dict, key, default=''):
#     """Safely get a value from a nested dictionary."""
#     keys = key.split('.')
#     val = data_dict
#     for k in keys:
#         if isinstance(val, dict):
#             val = val.get(k, default)
#         else:
#             return default
#     return val or default

# def get_image_from_url(url, width, height):
#     """Downloads an image from a URL and returns a ReportLab Image object."""
#     if not url: return Spacer(width, height)
#     try:
#         response = requests.get(url, stream=True)
#         if response.status_code == 200:
#             image_data = BytesIO(response.content)
#             return Image(image_data, width=width, height=height)
#     except Exception as e:
#         print(f"Warning: Could not fetch image from {url}. Error: {e}")
#     return Spacer(width, height)

# def number_to_words_indian(num):
#     if num is None or num == 0: return 'Zero'
#     num = int(num)
#     units = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine']
#     teens = ['', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen']
#     tens = ['', 'Ten', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety']
#     def convert_less_than_thousand(n):
#         if n == 0: return ''
#         if n < 10: return units[n]
#         if n < 20: return teens[n - 10]
#         if n < 100: return tens[n // 10] + (' ' + units[n % 10] if n % 10 != 0 else '')
#         return units[n // 100] + ' Hundred' + (' ' + convert_less_than_thousand(n % 100) if n % 100 != 0 else '')
#     words = []
#     if num // 10000000 > 0: words.append(convert_less_than_thousand(num // 10000000) + ' Crore'); num %= 10000000
#     if num // 100000 > 0: words.append(convert_less_than_thousand(num // 100000) + ' Lakh'); num %= 100000
#     if num // 1000 > 0: words.append(convert_less_than_thousand(num // 1000) + ' Thousand'); num %= 1000
#     if num > 0: words.append(convert_less_than_thousand(num))
#     return ' '.join(filter(None, words))

# def add_footer_with_link(canvas, doc):
#     canvas.saveState()
#     style = ParagraphStyle(
#         name='FooterLink', fontName='Helvetica', fontSize=8,
#         textColor=colors.black, alignment=TA_RIGHT
#     )
#     link_text = '<a href="https://vyapari.vercel.app/">Created using VYAPARI AI</a>'
#     p = Paragraph(link_text, style)
#     p.wrapOn(canvas, doc.width, doc.bottomMargin)
#     p.drawOn(canvas, doc.leftMargin, doc.bottomMargin - 7*mm)
#     canvas.restoreState()

# # ==============================================================================
# # HELPER FUNCTION TO GENERATE A SINGLE INVOICE PAGE
# # ==============================================================================
# def _generate_page_flowables(invoice_data, copy_label=""):
#     doc_width, doc_height = A4
    
#     style = ParagraphStyle(name='Normal', fontName='Helvetica', fontSize=9, leading=11)
#     style_centered = ParagraphStyle(name='Centered', parent=style, alignment=TA_CENTER)
#     style_bold_header = ParagraphStyle(name='NormalBoldMain', fontName='Helvetica-Bold', fontSize=8, leading=9.5)
#     style_table_header = ParagraphStyle(name='TableHeaderCell', fontName='Helvetica-Bold', fontSize=8, leading=9.5, alignment=TA_CENTER, textColor=colors.black)
#     style_amount_words = ParagraphStyle(name='AmountWordsBold', fontName='Helvetica-Bold', fontSize=11, leading=11, alignment=TA_CENTER)
#     style_total_label = ParagraphStyle(name='TotalLabel', fontName='Helvetica-Bold', fontSize=9, leading=11, alignment=TA_LEFT, textColor=colors.black)
#     style_total_value = ParagraphStyle(name='TotalValue', fontName='Helvetica-Bold', fontSize=9, leading=11, alignment=TA_RIGHT, textColor=colors.black)
#     # Give text a small indent, but not the table cell itself
#     style_invoice_details = ParagraphStyle(name='InvoiceDetails', parent=style, leftIndent=2*mm)

#     col_width_srno=15*mm; col_width_desc=78*mm; col_width_hsn=22*mm
#     col_width_qty=22*mm; col_width_unitprice=24*mm; col_width_amount=25*mm
    
#     sub_total = sum(float(item.get('quantity', 0)) * float(item.get('rate', 0)) for item in safe_get(invoice_data, 'items', []))
#     total_gst = sum(float(item.get('quantity', 0)) * float(item.get('rate', 0)) * (float(item.get('gst_rate', 0)) / 100) for item in safe_get(invoice_data, 'items', []))
#     grand_total = sub_total + total_gst
#     amount_in_words = f"Rupees {number_to_words_indian(grand_total)} Only"

#     invoice_title = safe_get(invoice_data, 'invoice.title', 'Invoice')
#     tax_invoice_bar_content = Paragraph(invoice_title, ParagraphStyle(name='TaxInvoiceTitle', fontName='Helvetica-Bold', fontSize=9, alignment=TA_CENTER, textColor=colors.black))
#     tax_invoice_bar = Table([[tax_invoice_bar_content]], colWidths=[doc_width - 24*mm])
#     tax_invoice_bar.setStyle(TableStyle([
#         ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#9ac1e6')),
#         ('TOPPADDING', (0,0), (-1,-1), 2), ('BOTTOMPADDING', (0,0), (-1,-1), 2),
#     ]))

#     # --- Header Section based on User's new design ---
#     logo_image = get_image_from_url(safe_get(invoice_data, 'company.logo_url'), width=40*mm, height=18*mm)
#     copy_label_para = Paragraph(copy_label, style_centered)

#     company_lines = [f"<font size=12><b>{safe_get(invoice_data, 'company.name')}</b></font>"]
#     if address := safe_get(invoice_data, 'company.address'): company_lines.append(f"<b>Address:</b> {address}")
#     if contact := safe_get(invoice_data, 'company.contact'): company_lines.append(f"<b>Phone:</b> {contact}")
#     if email := safe_get(invoice_data, 'company.email'): company_lines.append(f"<b>Email:</b> {email}")
#     if gstin := safe_get(invoice_data, 'company.gstin'): company_lines.append(f"<b>GSTIN:</b> {gstin}")
#     company_text = "<br/>".join(company_lines)
#     company_details_para = Paragraph(company_text, ParagraphStyle(name='CompanyDetailsStyle', fontName='Helvetica', fontSize=8, leading=9.5, leftIndent=4*mm))

#     invoice_details_data = [
#         [Paragraph('Bill Date:', style_invoice_details), Paragraph(safe_get(invoice_data, 'invoice.date'), style_invoice_details)],
#         [Paragraph('Invoice No.', style_invoice_details), Paragraph(safe_get(invoice_data, 'invoice.number'), style_invoice_details)],
#         [Paragraph('PO No.', style_invoice_details), Paragraph(safe_get(invoice_data, 'invoice.po_number', ''), style_invoice_details)]
#     ]
    
#     invoice_details_table = Table(invoice_details_data, colWidths=[23*mm, 70*mm])
#     # FIX: Removed all internal padding to ensure the grid lines are flush
#     invoice_details_table.setStyle(TableStyle([
#         ('GRID', (0,0), (-1,-1), 1, colors.black), 
#         ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
#         ('TOPPADDING', (0,0), (-1,-1), 1.5*mm), # Add vertical padding for aesthetics
#         ('BOTTOMPADDING', (0,0), (-1,-1), 1.5*mm)
#     ]))

#     upper_header_table = Table([[logo_image, company_details_para]], colWidths=[93*mm, 93*mm])
#     upper_header_table.setStyle(TableStyle([
#         ('VALIGN', (0,0), (-1,-1), 'TOP'),
#         ('ALIGN', (0,0), (0,0), 'CENTER'),
#         ('LINEAFTER', (0,0), (0,0), 1, colors.black),
#         ('TOPPADDING', (0,0), (0,0), 2),
#     ]))

#     lower_header_table = Table([[copy_label_para, invoice_details_table]], colWidths=[93*mm, 93*mm])
#     lower_header_table.setStyle(TableStyle([
#         ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
#         ('LINEAFTER', (0,0), (0,0), 1, colors.black),
#         # FIX: Remove all padding from the container cell to ensure a perfect fit
#         ('LEFTPADDING', (0,0), (-1,-1), 0),
#         ('RIGHTPADDING', (0,0), (-1,-1), 0),
#         ('TOPPADDING', (0,0), (-1,-1), 0),
#         ('BOTTOMPADDING', (0,0), (-1,-1), 0),
#     ]))

#     main_header_section = Table([[upper_header_table], [lower_header_table]], colWidths=[186*mm])
#     main_header_section.setStyle(TableStyle([
#         ('LEFTPADDING', (0,0), (-1,-1), 0), ('RIGHTPADDING', (0,0), (-1,-1), 0),
#         ('TOPPADDING', (0,0), (-1,-1), 0), ('BOTTOMPADDING', (0,0), (-1,-1), 0),
#         ('LINEBELOW', (0,0), (0,0), 1, colors.black)
#     ]))
    
#     # --- Billing and Delivery Address Section ---
#     col_width_addr = (doc_width - 24*mm) / 2
#     bill_to_header = Paragraph(f"<b>Bill To: {safe_get(invoice_data, 'buyer.name')}</b>", style_bold_header)
#     bill_to_lines = []
#     if address := safe_get(invoice_data, 'buyer.address'): bill_to_lines.append(f"<b>Address:</b> {address}")
#     if phone := safe_get(invoice_data, 'buyer.phone_no'): bill_to_lines.append(f"<b>Phone:</b> {phone}")
#     if email := safe_get(invoice_data, 'buyer.email'): bill_to_lines.append(f"<b>Email:</b> {email}")
#     if gstin := safe_get(invoice_data, 'buyer.gstin'): bill_to_lines.append(f"<b>GSTIN:</b> {gstin}")
#     bill_to_content = Paragraph("<br/>".join(bill_to_lines), style)

#     delivery_header = Paragraph("<b>Delivery Address:</b>", style_bold_header)
#     delivery_lines = []
#     if address := safe_get(invoice_data, 'delivery.address', safe_get(invoice_data, 'buyer.address')): delivery_lines.append(f"<b>Address:</b> {address}")
#     if phone := safe_get(invoice_data, 'delivery.phone_no', safe_get(invoice_data, 'buyer.phone_no')): delivery_lines.append(f"<b>Phone:</b> {phone}")
#     if email := safe_get(invoice_data, 'delivery.email', safe_get(invoice_data, 'buyer.email')): delivery_lines.append(f"<b>Email:</b> {email}")
#     if gstin := safe_get(invoice_data, 'delivery.gstin', safe_get(invoice_data, 'buyer.gstin')): delivery_lines.append(f"<b>GSTIN:</b> {gstin}")
#     delivery_to_content = Paragraph("<br/>".join(delivery_lines), style)

#     address_data = [[bill_to_header, delivery_header], [bill_to_content, delivery_to_content]]
#     address_section = Table(address_data, colWidths=[col_width_addr, col_width_addr])
#     address_section.setStyle(TableStyle([('VALIGN', (0,0), (-1,-1), 'TOP'), ('LINEAFTER', (0,0), (0,1), 1, colors.black), ('PADDING', (0,0), (-1,-1), 4), ('LEFTPADDING', (0,0), (0,0), 5), ('LINEBELOW', (0,0), (-1,0), 1, colors.black)]))

#     # --- Items Table and Footer Sections ---
#     items_header = [Paragraph(h, style_table_header) for h in ['Sr. No.', 'Description', 'HSN', 'Quantity', 'Unit Price', 'Amount']]
#     item_rows = []
#     for i, item in enumerate(safe_get(invoice_data, 'items', []), 1):
#         qty = float(item.get('quantity', 0)); rate = float(item.get('rate', 0)); amount = qty * rate
#         row = [str(i), Paragraph(safe_get(item, 'name'), style), safe_get(item, 'hsn'), str(qty), f"{rate:,.2f}", f"{amount:,.2f}"]
#         item_rows.append(row)
#     num_empty_rows = 16 - len(item_rows)
#     for _ in range(num_empty_rows): item_rows.append(['', '', '', '', '', ''])
    
#     items_data = [items_header] + item_rows
#     items_col_widths = [col_width_srno, col_width_desc, col_width_hsn, col_width_qty, col_width_unitprice, col_width_amount]
#     items_section = Table(items_data, colWidths=items_col_widths)
#     items_section.setStyle(TableStyle([
#         ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#9ac1e6')), ('TEXTCOLOR', (0,0), (-1,0), colors.black),
#         ('VALIGN', (0,0), (-1,-1), 'MIDDLE'), ('ALIGN', (0,1), (0,-1), 'CENTER'),
#         ('ALIGN', (2,1), (4,-1), 'CENTER'), ('ALIGN', (5,1), (5,-1), 'RIGHT'),
#         ('BOX', (0,0), (-1,-1), 1, colors.black), ('LINEBELOW', (0,0), (-1,0), 1, colors.black),
#         ('LINEAFTER', (0,0), (0,-1), 1, colors.black), ('LINEAFTER', (1,0), (1,-1), 1, colors.black),
#         ('LINEAFTER', (2,0), (2,-1), 1, colors.black), ('LINEAFTER', (3,0), (3,-1), 1, colors.black),
#         ('LINEAFTER', (4,0), (4,-1), 1, colors.black),
#     ]))

#     left_footer_width = col_width_srno + col_width_desc + col_width_hsn
#     amount_words_block = Table([[Paragraph("Amount in words", style)], [Paragraph(f"<b>{amount_in_words}</b>", style_amount_words)]], colWidths=[left_footer_width])
#     amount_words_block.setStyle(TableStyle([('LEFTPADDING', (0,0), (-1,-1), 2*mm), ('BOTTOMPADDING', (0,0), (-1,-1), 4*mm)]))
#     bank_lines = ["<b>Bank Details :</b>"]
#     if name := safe_get(invoice_data, 'bank.name'): bank_lines.append(f"<b>Bank Name:</b> {name}")
#     if account := safe_get(invoice_data, 'bank.account'): bank_lines.append(f"<b>Bank A/C No.:</b> {account}")
#     if ifsc := safe_get(invoice_data, 'bank.branch_ifsc'): bank_lines.append(f"<b>IFS Code:</b> {ifsc}")
#     bank_lines.append(f"<b>Branch:</b> {safe_get(invoice_data, 'bank.branch', '')}")
#     bank_text = "<br/>".join(bank_lines)
#     bank_details_para = Paragraph(bank_text, style)
#     bank_details_block = Table([[bank_details_para]], colWidths=[left_footer_width], style=TableStyle([('BOX', (0,0), (-1,-1), 1, colors.black), ('PADDING', (0,0), (-1,-1), 4)]))
#     left_footer_content = Table([[amount_words_block], [bank_details_block]], colWidths=[left_footer_width], rowHeights=[18*mm, 28*mm])
#     left_footer_content.setStyle(TableStyle([('LEFTPADDING', (0,0), (-1,-1), 0),('RIGHTPADDING', (0,0), (-1,-1), 0),('TOPPADDING', (0,0), (-1,-1), 0),('BOTTOMPADDING', (0,0), (-1,-1), 0)]))
#     company_state = safe_get(invoice_data, 'company.state', '').strip().lower()
#     buyer_state = safe_get(invoice_data, 'buyer.state', '').strip().lower()
#     is_interstate = company_state != buyer_state
#     igst_val, cgst_val, sgst_val = (total_gst, 0, 0) if is_interstate else (0, total_gst / 2, total_gst / 2)
#     total_gst_rate = 0; items = safe_get(invoice_data, 'items', [])
#     if items: total_gst_rate = float(items[0].get('gst_rate', 0))
#     cgst_rate_label = sgst_rate_label = igst_rate_label = ''
#     if total_gst_rate > 0:
#         if is_interstate: igst_rate_label = Paragraph(f"<b>{total_gst_rate}%</b>", style)
#         else:
#             half_rate = total_gst_rate / 2
#             formatted_half_rate = f"{int(half_rate)}" if half_rate == int(half_rate) else f"{half_rate}"
#             cgst_rate_label = Paragraph(f"<b>{formatted_half_rate}%</b>", style)
#             sgst_rate_label = Paragraph(f"<b>{formatted_half_rate}%</b>", style)
#     right_footer_width = col_width_qty + col_width_unitprice + col_width_amount + 2.1*mm
#     totals_col_widths = [22*mm, 24*mm, 25*mm]
#     totals_data = [
#         ['', Paragraph('Sub Total', style), Paragraph(f"{sub_total:,.2f}", style)],
#         [cgst_rate_label, Paragraph('CGST', style), Paragraph(f"{cgst_val:,.2f}", style)],
#         [sgst_rate_label, Paragraph('SGST', style), Paragraph(f"{sgst_val:,.2f}", style)],
#         [igst_rate_label, Paragraph('IGST', style), Paragraph(f"{igst_val:,.2f}", style)],
#         ['', Paragraph('Total', style_total_label), Paragraph(f"{grand_total:,.2f}", style_total_value)]
#     ]
#     totals_table = Table(totals_data, colWidths=totals_col_widths, rowHeights=[5.1*mm]*5)
#     totals_table.setStyle(TableStyle([('GRID', (0,0), (-1,-1), 1, colors.black), ('ALIGN', (0,0), (-1,-1), 'RIGHT'), ('ALIGN', (1,0), (1,-1), 'LEFT'), ('VALIGN', (0,0), (-1,-1), 'MIDDLE'), ('BACKGROUND', (0,0), (-1,-2), colors.HexColor('#D9E1F2')), ('BACKGROUND', (0,-1), (-1,-1), colors.HexColor('#9ac1e6')), ('TEXTCOLOR', (0,-1), (-1,-1), colors.black)]))
#     signature_image = get_image_from_url(safe_get(invoice_data, 'company.sign_url'), width=35*mm, height=12*mm)
#     signature_block = Table([[signature_image], [Paragraph(f"For {safe_get(invoice_data, 'company.name')}", style_centered)]], rowHeights=[14*mm, 6*mm])
#     signature_block.setStyle(TableStyle([('ALIGN', (0,0), (-1,-1), 'CENTER')]))
#     right_footer_content = Table([[totals_table], [Spacer(1, 2*mm)], [signature_block]], rowHeights=[26.6*mm, 1.5*mm, 20*mm])
#     right_footer_content.setStyle(TableStyle([('ALIGN', (0,0), (-1,-1), 'RIGHT')]))
#     footer_section = Table([[left_footer_content, right_footer_content]], colWidths=[left_footer_width, right_footer_width])
#     footer_section.setStyle(TableStyle([('VALIGN', (0,0), (-1,-1), 'BOTTOM'), ('LEFTPADDING', (0,0), (-1,-1), 0), ('RIGHTPADDING', (0,0), (-1,-1), 0), ('TOPPADDING', (0,0), (-1,-1), 0), ('BOTTOMPADDING', (0,0), (-1,-1), 0)]))
    
#     # --- Final Assembly ---
#     master_table_data = [
#         [tax_invoice_bar], [main_header_section], [address_section], [items_section], [footer_section]
#     ]
#     master_table = Table(master_table_data, colWidths=[doc_width - 24*mm])
#     master_table.setStyle(TableStyle([
#         ('BOX', (0,0), (-1,-1), 1, colors.black), ('LEFTPADDING', (0,0), (-1,-1), 0), ('RIGHTPADDING', (0,0), (-1,-1), 0), 
#         ('TOPPADDING', (0,0), (-1,-1), 0), ('BOTTOMPADDING', (0,0), (-1,-1), 0), ('LINEBELOW', (0,1), (0,1), 1, colors.black), 
#         ('LINEBELOW', (0,2), (0,2), 1, colors.black), ('LINEABOVE', (0,4), (-1,4), 1, colors.black)
#     ]))
    
#     return [master_table]

# # ==============================================================================
# # MAIN INVOICE FUNCTION
# # ==============================================================================
# def create_dynamic_invoice(invoice_data, filename="invoice_dynamic.pdf"):
#     doc = SimpleDocTemplate(filename, pagesize=A4, leftMargin=12*mm, rightMargin=12*mm, topMargin=10*mm, bottomMargin=10*mm)
#     master_story = []
#     copy_labels = []

#     if safe_get(invoice_data, 'generate_copies', False):
#         copy_labels = ["ORIGINAL FOR RECIPIENT", "DUPLICATE COPY", "TRIPLICATE COPY"]
#     else:
#         copy_labels = ["ORIGINAL FOR RECIPIENT"]

#     for i, label in enumerate(copy_labels):
#         page_flowables = _generate_page_flowables(invoice_data, copy_label=label)
#         master_story.extend(page_flowables)
#         if i < len(copy_labels) - 1:
#             master_story.append(PageBreak())
            
#     doc.build(master_story, onFirstPage=add_footer_with_link, onLaterPages=add_footer_with_link)
#     print(f"✅ Successfully created dynamic invoice: {filename}")
#     return filename

# # ==============================================================================
# # EXAMPLE USAGE
# # ==============================================================================
# if __name__ == '__main__':
#     payload = {
#         "invoice": { "title": "Tax Invoice", "number": "CEW/24-25/797", "date": "22-01-2025", "po_number": "PO2024-00101001"},
#         "company": { 
#             "name": "Chaurasiya Engineering Works", 
#             "address": "Parmar Industrial Estate, Vasai - (E), Palghar - 401208. A very long second line in the company address to demonstrate the dynamic height adjustment.", 
#             "state": "Maharashtra", 
#             "contact": "+91 99308 62568", "email": "ceworks79@gmail.com", "gstin": "27AGCPC6212E1Z1",
#             "sign_url": "https://i.ibb.co/7N8bS2Z/signature-image.png"
#         },
#         "buyer": { "name": "Dhongadi Engineering", "address": "2/1, 1st Floor, R.E. Nagar, Chennai.", "state": "Tamil Nadu", "phone_no": "+91 98849 79422", "email": "suresh@dhongadiengineering.com", "gstin": "33AIOEPD9487Q1Z8"},
#         "items": [
#             {"name": "SS BOX WITH SNAP LOCK<br/>MATERIAL GRADE: SS304", "hsn": "7326", "quantity": 5, "rate": 3600, "gst_rate": 18},
#         ],
#         "bank": { "name": "SVC Cooperative Bank Limited", "account": "101704180001638", "branch_ifsc": "SVCB0000017", "branch": "Mahakali Caves Road"},
#         "generate_copies": False
#     }
#     create_dynamic_invoice(payload, filename="final_invoice_final_fix.pdf")



import os
import requests
from io import BytesIO
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, Image, PageBreak
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT

# --- HELPER FUNCTIONS ---
def safe_get(data_dict, key, default=''):
    """Safely get a value from a nested dictionary."""
    keys = key.split('.')
    val = data_dict
    for k in keys:
        if isinstance(val, dict):
            val = val.get(k, default)
        else:
            return default
    return val or default

def get_image_from_url(url, width, height):
    """Downloads an image from a URL and returns a ReportLab Image object."""
    if not url: return Spacer(width, height)
    try:
        response = requests.get(url, stream=True)
        if response.status_code == 200:
            image_data = BytesIO(response.content)
            return Image(image_data, width=width, height=height)
    except Exception as e:
        print(f"Warning: Could not fetch image from {url}. Error: {e}")
    return Spacer(width, height)

def number_to_words_indian(num):
    if num is None or num == 0: return 'Zero'
    num = int(num)
    units = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine']
    teens = ['', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen']
    tens = ['', 'Ten', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety']
    def convert_less_than_thousand(n):
        if n == 0: return ''
        if n < 10: return units[n]
        if n < 20: return teens[n - 10]
        if n < 100: return tens[n // 10] + (' ' + units[n % 10] if n % 10 != 0 else '')
        return units[n // 100] + ' Hundred' + (' ' + convert_less_than_thousand(n % 100) if n % 100 != 0 else '')
    words = []
    if num // 10000000 > 0: words.append(convert_less_than_thousand(num // 10000000) + ' Crore'); num %= 10000000
    if num // 100000 > 0: words.append(convert_less_than_thousand(num // 100000) + ' Lakh'); num %= 100000
    if num // 1000 > 0: words.append(convert_less_than_thousand(num // 1000) + ' Thousand'); num %= 1000
    if num > 0: words.append(convert_less_than_thousand(num))
    return ' '.join(filter(None, words))

def add_footer_with_link(canvas, doc):
    canvas.saveState()
    style = ParagraphStyle(
        name='FooterLink', fontName='Helvetica', fontSize=8,
        textColor=colors.black, alignment=TA_RIGHT
    )
    link_text = '<a href="https://vyapari.vercel.app/">Created using VYAPARI AI</a>'
    p = Paragraph(link_text, style)
    p.wrapOn(canvas, doc.width, doc.bottomMargin)
    p.drawOn(canvas, doc.leftMargin, doc.bottomMargin - 7*mm)
    canvas.restoreState()

# ==============================================================================
# HELPER FUNCTION TO GENERATE A SINGLE INVOICE PAGE
# ==============================================================================
def _generate_page_flowables(invoice_data, copy_label=""):
    doc_width, doc_height = A4
    
    style = ParagraphStyle(name='Normal', fontName='Helvetica', fontSize=9, leading=11)
    style_centered = ParagraphStyle(name='Centered', parent=style, alignment=TA_CENTER)
    style_bold_header = ParagraphStyle(name='NormalBoldMain', fontName='Helvetica-Bold', fontSize=8, leading=9.5)
    style_table_header = ParagraphStyle(name='TableHeaderCell', fontName='Helvetica-Bold', fontSize=8, leading=9.5, alignment=TA_CENTER, textColor=colors.black)
    style_amount_words = ParagraphStyle(name='AmountWordsBold', fontName='Helvetica-Bold', fontSize=11, leading=11, alignment=TA_CENTER)
    style_total_label = ParagraphStyle(name='TotalLabel', fontName='Helvetica-Bold', fontSize=9, leading=11, alignment=TA_LEFT, textColor=colors.black)
    style_total_value = ParagraphStyle(name='TotalValue', fontName='Helvetica-Bold', fontSize=9, leading=11, alignment=TA_RIGHT, textColor=colors.black)
    style_invoice_details = ParagraphStyle(name='InvoiceDetails', parent=style, leftIndent=2*mm)

    # --- COLUMN WIDTHS ---
    col_width_srno=13*mm
    col_width_desc=60*mm
    col_width_hsn=20*mm
    col_width_gst=21*mm 
    col_width_qty=22*mm
    col_width_unitprice=24*mm
    col_width_amount=26*mm
    
    # --- CALCULATIONS ---
    company_state = safe_get(invoice_data, 'company.state', '').strip().lower()
    buyer_state = safe_get(invoice_data, 'buyer.state', '').strip().lower()
    is_interstate = (company_state and buyer_state) and (company_state != buyer_state)

    sub_total = 0.0
    total_cgst_val = 0.0
    total_sgst_val = 0.0
    total_igst_val = 0.0

    for item in safe_get(invoice_data, 'items', []):
        qty = float(item.get('quantity', 0))
        rate = float(item.get('rate', 0))
        gst_rate = float(item.get('gst_rate', 0))
        
        line_amount = qty * rate
        sub_total += line_amount
        
        tax_amount = line_amount * (gst_rate / 100)
        
        if is_interstate:
            total_igst_val += tax_amount
        else:
            total_cgst_val += tax_amount / 2
            total_sgst_val += tax_amount / 2

    grand_total_unrounded = sub_total + total_cgst_val + total_sgst_val + total_igst_val
    grand_total_rounded = round(grand_total_unrounded)
    round_off_amount = grand_total_rounded - grand_total_unrounded
    amount_in_words = f"Rupees {number_to_words_indian(grand_total_rounded)} Only"

    # --- HEADER CONSTRUCTION (Abbreviated for clarity - assumes standard header code here) ---
    invoice_title = safe_get(invoice_data, 'invoice.title', 'Invoice')
    tax_invoice_bar_content = Paragraph(invoice_title, ParagraphStyle(name='TaxInvoiceTitle', fontName='Helvetica-Bold', fontSize=9, alignment=TA_CENTER, textColor=colors.black))
    tax_invoice_bar = Table([[tax_invoice_bar_content]], colWidths=[doc_width - 24*mm])
    tax_invoice_bar.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#9ac1e6')),
        ('TOPPADDING', (0,0), (-1,-1), 2), ('BOTTOMPADDING', (0,0), (-1,-1), 2),
        ('LINEBELOW', (0,0), (-1,-1), 1, colors.black),
    ]))

    logo_image = get_image_from_url(safe_get(invoice_data, 'company.logo_url'), width=40*mm, height=18*mm)
    copy_label_para = Paragraph(copy_label, style_centered)

    company_lines = [f"<font size=12><b>{safe_get(invoice_data, 'company.name')}</b></font>"]
    if address := safe_get(invoice_data, 'company.address'): company_lines.append(f"<b>Address:</b> {address}")
    if contact := safe_get(invoice_data, 'company.contact'): company_lines.append(f"<b>Phone:</b> {contact}")
    if email := safe_get(invoice_data, 'company.email'): company_lines.append(f"<b>Email:</b> {email}")
    if gstin := safe_get(invoice_data, 'company.gstin'): company_lines.append(f"<b>GSTIN:</b> {gstin}")
    company_text = "<br/>".join(company_lines)
    company_details_para = Paragraph(company_text, ParagraphStyle(name='CompanyDetailsStyle', fontName='Helvetica', fontSize=8, leading=9.5, leftIndent=4*mm))

    invoice_details_data = [
        [Paragraph('Bill Date:', style_invoice_details), Paragraph(safe_get(invoice_data, 'invoice.date'), style_invoice_details)],
        [Paragraph('Invoice No.', style_invoice_details), Paragraph(safe_get(invoice_data, 'invoice.number'), style_invoice_details)],
        [Paragraph('PO No.', style_invoice_details), Paragraph(safe_get(invoice_data, 'invoice.po_number', ''), style_invoice_details)]
    ]
    invoice_details_table = Table(invoice_details_data, colWidths=[23*mm, 70*mm])
    invoice_details_table.setStyle(TableStyle([('GRID', (0,0), (-1,-1), 1, colors.black), ('VALIGN', (0,0), (-1,-1), 'MIDDLE'), ('TOPPADDING', (0,0), (-1,-1), 1.5*mm), ('BOTTOMPADDING', (0,0), (-1,-1), 1.5*mm)]))

    upper_header_table = Table([[logo_image, company_details_para]], colWidths=[93*mm, 93*mm])
    upper_header_table.setStyle(TableStyle([('VALIGN', (0,0), (-1,-1), 'TOP'), ('ALIGN', (0,0), (0,0), 'CENTER'), ('LINEAFTER', (0,0), (0,0), 1, colors.black), ('TOPPADDING', (0,0), (0,0), 2), ('BOTTOMPADDING', (0,0), (-1,-1), 10)]))

    lower_header_table = Table([[copy_label_para, invoice_details_table]], colWidths=[93*mm, 93*mm])
    lower_header_table.setStyle(TableStyle([('VALIGN', (0,0), (-1,-1), 'MIDDLE'), ('LINEAFTER', (0,0), (0,0), 1, colors.black), ('LEFTPADDING', (0,0), (-1,-1), 0), ('RIGHTPADDING', (0,0), (-1,-1), 0), ('TOPPADDING', (0,0), (-1,-1), 0), ('BOTTOMPADDING', (0,0), (-1,-1), 0)]))

    main_header_section = Table([[upper_header_table], [lower_header_table]], colWidths=[186*mm])
    main_header_section.setStyle(TableStyle([('LEFTPADDING', (0,0), (-1,-1), 0), ('RIGHTPADDING', (0,0), (-1,-1), 0), ('TOPPADDING', (0,0), (-1,-1), 0), ('BOTTOMPADDING', (0,0), (-1,-1), 0), ('LINEBELOW', (0,0), (0,0), 1, colors.black)]))
    
    # --- ADDRESS SECTION ---
    col_width_addr = (doc_width - 24*mm) / 2
    bill_to_header = Paragraph(f"<b>Bill To: {safe_get(invoice_data, 'buyer.name')}</b>", style_bold_header)
    bill_to_lines = []
    if address := safe_get(invoice_data, 'buyer.address'): bill_to_lines.append(f"<b>Address:</b> {address}")
    if phone := safe_get(invoice_data, 'buyer.phone_no'): bill_to_lines.append(f"<b>Phone:</b> {phone}")
    if email := safe_get(invoice_data, 'buyer.email'): bill_to_lines.append(f"<b>Email:</b> {email}")
    if gstin := safe_get(invoice_data, 'buyer.gstin'): bill_to_lines.append(f"<b>GSTIN:</b> {gstin}")
    bill_to_content = Paragraph("<br/>".join(bill_to_lines), style)

    delivery_header = Paragraph("<b>Delivery Address:</b>", style_bold_header)
    delivery_lines = []
    if address := safe_get(invoice_data, 'delivery.address', safe_get(invoice_data, 'buyer.address')): delivery_lines.append(f"<b>Address:</b> {address}")
    if phone := safe_get(invoice_data, 'delivery.phone_no', safe_get(invoice_data, 'buyer.phone_no')): delivery_lines.append(f"<b>Phone:</b> {phone}")
    if email := safe_get(invoice_data, 'delivery.email', safe_get(invoice_data, 'buyer.email')): delivery_lines.append(f"<b>Email:</b> {email}")
    if gstin := safe_get(invoice_data, 'delivery.gstin', safe_get(invoice_data, 'buyer.gstin')): delivery_lines.append(f"<b>GSTIN:</b> {gstin}")
    delivery_to_content = Paragraph("<br/>".join(delivery_lines), style)

    address_data = [[bill_to_header, delivery_header], [bill_to_content, delivery_to_content]]
    address_section = Table(address_data, colWidths=[col_width_addr, col_width_addr])
    address_section.setStyle(TableStyle([('VALIGN', (0,0), (-1,-1), 'TOP'), ('LINEAFTER', (0,0), (0,1), 1, colors.black), ('PADDING', (0,0), (-1,-1), 4), ('LEFTPADDING', (0,0), (0,0), 5), ('LINEBELOW', (0,0), (-1,0), 1, colors.black)]))

    # --- ITEMS TABLE (UPDATED FOR DESCRIPTION) ---
    items_header = [Paragraph(h, style_table_header) for h in ['Sr. No.', 'Description', 'HSN', 'GST Rate', 'Quantity', 'Unit Price', 'Amount']]
    item_rows = []
    for i, item in enumerate(safe_get(invoice_data, 'items', []), 1):
        qty = float(item.get('quantity', 0))
        rate = float(item.get('rate', 0))
        gst_rate = float(item.get('gst_rate', 0))
        amount = qty * rate
        
        # --- FIX: BOLD NAME AND NORMAL DESCRIPTION ---
        item_name = safe_get(item, 'name')
        item_desc = safe_get(item, 'description', '')
        
        if item_desc:
            # Name in Bold, Description in Normal on new line
            desc_content = f"<b>{item_name}</b><br/><i>{item_desc}</i>" # Added italics for style, remove <i> if simple normal text needed
        else:
            desc_content = f"<b>{item_name}</b>"
            
        desc_paragraph = Paragraph(desc_content, style)
        # ---------------------------------------------

        row = [str(i), desc_paragraph, safe_get(item, 'hsn'), f"{gst_rate:g}%", str(qty), f"{rate:,.2f}", f"{amount:,.2f}"]
        item_rows.append(row)
    
    num_empty_rows = 16 - len(item_rows)
    for _ in range(num_empty_rows): item_rows.append(['', '', '', '', '', '', ''])
    
    items_data = [items_header] + item_rows
    items_col_widths = [col_width_srno, col_width_desc, col_width_hsn, col_width_gst, col_width_qty, col_width_unitprice, col_width_amount]
    items_section = Table(items_data, colWidths=items_col_widths)
    items_section.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#9ac1e6')), ('TEXTCOLOR', (0,0), (-1,0), colors.black),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'), 
        ('ALIGN', (0,1), (0,-1), 'CENTER'), # Sr No Center
        ('ALIGN', (1,1), (1,-1), 'LEFT'),   # Description Left
        ('ALIGN', (2,1), (5,-1), 'CENTER'), # HSN, GST, Qty, Unit Price Center
        ('ALIGN', (6,1), (6,-1), 'RIGHT'),  # Amount Right
        ('BOX', (0,0), (-1,-1), 1, colors.black), ('LINEBELOW', (0,0), (-1,0), 1, colors.black),
        ('LINEAFTER', (0,0), (0,-1), 1, colors.black),
        ('LINEAFTER', (1,0), (1,-1), 1, colors.black),
        ('LINEAFTER', (2,0), (2,-1), 1, colors.black),
        ('LINEAFTER', (3,0), (3,-1), 1, colors.black),
        ('LINEAFTER', (4,0), (4,-1), 1, colors.black),
        ('LINEAFTER', (5,0), (5,-1), 1, colors.black),
    ]))

    # --- FOOTER SECTION ---
    left_footer_width = col_width_srno + col_width_desc + col_width_hsn + col_width_gst
    right_footer_width = col_width_qty + col_width_unitprice + col_width_amount
    
    amount_words_block = Table([[Paragraph("Amount in words", style)], [Paragraph(f"<b>{amount_in_words}</b>", style_amount_words)]], colWidths=[left_footer_width])
    amount_words_block.setStyle(TableStyle([('LEFTPADDING', (0,0), (-1,-1), 2*mm), ('BOTTOMPADDING', (0,0), (-1,-1), 4*mm)]))
    
    bank_lines = ["<b>Bank Details :</b>"]
    if name := safe_get(invoice_data, 'bank.name'): bank_lines.append(f"<b>Bank Name:</b> {name}")
    if account := safe_get(invoice_data, 'bank.account'): bank_lines.append(f"<b>Bank A/C No.:</b> {account}")
    if ifsc := safe_get(invoice_data, 'bank.branch_ifsc'): bank_lines.append(f"<b>IFS Code:</b> {ifsc}")
    bank_lines.append(f"<b>Branch:</b> {safe_get(invoice_data, 'bank.branch', '')}")
    bank_details_para = Paragraph("<br/>".join(bank_lines), style)
    bank_details_block = Table([[bank_details_para]], colWidths=[left_footer_width], style=TableStyle([('BOX', (0,0), (-1,-1), 1, colors.black), ('PADDING', (0,0), (-1,-1), 4)]))
    
    left_footer_content = Table([[amount_words_block], [bank_details_block]], colWidths=[left_footer_width], rowHeights=[18*mm, 28*mm])
    left_footer_content.setStyle(TableStyle([('LEFTPADDING', (0,0), (-1,-1), 0),('RIGHTPADDING', (0,0), (-1,-1), 0),('TOPPADDING', (0,0), (-1,-1), 0),('BOTTOMPADDING', (0,0), (-1,-1), 0)]))
    
    totals_col_widths = [right_footer_width - col_width_amount, col_width_amount]
    totals_data = [
        [Paragraph('Sub Total', style), Paragraph(f"{sub_total:,.2f}", style)],
        [Paragraph('CGST', style), Paragraph(f"{total_cgst_val:,.2f}", style)],
        [Paragraph('SGST', style), Paragraph(f"{total_sgst_val:,.2f}", style)],
        [Paragraph('IGST', style), Paragraph(f"{total_igst_val:,.2f}", style)],
        [Paragraph('Round Off', style), Paragraph(f"{round_off_amount:+.2f}", style)],
        [Paragraph('Total', style_total_label), Paragraph(f"{grand_total_rounded:,.2f}", style_total_value)]
    ]
    totals_table = Table(totals_data, colWidths=totals_col_widths, rowHeights=[5.1*mm]*6)
    totals_table.setStyle(TableStyle([('GRID', (0,0), (-1,-1), 1, colors.black), ('ALIGN', (0,0), (0,-1), 'LEFT'), ('ALIGN', (1,0), (1,-1), 'RIGHT'), ('VALIGN', (0,0), (-1,-1), 'MIDDLE'), ('BACKGROUND', (0,0), (-1,-2), colors.HexColor('#D9E1F2')), ('BACKGROUND', (0,-1), (-1,-1), colors.HexColor('#9ac1e6')), ('TEXTCOLOR', (0,-1), (-1,-1), colors.black), ('LEFTPADDING', (0,0), (-1,-1), 2), ('RIGHTPADDING', (0,0), (-1,-1), 2)]))
    
    signature_image = get_image_from_url(safe_get(invoice_data, 'company.sign_url'), width=35*mm, height=12*mm)
    signature_block = Table([[signature_image], [Paragraph(f"For {safe_get(invoice_data, 'company.name')}", style_centered)]], rowHeights=[14*mm, 6*mm])
    signature_block.setStyle(TableStyle([('ALIGN', (0,0), (-1,-1), 'CENTER')]))
    
    right_footer_content = Table([[totals_table], [Spacer(1, 2*mm)], [signature_block]], rowHeights=[30.6*mm, 1.5*mm, 20*mm])
    right_footer_content.setStyle(TableStyle([('ALIGN', (0,0), (-1,-1), 'RIGHT'), ('VALIGN', (0,0), (-1,-1), 'TOP'), ('LEFTPADDING', (0,0), (-1,-1), 0), ('RIGHTPADDING', (0,0), (-1,-1), 0), ('TOPPADDING', (0,0), (-1,-1), 0), ('BOTTOMPADDING', (0,0), (-1,-1), 0)]))
    
    footer_section = Table([[left_footer_content, right_footer_content]], colWidths=[left_footer_width, right_footer_width])
    footer_section.setStyle(TableStyle([('VALIGN', (0,0), (-1,-1), 'BOTTOM'), ('LEFTPADDING', (0,0), (-1,-1), 0), ('RIGHTPADDING', (0,0), (-1,-1), 0), ('TOPPADDING', (0,0), (-1,-1), 0), ('BOTTOMPADDING', (0,0), (-1,-1), 0)]))
    
    master_table_data = [[tax_invoice_bar], [main_header_section], [address_section], [items_section], [footer_section]]
    master_table = Table(master_table_data, colWidths=[doc_width - 24*mm])
    master_table.setStyle(TableStyle([('BOX', (0,0), (-1,-1), 1, colors.black), ('LEFTPADDING', (0,0), (-1,-1), 0), ('RIGHTPADDING', (0,0), (-1,-1), 0), ('TOPPADDING', (0,0), (-1,-1), 0), ('BOTTOMPADDING', (0,0), (-1,-1), 0), ('LINEBELOW', (0,1), (0,1), 1, colors.black), ('LINEBELOW', (0,2), (0,2), 1, colors.black), ('LINEABOVE', (0,4), (-1,4), 1, colors.black)]))
    return [master_table]

def create_dynamic_invoice(invoice_data, filename="invoice_dynamic.pdf"):
    doc = SimpleDocTemplate(filename, pagesize=A4, leftMargin=12*mm, rightMargin=12*mm, topMargin=10*mm, bottomMargin=10*mm)
    master_story = []
    copy_labels = ["ORIGINAL FOR RECIPIENT", "DUPLICATE COPY", "TRIPLICATE COPY"] if safe_get(invoice_data, 'generate_copies', False) else ["ORIGINAL FOR RECIPIENT"]
    for i, label in enumerate(copy_labels):
        page_flowables = _generate_page_flowables(invoice_data, copy_label=label)
        master_story.extend(page_flowables)
        if i < len(copy_labels) - 1: master_story.append(PageBreak())
    doc.build(master_story, onFirstPage=add_footer_with_link, onLaterPages=add_footer_with_link)
    print(f"✅ Successfully created dynamic invoice: {filename}")
    return filename

if __name__ == '__main__':
    payload = {
        "invoice": { "title": "Tax Invoice", "number": "CEW/24-25/797", "date": "22-01-2025", "po_number": "PO2024-00101001"},
        "company": { "name": "Chaurasiya Engineering Works", "address": "Parmar Industrial Estate, Vasai - (E), Palghar - 401208.", "state": "Maharashtra", "contact": "+91 99308 62568", "email": "ceworks79@gmail.com", "gstin": "27AGCPC6212E1Z1", "sign_url": "https://i.ibb.co/7N8bS2Z/signature-image.png" },
        "buyer": { "name": "Dhongadi Engineering", "address": "2/1, 1st Floor, R.E. Nagar, Chennai.", "state": "Tamil Nadu", "phone_no": "+91 98849 79422", "email": "suresh@dhongadiengineering.com", "gstin": "33AIOEPD9487Q1Z8" },
        "items": [
            {"name": "Castor Wheel", "description": "2*1 Ss Red Pu Lock Mov", "hsn": "7326", "quantity": 5, "rate": 3600, "gst_rate": 18},
            {"name": "MS SUPPORT BRACKET", "hsn": "7308", "quantity": 10, "rate": 500, "gst_rate": 12},
        ],
        "bank": { "name": "SVC Cooperative Bank Limited", "account": "101704180001638", "branch_ifsc": "SVCB0000017", "branch": "Mahakali Caves Road"},
        "generate_copies": False
    }
    create_dynamic_invoice(payload, filename="invoice_with_desc.pdf")

    
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm
from reportlab.platypus import Table, TableStyle, Paragraph, Spacer, Frame, BaseDocTemplate, PageTemplate
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
import datetime,json

def generate_invoice_pdf3(invoice_data, filename="tax_invoice.pdf"):
    print("invoicedata",invoice_data)

    # invoice_data=""
    # try:
    #     # clean_json = invoicedata.strip()
    #     # if not clean_json.startswith("{"):
    #     #     raise ValueError("Gemini did not return JSON: " + clean_json)

    
    # except Exception as e:
    #     print("❌ Failed to parse JSON from Gemini:",invoice_data)
    #     raise e
    print('end')
    """
    Generate a tax invoice PDF from invoice data
    
    Args:
        invoice_data (dict): Dictionary containing all invoice information
        filename (str): Output PDF filename
    
    Returns:
        str: Path to generated PDF file
    """

    
    
    
        # Define page margins for the content inside the frame
    content_left_margin = 15*mm
    content_right_margin = 15*mm
    content_top_margin = 15*mm
    content_bottom_margin = 20*mm

    # Initialize BaseDocTemplate with zero margins
    doc = BaseDocTemplate(filename, pagesize=A4, 
                            topMargin=0, bottomMargin=0,
                            leftMargin=0, rightMargin=0)
    
    styles = getSampleStyleSheet()
    # Calculate the usable width for content within the outer border
    usable_width = A4[0] - (content_left_margin + content_right_margin)
    
    # Custom styles
    title_style = ParagraphStyle(
        'CustomTitle',
        parent=styles['Heading1'],
        fontSize=16,
        spaceAfter=3,
        alignment=TA_CENTER,
        fontName='Helvetica-Bold'
    )
    
    header_style = ParagraphStyle(
        'CustomHeader',
        parent=styles['Normal'],
        fontSize=12,
        fontName='Helvetica-Bold'
    )
    
    normal_style = ParagraphStyle(
        'CustomNormal',
        parent=styles['Normal'],
        fontSize=11,
        fontName='Helvetica'
    )
    
    small_style = ParagraphStyle(
        'CustomSmall',
        parent=styles['Normal'],
        fontSize=10,
        fontName='Helvetica'
    )

    # Style for right-aligned small text
    small_right_align_style = ParagraphStyle(
        'SmallRightAlign',
        parent=small_style,
        alignment=TA_RIGHT
    )

    # Style for bank details to make it compact
    bank_details_style = ParagraphStyle(
        'BankDetails',
        parent=small_style,
        leading=10 # Reduced leading for denser text in bank details
    )

    def safe_str(val):
        return str(val) if val is not None else ""


    # --- Helper Functions ---
    def create_company_table(data):
        company_info = [
            [Paragraph(f"<b>{safe_str(data['company']['name'])}</b>", header_style)],
            [Paragraph(safe_str(data['company']['address']), small_style)],
            [Paragraph(f"Dist.- {safe_str(data['company']['district'])}", small_style)],
            [Paragraph(f"Mob. No {safe_str(data['company']['mobile'])} {data['company']['phone']}", small_style)],
            [Paragraph(f"GSTIN/UIN: {safe_str(data['company']['gstin'])}", small_style)],
            [Paragraph(f"State Name: {safe_str(data['company']['state'])}", small_style)],
            [Paragraph(f"Contact: {safe_str(data['company']['contact'])}", small_style)],
            [Paragraph(f"E-Mail: {safe_str(data['company']['email'])}", small_style)]
        ]

        company_table = Table(company_info, colWidths=[usable_width * 0.5])
        company_table.setStyle(TableStyle([
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('LEFTPADDING', (0, 0), (-1, -1), 6),
            ('RIGHTPADDING', (0, 0), (-1, -1), 6),
            ('TOPPADDING', (0, 0), (-1, -1), 0),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 0),
        ]))
        return company_table
    
    def create_invoice_table(data):
        def safe_para(text ):
            data=(text or "")
            return Paragraph(text if data.strip() else "&nbsp;", small_style)

        invoice_info = [
            [Paragraph("<b>Invoice No.</b>", small_style), Paragraph("<b>Dated</b>", small_style)],
            [safe_para(data['invoice']['number']), safe_para(data['invoice']['date'])],
            [Paragraph("<b>Delivery Note</b>", small_style), Paragraph("<b>Mode/Terms of Payment</b>", small_style)],
            [safe_para(data['invoice']['delivery_note']), safe_para(data['invoice']['payment_terms'])],
            [Paragraph("<b>Reference No. & Date.</b>", small_style), Paragraph("<b>Other References</b>", small_style)],
            [safe_para(data['invoice']['reference']), safe_para(data['invoice']['other_references'])],
            [Paragraph("<b>Buyer's Order No.</b>", small_style), Paragraph("<b>Dated</b>", small_style)],
            [safe_para(data['invoice']['buyer_order']), safe_para(data['invoice']['buyer_order_date'])],
            [Paragraph("<b>Dispatch Doc No.</b>", small_style), Paragraph("<b>Delivery Note Date</b>", small_style)],
            [safe_para(data['invoice']['dispatch_doc']), safe_para(data['invoice']['delivery_date'])],
            [Paragraph("<b>Dispatched through</b>", small_style), Paragraph("<b>Destination</b>", small_style)],
            [safe_para(data['invoice']['dispatch_through']), safe_para(data['invoice']['destination'])],
            [Paragraph("<b>Terms of Delivery</b>", small_style), Paragraph("", small_style)],
            [safe_para(data['invoice']['terms_delivery']), Paragraph("", small_style)]
        ]

        invoice_table = Table(invoice_info, colWidths=[usable_width * 0.25, usable_width * 0.25])
        invoice_table.setStyle(TableStyle([
            ('GRID', (0, 0), (-1, -1), 0.5, colors.black),
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('LEFTPADDING', (0, 0), (-1, -1), 4),
            ('RIGHTPADDING', (0, 0), (-1, -1), 4),
            ('TOPPADDING', (0, 0), (-1, -1), 2),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 2),
        ]))
        return invoice_table

    def create_buyer_table(data):
        buyer_info = [
            [Paragraph(f"<b>{safe_str(data['buyer']['name'])}</b>", normal_style)],
            [Paragraph(safe_str(data['buyer']['address']), small_style)],
            [Paragraph(f"GSTIN/UIN: {safe_str(data['buyer']['gstin'])}", small_style)],
            [Paragraph(f"State Name: {safe_str(data['buyer']['state'])}", small_style)]
        ]

        buyer_table = Table(buyer_info, colWidths=[usable_width * 0.5])
        buyer_table.setStyle(TableStyle([
            ('LINEABOVE', (0, 0), (-1, 0), 1, colors.black),
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('LEFTPADDING', (0, 0), (-1, -1), 6),
            ('RIGHTPADDING', (0, 0), (-1, -1), 6),
            ('TOPPADDING', (0, 0), (-1, -1), 3),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
        ]))
        return buyer_table
    
    def create_combined_header_section(data):
        company_table = create_company_table(data)
        buyer_table = create_buyer_table(data)
        invoice_table = create_invoice_table(data)

        left_side = [company_table, Spacer(1, 6), buyer_table]
        left_combined = Table([[item] for item in left_side], colWidths=[usable_width * 0.5])
        left_combined.setStyle(TableStyle([
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('LEFTPADDING', (0, 0), (-1, -1), 0),
            ('RIGHTPADDING', (0, 0), (-1, -1), 0),
        ]))

        right_combined = invoice_table

        final_table = Table([
            [left_combined, right_combined]
        ], colWidths=[usable_width * 0.5, usable_width * 0.5])

        final_table.setStyle(TableStyle([
            ('BOX', (0, 0), (-1, -1), 1, colors.black),
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('LEFTPADDING', (0, 0), (-1, -1), 0),
            ('RIGHTPADDING', (0, 0), (-1, -1), 0),
            ('TOPPADDING', (0, 0), (-1, -1), 0),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 0),
        ]))
        return final_table

    def create_items_table(items):
        headers = [
            Paragraph("<b>Sr</b>", small_style),
            Paragraph("<b>Description of Goods</b>", small_style),
            Paragraph("<b>HSN/SAC</b>", small_style),
            Paragraph("<b>GST Rate</b>", small_style),
            Paragraph("<b>Quantity</b>", small_style),
            Paragraph("<b>Rate</b>", small_style),
            Paragraph("<b>Per</b>", small_style),
            Paragraph("<b>Amount</b>", small_style),
        ]

        data_rows = [headers]
        total_amount = 0

        for i, item in enumerate(items, 1):
            desc_text = f"<b>{safe_str(item.get('name'))}</b>"
            if item.get('description'):
                desc_text += f"<br/>{safe_str(item.get('description'))}"
            row = [
                Paragraph(str(i), small_style),
                Paragraph(desc_text, small_style),
                Paragraph(safe_str(item.get('hsn')), small_style),
                Paragraph(f"{safe_str(item.get('gst_rate'))}%", small_style),
                Paragraph(f"{safe_str(item.get('quantity'))} {safe_str(item.get('unit'))}", small_style),
                Paragraph(f"{item.get('rate', 0):.2f}", small_style),
                Paragraph(safe_str(item.get('unit')), small_style),
                Paragraph(f"{item.get('amount', 0):.2f}", small_style)
            ]
            data_rows.append(row)
            total_amount += item.get('amount', 0)
            print('mid')


        # Add blank rows to maintain minimum height before totals
        min_content_rows = 9 
        current_item_rows = len(items)
        if current_item_rows < min_content_rows:
            for _ in range(min_content_rows - current_item_rows):
                data_rows.append([Paragraph("&nbsp;", small_style)] + [""] * 7)

        # Totals calculation
        cgst = total_amount * 0.09
        sgst = total_amount * 0.09
        round_off = round(total_amount + cgst + sgst) - (total_amount + cgst + sgst)
        final_total = total_amount + cgst + sgst + round_off 

        # Subtotal with border above and right aligned (placed *after* blank rows)
        subtotal_paragraph = Paragraph(f"<b>{total_amount:.2f}</b>", small_style)
        data_rows.append(["", "", "", "", "", "", "", subtotal_paragraph])
        subtotal_row_idx = len(data_rows) - 1 

        # GST row
        tax_desc = Paragraph(
            "<para align='right'><b><font size=8>CGST<br/>SGST<br/>Round Off</font></b></para>",
            small_style
        )
        tax_vals = Paragraph(
            f"<para align='right'><b><font size=8>{cgst:.2f}<br/>{sgst:.2f}<br/>{round_off:.2f}</font></b></para>",
            small_style
        )
        data_rows.append(["", tax_desc, "", "", "", "", "", tax_vals])

        # Final Total
        final_total_paragraph = Paragraph(f"<b>{final_total:.2f}</b>", header_style)
        data_rows.append(["", "", "", "", "", "", "", final_total_paragraph])

        col_widths = [
            usable_width * 0.05,  # Sl
            usable_width * 0.4,  # Description
            usable_width * 0.09,   # HSN
            usable_width * 0.08,  # GST
            usable_width * 0.1,  # Quantity
            usable_width * 0.10,  # Rate
            usable_width * 0.06,  # Per
            usable_width * 0.12   # Amount
        ]

        table = Table(data_rows, colWidths=col_widths, repeatRows=1)
        last_row_idx = len(data_rows) - 1

        table.setStyle(TableStyle([
            ('BOX', (0, 0), (-1, last_row_idx), 0.8, colors.black), 
            ('BACKGROUND', (0, 0), (-1, 0), colors.lightgrey),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('LINEBELOW', (0, 0), (-1, 0), 0.8, colors.black),
            ('LINEABOVE', (7, subtotal_row_idx), (7, subtotal_row_idx), 0.6, colors.black),
            ('LINEABOVE', (0, last_row_idx - 1), (-1, last_row_idx - 1), 0.8, colors.black), 
            ('LINEBELOW', (0, last_row_idx - 1), (-1, last_row_idx - 1), 0.8, colors.black), 
            *[
                ('LINEBEFORE', (col, 0), (col, last_row_idx), 0.4, colors.black) 
                for col in range(1, 8)
            ],
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('ALIGN', (0, 0), (0, -1), 'CENTER'),
            ('ALIGN', (2, 0), (2, -1), 'CENTER'),
            ('ALIGN', (3, 0), (3, -1), 'CENTER'),
            ('ALIGN', (4, 0), (4, -1), 'CENTER'),
            ('ALIGN', (5, 0), (5, -1), 'CENTER'),
            ('ALIGN', (6, 0), (6, -1), 'CENTER'),
            ('ALIGN', (1, 0), (1, last_row_idx - 3), 'LEFT'), 
            ('ALIGN', (7, 0), (7, last_row_idx), 'RIGHT'), 
            ('FONTSIZE', (0, 0), (-1, -1), 8),
            ('LEFTPADDING', (0, 0), (-1, -1), 0),
            ('RIGHTPADDING', (0, 0), (-1, -1), 3),
            ('TOPPADDING', (0, 0), (-1, -1), 2),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 2),
        ]))
        return table

    def create_declaration_and_bank_table(data, current_width):
        declaration_text = """<b>Declaration</b><br/>
1. Goods once sold will not be taken back.<br/>
2. Interest @18%p.a will be charged if the payment is not made within the stipulated time.<br/>
3. Subject to Mumbai jurisdiction only.<br/>
4. Certified that above particulars are true & correct."""
        
        bank_details_content = f"""<b>Company's Bank Details</b><br/>
<b>Bank Name:</b> <font name='Helvetica'>{safe_str(data.get('bank', {}).get('name', ''))}</font><br/>
<b>A/c No.:</b> <font name='Helvetica'>{safe_str(data.get('bank', {}).get('account', ''))}</font><br/>
<b>Branch & IFS Code:</b> <font name='Helvetica'>{safe_str(data.get('bank', {}).get('branch_ifsc', ''))}</font>"""

        declaration_paragraph = Paragraph(declaration_text, small_style)
        bank_details_paragraph = Paragraph(bank_details_content, bank_details_style)
        
        for_company_paragraph = Paragraph(f"<b>for {safe_str(data.get('company', {}).get('name', ''))}</b>", small_right_align_style)
        authorized_signatory_paragraph = Paragraph("<b>Authorized Signatory</b>", small_right_align_style)

        table_data = [
            [declaration_paragraph, bank_details_paragraph],
            [Paragraph("<b>Customer's Seal and Signature</b>", small_style), 
             [for_company_paragraph, Spacer(1, 20), authorized_signatory_paragraph] 
            ]
        ]
        
        col_width_left = current_width * 0.6
        col_width_right = current_width * 0.4
        
        table = Table(table_data, colWidths=[col_width_left, col_width_right])

        table.setStyle(TableStyle([
            ('GRID', (0, 0), (-1, -1), 1, colors.black),
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('LEFTPADDING', (0, 0), (-1, -1), 6),
            ('RIGHTPADDING', (0, 0), (-1, -1), 6),
            ('TOPPADDING', (0, 0), (-1, -1), 0),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 0),
            
            ('VALIGN', (1,0), (1,0), 'TOP'), 
            
            ('VALIGN', (0, 1), (0, 1), 'BOTTOM'), 
            ('BOTTOMPADDING', (0, 1), (0, 1), 20), 

            ('VALIGN', (1, 1), (1, 1), 'BOTTOM'),
            ('LEFTPADDING', (1,1), (1,1), 0), 
            ('RIGHTPADDING', (1,1), (1,1), 0), 
            ('TOPPADDING', (1,1), (1,1), 0),   
            ('BOTTOMPADDING', (1,1), (1,1), 0)
        ]))
        
        return table

    # --- Build the story ---
    story = []
    
    # Outer Frame for the entire invoice content
    outer_frame = Frame(content_left_margin, content_bottom_margin, 
                        A4[0] - content_left_margin - content_right_margin, 
                        A4[1] - content_top_margin - content_bottom_margin, 
                        leftPadding=0, bottomPadding=0,
                        rightPadding=0, topPadding=0,
                        showBoundary=1) # This draws the border

    # Add the PageTemplate to the document
    # BaseDocTemplate knows how to use these templates for page layout
    doc.addPageTemplates([PageTemplate(id='AllPages', frames=[outer_frame])])

    story.append(Paragraph("Tax Invoice", title_style))
    story.append(Spacer(1, 12))
    
    header_layout = create_combined_header_section(invoice_data)
    story.append(header_layout)

    story.append(Spacer(1, 5)) 

    items_table = create_items_table(invoice_data['items'])
    story.append(items_table)
    story.append(Spacer(1, 5)) 
    
    amount_eoe_data = [
        [
            Paragraph(f"<b>Amount Chargeable (in words)</b><br/>{invoice_data['amount_in_words']}", normal_style),
            Paragraph("E. & O.E", small_right_align_style) 
        ]
    ]
    amount_eoe_table = Table(amount_eoe_data, colWidths=[usable_width * 0.85, usable_width * 0.15]) 
    amount_eoe_table.setStyle(TableStyle([
        ('VALIGN', (0,0), (-1,-1), 'BOTTOM'), 
        ('TOPPADDING', (0,0), (-1,-1), 0),
        ('BOTTOMPADDING', (0,0), (-1,0), 0), 
        ('LEFTPADDING', (0,0), (0,0), 0),
        ('RIGHTPADDING', (1,0), (1,0), 0),
    ]))
    story.append(amount_eoe_table)
    story.append(Spacer(1, 5)) 

    declaration_bank_table = create_declaration_and_bank_table(invoice_data, usable_width) 
    story.append(declaration_bank_table)
    story.append(Spacer(1, 10))
    
    comp_note = Paragraph("This is a Computer Generated Invoice", 
                        ParagraphStyle('Center', parent=small_style, alignment=TA_CENTER))
    story.append(comp_note)
    
    # Build PDF - BaseDocTemplate will automatically use the defined page templates
    try:
        doc.build(story) # CORRECTED: Removed 'template' argument
        print(f"Successfully generated PDF: {filename}")
    except Exception as e:
        print(f"Error building PDF: {e}")
        import traceback
        traceback.print_exc() 
        return None 
    
    return filename



# #latest with dupliacte/triplicate
# import os
# import re
# import requests
# from io import BytesIO
# from reportlab.lib.pagesizes import A4
# from reportlab.lib import colors
# from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
# from reportlab.lib.units import mm
# from reportlab.platypus import (
#     Table, TableStyle, Paragraph, Spacer, SimpleDocTemplate, Image, PageBreak
# )
# from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
# from decimal import Decimal, ROUND_HALF_UP

# # --- Professional Design Elements ---
# PRIMARY_COLOR = colors.HexColor('#2c3e50') # Dark Slate Blue
# LIGHT_GREY = colors.HexColor('#ecf0f1')
# FOOTER_GREY = colors.HexColor('#7f8c8d')

# # ==============================================================================
# # HELPER FUNCTION: Number to Words (Indian System)
# # ==============================================================================
# def number_to_words_indian(num):
#     """Converts a number to words in the Indian numbering system (Lakhs, Crores)."""
#     if num == 0:
#         return 'Zero'

#     units = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine']
#     teens = ['', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen']
#     tens = ['', 'Ten', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety']

#     def convert_less_than_thousand(n):
#         if n == 0:
#             return ''
#         if n < 10:
#             return units[n]
#         if n < 20:
#             return teens[n - 10]
#         if n < 100:
#             return tens[n // 10] + (' ' + units[n % 10] if n % 10 != 0 else '')
#         return units[n // 100] + ' Hundred' + (' ' + convert_less_than_thousand(n % 100) if n % 100 != 0 else '')

#     words = []
#     num = int(num)
#     if num // 10000000 > 0:
#         words.append(convert_less_than_thousand(num // 10000000) + ' Crore')
#         num %= 10000000
#     if num // 100000 > 0:
#         words.append(convert_less_than_thousand(num // 100000) + ' Lakh')
#         num %= 100000
#     if num // 1000 > 0:
#         words.append(convert_less_than_thousand(num // 1000) + ' Thousand')
#         num %= 1000
#     if num > 0:
#         words.append(convert_less_than_thousand(num))
        
#     return ' '.join(filter(None, words))


# # ==============================================================================
# # HELPER FUNCTION: To safely get values from the input dictionary
# # ==============================================================================
# def safe_get(data_dict, key, default=''):
#     """Safely get a value from a nested dictionary."""
#     keys = key.split('.')
#     val = data_dict
#     for k in keys:
#         if isinstance(val, dict):
#             val = val.get(k, default)
#         else:
#             return default
#     return val or default

# # ==============================================================================
# # FOOTER FUNCTION: Adds the "VYAPARI AI" tag to every page
# # ==============================================================================
# def add_footer(canvas, doc):
#     """
#     This function is called on every page and draws the footer in the bottom-right.
#     """
#     canvas.saveState()
#     canvas.setFont('Helvetica', 8)
#     canvas.setFillColor(FOOTER_GREY)
    
#     footer_text = "Created using VYAPARI AI"
#     text_y = doc.bottomMargin - 7 * mm
#     canvas.drawRightString(doc.leftMargin + doc.width, text_y, footer_text)
    
#     canvas.restoreState()

# # ==============================================================================
# # CORE LOGIC: Creates the story (content) for a single invoice page
# # ==============================================================================
# def create_invoice_page_story(invoice_data, styles, doc_width, copy_type=""):
#     """
#     Generates the list of ReportLab flowables for a single invoice page.
#     `copy_type` can be 'ORIGINAL COPY', 'DUPLICATE COPY', etc.
#     """
#     story = []

#     if copy_type:
#         story.append(Paragraph(copy_type, styles['CopyLabel']))
#         story.append(Spacer(1, 5 * mm))

#     # --- Header with Logo and Invoice Details (Restored Original Layout) ---
#     header_content = []
#     logo_url = safe_get(invoice_data, 'company.logo_url')
#     logo_image = None
    
#     if logo_url:
#         try:
#             response = requests.get(logo_url, stream=True)
#             # Ensure the request was successful before proceeding
#             if response.status_code == 200:
#                 # Create a file-like object in memory from the image content
#                 image_data = BytesIO(response.content)
#                 logo_image = Image(image_data, width=40 * mm, height=15 * mm)
#                 logo_image.hAlign = 'LEFT'
#         except Exception as e:
#             print(f"Warning: Could not fetch or process logo from URL {logo_url}. Error: {e}")
#             logo_image = None

#     if logo_image:
#         header_content.append(logo_image)
#     else:
#         # Fallback to company name if logo is not available or fails to load
#         header_content.append(Paragraph(safe_get(invoice_data, 'company.name'), styles['CompanyHeader']))
#     # MODIFICATION END

#     invoice_details_content = [
#         [Paragraph("INVOICE", styles['Title'])],
#         [Spacer(1, 2 * mm)],
#         [Paragraph(f"<b>Invoice #:</b> {safe_get(invoice_data, 'invoice.number')}", styles['Header'])],
#         [Paragraph(f"<b>Date:</b> {safe_get(invoice_data, 'invoice.date')}", styles['Header'])],
#         [Paragraph(f"<b>Due Date:</b> {safe_get(invoice_data, 'invoice.due_date')}", styles['Header'])]
#     ]
#     header_table = Table([[header_content, Table(invoice_details_content)]], colWidths=[doc_width * 0.5, doc_width * 0.5])
#     header_table.setStyle(TableStyle([('VALIGN', (0, 0), (-1, -1), 'TOP')]))
#     story.append(header_table)
#     story.append(Spacer(1, 10 * mm))

#     # --- Company and Buyer Details (Restored Original Layout) ---
#     company_details_para = [
#         Paragraph("FROM:", styles['SectionHeader']),
#         Paragraph(f"<b>{safe_get(invoice_data, 'company.name')}</b>", styles['NormalLeft']),
#         Paragraph(safe_get(invoice_data, 'company.address'), styles['NormalLeft']),
#         Paragraph(f"<b>GSTIN:</b> {safe_get(invoice_data, 'company.gstin')}", styles['NormalLeft'])
#     ]
#     buyer_details_para = [
#         Paragraph("BILL TO:", styles['SectionHeader']),
#         Paragraph(f"<b>{safe_get(invoice_data, 'buyer.name')}</b>", styles['NormalLeft']),
#         Paragraph(safe_get(invoice_data, 'buyer.address'), styles['NormalLeft']),
#         Paragraph(f"<b>GSTIN:</b> {safe_get(invoice_data, 'buyer.gstin')}", styles['NormalLeft'])
#     ]
#     details_table = Table([[company_details_para, buyer_details_para]], colWidths=[doc_width / 2, doc_width / 2], hAlign='LEFT')
#     details_table.setStyle(TableStyle([('VALIGN', (0, 0), (-1, -1), 'TOP')]))
#     story.append(details_table)
#     story.append(Spacer(1, 10 * mm))
    
#     # --- Items Table ---
#     is_b2b_invoice = bool(safe_get(invoice_data, 'buyer.gstin'))
#     if is_b2b_invoice:
#         items_header = [Paragraph(h, s) for h, s in zip(
#             ['#', 'Item & Description', 'HSN', 'Qty', 'Rate', 'Taxable Value', 'GST', 'Total'],
#             [styles['TableHead'], styles['TableHead'], styles['TableHeadRight'], styles['TableHeadRight'], styles['TableHeadRight'], styles['TableHeadRight'], styles['TableHeadRight'], styles['TableHeadRight']]
#         )]
#         col_widths = [doc_width*0.05, doc_width*0.30, doc_width*0.10, doc_width*0.07, doc_width*0.12, doc_width*0.12, doc_width*0.07, doc_width*0.17]
#     else:
#         items_header = [Paragraph(h, styles['TableHead']) for h in ['#', 'Item & Description', 'Qty', 'Rate', 'Amount']]
#         col_widths = [doc_width*0.05, doc_width*0.55, doc_width*0.13, doc_width*0.13, doc_width*0.14]

#     items_data = [items_header]
#     tax_summary = {}
#     total_taxable_value = Decimal('0.00')

#     for i, item in enumerate(safe_get(invoice_data, 'items', []), 1):
#         quantity = Decimal(safe_get(item, 'quantity', 0))
#         rate = Decimal(safe_get(item, 'rate', 0))
#         gst_rate = Decimal(safe_get(item, 'gst_rate', 0))
#         taxable_value = quantity * rate
#         total_taxable_value += taxable_value
#         tax_amount = taxable_value * (gst_rate / 100)
#         total_item_value = taxable_value + tax_amount

#         if is_b2b_invoice:
#             row = [
#                 Paragraph(str(i), styles['TableBody']), Paragraph(safe_get(item, 'name'), styles['TableBody']),
#                 Paragraph(safe_get(item, 'hsn'), styles['TableBodyRight']), Paragraph(f"{quantity}", styles['TableBodyRight']),
#                 Paragraph(f"{rate:,.2f}", styles['TableBodyRight']), Paragraph(f"{taxable_value:,.2f}", styles['TableBodyRight']),
#                 Paragraph(f"{gst_rate}%", styles['TableBodyRight']), Paragraph(f"{total_item_value:,.2f}", styles['TableBodyRight'])
#             ]
#         else:
#             inclusive_rate = total_item_value / quantity if quantity != 0 else 0
#             row = [
#                 Paragraph(str(i), styles['TableBody']), Paragraph(safe_get(item, 'name'), styles['TableBody']),
#                 Paragraph(f"{quantity}", styles['TableBodyRight']), Paragraph(f"{inclusive_rate:,.2f}", styles['TableBodyRight']),
#                 Paragraph(f"{total_item_value:,.2f}", styles['TableBodyRight'])
#             ]
#         items_data.append(row)
#         if gst_rate not in tax_summary:
#             tax_summary[gst_rate] = {'taxable_value': Decimal('0.00'), 'tax_amount': Decimal('0.00')}
#         tax_summary[gst_rate]['taxable_value'] += taxable_value
#         tax_summary[gst_rate]['tax_amount'] += tax_amount
    
#     items_table = Table(items_data, colWidths=col_widths, repeatRows=1)
#     items_table.setStyle(TableStyle([
#         ('BACKGROUND', (0, 0), (-1, 0), PRIMARY_COLOR), ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
#         ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke), ('LINEBELOW', (0, 0), (-1, 0), 1, PRIMARY_COLOR),
#         ('LINEBELOW', (0, -1), (-1, -1), 1, colors.lightgrey), ('LEFTPADDING', (0, 0), (-1, -1), 6),
#         ('RIGHTPADDING', (0, 0), (-1, -1), 6), ('TOPPADDING', (0, 0), (-1, -1), 4),
#         ('BOTTOMPADDING', (0, 0), (-1, -1), 4), *[('BACKGROUND', (0, i), (-1, i), LIGHT_GREY) for i in range(1, len(items_data)) if i % 2 != 0]
#     ]))
#     story.append(items_table)
#     story.append(Spacer(1, 8 * mm))

#     # --- Totals Section ---
#     grand_total = total_taxable_value + sum(v['tax_amount'] for v in tax_summary.values())
#     rounded_total = grand_total.quantize(Decimal('0'), rounding=ROUND_HALF_UP)
#     round_off = rounded_total - grand_total

#     summary_content = []
#     if is_b2b_invoice:
#         summary_content.append(['Subtotal:', f"{total_taxable_value:,.2f}"])
#         is_interstate = safe_get(invoice_data, 'company.state') != safe_get(invoice_data, 'buyer.state')
#         for rate, values in sorted(tax_summary.items()):
#             tax = values['tax_amount']
#             if is_interstate:
#                 summary_content.append([f"IGST @ {rate}%:", f"{tax:,.2f}"])
#             else:
#                 cgst, sgst = tax / 2, tax / 2
#                 summary_content.append([f"CGST @ {rate/2}%:", f"{cgst:,.2f}"])
#                 summary_content.append([f"SGST @ {rate/2}%:", f"{sgst:,.2f}"])
#         if abs(round_off) > 0.005:
#             summary_content.append(['Round Off:', f"{round_off:,.2f}"])
    
#     summary_styled = [[Paragraph(label, styles['TotalLabel']), Paragraph(value, styles['TotalLabel'])] for label, value in summary_content]
#     summary_styled.append([Paragraph('Total', styles['TotalValue']), Paragraph(f"<b>₹ {rounded_total:,.2f}</b>", styles['TotalValue'])])
    
#     totals_table = Table([['', Table(summary_styled)]], colWidths=[doc_width * 0.6, doc_width * 0.4])
#     totals_table.setStyle(TableStyle([('VALIGN', (0, 0), (-1, -1), 'TOP')]))
#     story.append(totals_table)
#     story.append(Spacer(1, 4 * mm))

#     # --- Amount in Words (Using new function) ---
#     amount_in_words_text = f"Rupees {number_to_words_indian(rounded_total)} Only"
#     amount_in_words_para = Paragraph(f"<b>Amount in Words:</b> {amount_in_words_text}", styles['NormalLeft'])
#     story.append(amount_in_words_para)
#     story.append(Spacer(1, 10 * mm))
    
#     # --- Footer with Bank and Terms (Restored Original Layout) ---
#     terms_list = safe_get(invoice_data, 'terms_and_conditions', [])
    
#     # CORRECTED: Smartly format terms to avoid double numbering
#     formatted_terms = []
#     for i, term in enumerate(terms_list):
#         if re.match(r'^\d+\.\s*', term.strip()):
#             formatted_terms.append(term.strip())
#         else:
#             formatted_terms.append(f"{i+1}. {term.strip()}")
#     terms_text = "<br/>".join(formatted_terms)
#     terms_para = Paragraph(terms_text, styles['NormalLeft'])
    
#     bank_details_text = f"<b>Bank:</b> {safe_get(invoice_data, 'bank.name')}<br/><b>A/C No:</b> {safe_get(invoice_data, 'bank.account')}<br/><b>IFSC:</b> {safe_get(invoice_data, 'bank.branch_ifsc')}"
#     bank_para = Paragraph(bank_details_text, styles['NormalLeft'])

#     terms_and_bank_table = Table([
#         [Paragraph("Terms & Conditions", styles['SectionHeader']), Paragraph("Bank Details", styles['SectionHeader'])],
#         [terms_para, bank_para]
#     ], colWidths=[doc_width * 0.6, doc_width * 0.4], hAlign='LEFT')
#     terms_and_bank_table.setStyle(TableStyle([('VALIGN', (0, 0), (-1, -1), 'TOP')]))
#     story.append(terms_and_bank_table)

#     # --- Signatures (CORRECTED: Restored Original Layout with single table for alignment) ---
#     seller_signature_text = f"For <b>{safe_get(invoice_data, 'company.name')}</b>"
    
#     signature_table = Table(
#         [
#             [Spacer(1, 15*mm), Spacer(1, 15*mm)],
#             [Paragraph('_________________________', styles['Signature']), Paragraph('_________________________', styles['Signature'])],
#             [Paragraph('Authorized Signatory', styles['Signature']), Paragraph("Buyer's Signature", styles['Signature'])],
#             [Paragraph(seller_signature_text, styles['Signature']), ''] # Empty cell to maintain alignment
#         ], 
#         colWidths=[doc_width / 2, doc_width / 2]
#     )
#     signature_table.setStyle(TableStyle([
#         ('VALIGN', (0, 0), (-1, -1), 'TOP'),
#         ('ALIGN', (0, 0), (-1, -1), 'CENTER')
#     ]))
#     story.append(signature_table)

#     return story

# # ==============================================================================
# # MAIN FUNCTION: Builds the final PDF document
# # ==============================================================================
# def generate_final_invoice(invoice_data, filename="final_invoice.pdf"):
#     """
#     Main function to generate the invoice PDF.
#     Handles single or multi-copy generation based on `generate_copies` flag.
#     """
#     doc = SimpleDocTemplate(filename, pagesize=A4,
#                             topMargin=15 * mm, bottomMargin=15 * mm,
#                             leftMargin=15 * mm, rightMargin=15 * mm)

#     # --- Custom Styles ---
#     styles = getSampleStyleSheet()

#     # CORRECTED: Modify the existing 'Title' style instead of adding a new one
#     styles['Title'].fontName = 'Helvetica-Bold'
#     styles['Title'].fontSize = 22
#     styles['Title'].alignment = TA_RIGHT
#     styles['Title'].textColor = PRIMARY_COLOR

#     # Add other custom styles
#     styles.add(ParagraphStyle(name='CompanyHeader', fontName='Helvetica-Bold', fontSize=16, textColor=PRIMARY_COLOR, leading=18))
#     styles.add(ParagraphStyle(name='Header', fontName='Helvetica', fontSize=9, alignment=TA_RIGHT, textColor=colors.darkgrey))
#     styles.add(ParagraphStyle(name='CopyLabel', fontName='Helvetica-Bold', fontSize=14, alignment=TA_CENTER, textColor=colors.grey, spaceAfter=6))
#     styles.add(ParagraphStyle(name='SectionHeader', fontName='Helvetica-Bold', fontSize=10, alignment=TA_LEFT, textColor=PRIMARY_COLOR, spaceBefore=8, spaceAfter=4))
#     styles.add(ParagraphStyle(name='NormalLeft', parent=styles['Normal'], alignment=TA_LEFT, fontSize=9, leading=12))
#     styles.add(ParagraphStyle(name='TableHead', fontName='Helvetica-Bold', fontSize=9, alignment=TA_CENTER, textColor=colors.whitesmoke))
#     styles.add(ParagraphStyle(name='TableHeadRight', parent=styles['TableHead'], alignment=TA_RIGHT))
#     styles.add(ParagraphStyle(name='TableBody', fontName='Helvetica', fontSize=9, alignment=TA_LEFT))
#     styles.add(ParagraphStyle(name='TableBodyRight', parent=styles['TableBody'], alignment=TA_RIGHT))
#     styles.add(ParagraphStyle(name='TotalLabel', fontName='Helvetica', fontSize=9, alignment=TA_RIGHT))
#     styles.add(ParagraphStyle(name='TotalValue', fontName='Helvetica-Bold', fontSize=10, alignment=TA_RIGHT))
#     styles.add(ParagraphStyle(name='Signature', parent=styles['Normal'], alignment=TA_CENTER, fontSize=9))

#     master_story = []
#     doc_width = doc.width

#     # --- LOGIC FOR DUPLICATE/TRIPLICATE ---
#     generate_copies = safe_get(invoice_data, 'generate_copies', False)
#     if generate_copies:
#         copy_types = ['ORIGINAL COPY', 'DUPLICATE COPY', 'TRIPLICATE COPY']
#     else:
#         copy_types = [''] # An empty string means no label will be added

#     for i, copy_type in enumerate(copy_types):
#         page_story = create_invoice_page_story(invoice_data, styles, doc_width, copy_type)
#         master_story.extend(page_story)
        
#         if i < len(copy_types) - 1:
#             master_story.append(PageBreak())
    
#     try: 
#         doc.build(master_story, onFirstPage=add_footer, onLaterPages=add_footer)
#         print(f"✅ Successfully generated final invoice: {filename}")
#         return filename
#     except Exception as e: 
#         print(f"❌ Error building PDF: {e}")
#         return None

import os
import re
import requests
from io import BytesIO
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm
from reportlab.platypus import (
    Table, TableStyle, Paragraph, Spacer, SimpleDocTemplate, Image, PageBreak
)
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
from decimal import Decimal, ROUND_HALF_UP

# --- Professional Design Elements ---
PRIMARY_COLOR = colors.HexColor('#2c3e50') # Dark Slate Blue
LIGHT_GREY = colors.HexColor('#ecf0f1')
FOOTER_GREY = colors.HexColor('#7f8c8d')
BLACK_COLOR = colors.HexColor('#000000') # Define black for clarity

# ==============================================================================
# HELPER FUNCTION: Number to Words (Indian System)
# ==============================================================================
def number_to_words_indian(num):
    """Converts a number to words in the Indian numbering system (Lakhs, Crores)."""
    if num == 0:
        return 'Zero'

    units = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine']
    teens = ['', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen']
    tens = ['', 'Ten', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety']

    def convert_less_than_thousand(n):
        if n == 0: return ''
        if n < 10: return units[n]
        if n < 20: return teens[n - 10]
        if n < 100: return tens[n // 10] + (' ' + units[n % 10] if n % 10 != 0 else '')
        return units[n // 100] + ' Hundred' + (' ' + convert_less_than_thousand(n % 100) if n % 100 != 0 else '')

    words = []
    num = int(num)
    if num // 10000000 > 0:
        words.append(convert_less_than_thousand(num // 10000000) + ' Crore')
        num %= 10000000
    if num // 100000 > 0:
        words.append(convert_less_than_thousand(num // 100000) + ' Lakh')
        num %= 100000
    if num // 1000 > 0:
        words.append(convert_less_than_thousand(num // 1000) + ' Thousand')
        num %= 1000
    if num > 0:
        words.append(convert_less_than_thousand(num))
        
    return ' '.join(filter(None, words))


# ==============================================================================
# HELPER FUNCTION: To safely get values from the input dictionary
# ==============================================================================
def safe_get(data_dict, key, default=''):
    """Safely get a value from a nested dictionary."""
    keys = key.split('.')
    val = data_dict
    for k in keys:
        if isinstance(val, dict):
            val = val.get(k, default)
        else:
            return default
    return val or default

# ==============================================================================
# FOOTER FUNCTION: Adds the "VYAPARI AI" tag to every page
# ==============================================================================
# ==============================================================================
# FOOTER FUNCTION: Adds the "VYAPARI AI" tag to every page
# ==============================================================================
def add_footer(canvas, doc):
    """This function is called on every page and draws the footer in the bottom-right."""
    canvas.saveState()
    
    # 1. Define the style for the Paragraph
    style = ParagraphStyle(
        name='Footer',
        fontName='Helvetica',
        fontSize=8,
        textColor=colors.black,
        alignment=TA_RIGHT
    )
    
    # 2. Define the text with the hyperlink
    link_text = '<a href="https://vyapari.vercel.app/">Created using VYAPARI AI</a>'
    
    # 3. Create a Paragraph object
    p = Paragraph(link_text, style)
    
    # 4. Wrap the paragraph to calculate its size and draw it
    p.wrapOn(canvas, doc.width, doc.bottomMargin)
    p.drawOn(canvas, doc.leftMargin, doc.bottomMargin - 7 * mm)
    
    canvas.restoreState()

# ==============================================================================
# CORE LOGIC: Creates the story (content) for a single invoice page
# ==============================================================================
def create_invoice_page_story(invoice_data, styles, doc_width, copy_type=""):
    """Generates the list of ReportLab flowables for a single invoice page."""
    story = []

    if copy_type:
        story.append(Paragraph(copy_type, styles['CopyLabel']))
        story.append(Spacer(1, 5 * mm))

    # --- Header with Logo and Invoice Details ---
    header_content = []
    logo_url = safe_get(invoice_data, 'company.logo_url')
    logo_image = None
    
    if logo_url:
        try:
            response = requests.get(logo_url, stream=True)
            if response.status_code == 200:
                image_data = BytesIO(response.content)
                logo_image = Image(image_data, width=40 * mm, height=15 * mm)
                logo_image.hAlign = 'LEFT'
        except Exception as e:
            print(f"Warning: Could not fetch or process logo from URL {logo_url}. Error: {e}")
            logo_image = None

    header_content.append(logo_image or Paragraph(safe_get(invoice_data, 'company.name'), styles['CompanyHeader']))

    invoice_details_content = [
        [Paragraph("INVOICE", styles['Title'])],
        [Spacer(1, 2 * mm)],
        [Paragraph(f"<b>Invoice #:</b> {safe_get(invoice_data, 'invoice.number')}", styles['Header'])],
        [Paragraph(f"<b>Date:</b> {safe_get(invoice_data, 'invoice.date')}", styles['Header'])],
        [Paragraph(f"<b>Due Date:</b> {safe_get(invoice_data, 'invoice.due_date')}", styles['Header'])]
    ]
    header_table = Table([[header_content, Table(invoice_details_content)]], colWidths=[doc_width * 0.5, doc_width * 0.5])
    header_table.setStyle(TableStyle([('VALIGN', (0, 0), (-1, -1), 'TOP')]))
    story.append(header_table)
    story.append(Spacer(1, 10 * mm))

    # --- Company and Buyer Details ---
    company_details_para = [
        Paragraph("FROM:", styles['SectionHeader']),
        Paragraph(f"<b>{safe_get(invoice_data, 'company.name')}</b>", styles['NormalLeft']),
        Paragraph(safe_get(invoice_data, 'company.address'), styles['NormalLeft']),
        Paragraph(f"<b>GSTIN:</b> {safe_get(invoice_data, 'company.gstin')}", styles['NormalLeft'])
    ]
    buyer_details_para = [
        Paragraph("BILL TO:", styles['SectionHeader']),
        Paragraph(f"<b>{safe_get(invoice_data, 'buyer.name')}</b>", styles['NormalLeft']),
        Paragraph(safe_get(invoice_data, 'buyer.address'), styles['NormalLeft']),
        Paragraph(f"<b>GSTIN:</b> {safe_get(invoice_data, 'buyer.gstin')}", styles['NormalLeft'])
    ]
    details_table = Table([[company_details_para, buyer_details_para]], colWidths=[doc_width / 2, doc_width / 2], hAlign='LEFT')
    details_table.setStyle(TableStyle([('VALIGN', (0, 0), (-1, -1), 'TOP')]))
    story.append(details_table)
    story.append(Spacer(1, 10 * mm))
    
    # --- Items Table ---
    is_b2b_invoice = bool(safe_get(invoice_data, 'buyer.gstin'))
    if is_b2b_invoice:
        items_header = [Paragraph(h, s) for h, s in zip(
            ['#', 'Item & Description', 'HSN', 'Qty', 'Rate', 'Taxable Value', 'GST', 'Total'],
            [styles['TableHead'], styles['TableHead'], styles['TableHeadRight'], styles['TableHeadRight'], styles['TableHeadRight'], styles['TableHeadRight'], styles['TableHeadRight'], styles['TableHeadRight']]
        )]
        col_widths = [doc_width*0.05, doc_width*0.30, doc_width*0.10, doc_width*0.07, doc_width*0.12, doc_width*0.12, doc_width*0.07, doc_width*0.17]
    else:
        items_header = [Paragraph(h, styles['TableHead']) for h in ['#', 'Item & Description', 'Qty', 'Rate', 'Amount']]
        col_widths = [doc_width*0.05, doc_width*0.55, doc_width*0.13, doc_width*0.13, doc_width*0.14]

    items_data = [items_header]
    tax_summary = {}
    total_taxable_value = Decimal('0.00')

    for i, item in enumerate(safe_get(invoice_data, 'items', []), 1):
        quantity = Decimal(safe_get(item, 'quantity', 0))
        rate = Decimal(safe_get(item, 'rate', 0))
        gst_rate = Decimal(safe_get(item, 'gst_rate', 0))
        taxable_value = quantity * rate
        total_taxable_value += taxable_value
        tax_amount = taxable_value * (gst_rate / 100)
        total_item_value = taxable_value + tax_amount

        if is_b2b_invoice:
            row = [
                Paragraph(str(i), styles['TableBody']), Paragraph(safe_get(item, 'name'), styles['TableBody']),
                Paragraph(safe_get(item, 'hsn'), styles['TableBodyRight']), Paragraph(f"{quantity}", styles['TableBodyRight']),
                Paragraph(f"{rate:,.2f}", styles['TableBodyRight']), Paragraph(f"{taxable_value:,.2f}", styles['TableBodyRight']),
                Paragraph(f"{gst_rate}%", styles['TableBodyRight']), Paragraph(f"{total_item_value:,.2f}", styles['TableBodyRight'])
            ]
        else:
            inclusive_rate = total_item_value / quantity if quantity != 0 else 0
            row = [
                Paragraph(str(i), styles['TableBody']), Paragraph(safe_get(item, 'name'), styles['TableBody']),
                Paragraph(f"{quantity}", styles['TableBodyRight']), Paragraph(f"{inclusive_rate:,.2f}", styles['TableBodyRight']),
                Paragraph(f"{total_item_value:,.2f}", styles['TableBodyRight'])
            ]
        items_data.append(row)
        if gst_rate not in tax_summary:
            tax_summary[gst_rate] = {'taxable_value': Decimal('0.00'), 'tax_amount': Decimal('0.00')}
        tax_summary[gst_rate]['taxable_value'] += taxable_value
        tax_summary[gst_rate]['tax_amount'] += tax_amount
    
    items_table = Table(items_data, colWidths=col_widths, repeatRows=1)
    items_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), PRIMARY_COLOR), ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke), ('LINEBELOW', (0, 0), (-1, 0), 1, PRIMARY_COLOR),
        ('LINEBELOW', (0, -1), (-1, -1), 1, colors.lightgrey), ('LEFTPADDING', (0, 0), (-1, -1), 6),
        ('RIGHTPADDING', (0, 0), (-1, -1), 6), ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4), *[('BACKGROUND', (0, i), (-1, i), LIGHT_GREY) for i in range(1, len(items_data)) if i % 2 != 0]
    ]))
    story.append(items_table)
    story.append(Spacer(1, 8 * mm))

    # --- Totals Section ---
    grand_total = total_taxable_value + sum(v['tax_amount'] for v in tax_summary.values())
    rounded_total = grand_total.quantize(Decimal('0'), rounding=ROUND_HALF_UP)
    round_off = rounded_total - grand_total

    summary_content = []
    if is_b2b_invoice:
        summary_content.append(['Subtotal:', f"{total_taxable_value:,.2f}"])
        is_interstate = safe_get(invoice_data, 'company.state') != safe_get(invoice_data, 'buyer.state')
        for rate, values in sorted(tax_summary.items()):
            tax = values['tax_amount']
            if is_interstate:
                summary_content.append([f"IGST @ {rate}%:", f"{tax:,.2f}"])
            else:
                cgst, sgst = tax / 2, tax / 2
                summary_content.append([f"CGST @ {rate/2}%:", f"{cgst:,.2f}"])
                summary_content.append([f"SGST @ {rate/2}%:", f"{sgst:,.2f}"])
        if abs(round_off) > 0.005:
            summary_content.append(['Round Off:', f"{round_off:,.2f}"])
    
    summary_styled = [[Paragraph(label, styles['TotalLabel']), Paragraph(value, styles['TotalLabel'])] for label, value in summary_content]
    summary_styled.append([Paragraph('Total', styles['TotalValue']), Paragraph(f"<b>₹ {rounded_total:,.2f}</b>", styles['TotalValue'])])
    
    totals_table = Table([['', Table(summary_styled)]], colWidths=[doc_width * 0.6, doc_width * 0.4])
    totals_table.setStyle(TableStyle([('VALIGN', (0, 0), (-1, -1), 'TOP')]))
    story.append(totals_table)
    story.append(Spacer(1, 4 * mm))

    # --- Amount in Words ---
    amount_in_words_text = f"Rupees {number_to_words_indian(rounded_total)} Only"
    amount_in_words_para = Paragraph(f"<b>Amount in Words:</b> {amount_in_words_text}", styles['NormalLeft'])
    story.append(amount_in_words_para)
    story.append(Spacer(1, 10 * mm))
    
    # --- Footer with Bank and Terms ---
    terms_list = safe_get(invoice_data, 'terms_and_conditions', [])
    formatted_terms = []
    for i, term in enumerate(terms_list):
        if re.match(r'^\d+\.\s*', term.strip()):
            formatted_terms.append(term.strip())
        else:
            formatted_terms.append(f"{i+1}. {term.strip()}")
    terms_text = "<br/>".join(formatted_terms)
    terms_para = Paragraph(terms_text, styles['NormalLeft'])
    
    bank_details_text = f"<b>Bank:</b> {safe_get(invoice_data, 'bank.name')}<br/><b>A/C No:</b> {safe_get(invoice_data, 'bank.account')}<br/><b>IFSC:</b> {safe_get(invoice_data, 'bank.branch_ifsc')}"
    bank_para = Paragraph(bank_details_text, styles['NormalLeft'])

    terms_and_bank_table = Table([
        [Paragraph("Terms & Conditions", styles['SectionHeader']), Paragraph("Bank Details", styles['SectionHeader'])],
        [terms_para, bank_para]
    ], colWidths=[doc_width * 0.6, doc_width * 0.4], hAlign='LEFT')
    terms_and_bank_table.setStyle(TableStyle([('VALIGN', (0, 0), (-1, -1), 'TOP')]))
    story.append(terms_and_bank_table)

    # # --- Signatures ---
    # seller_signature_text = f"For <b>{safe_get(invoice_data, 'company.name')}</b>"
    # signature_table = Table(
    #     [
    #         [Spacer(1, 15*mm), Spacer(1, 15*mm)],
    #         [Paragraph('_________________________', styles['Signature']), Paragraph('_________________________', styles['Signature'])],
    #         [Paragraph('Authorized Signatory', styles['Signature']), Paragraph("Buyer's Signature", styles['Signature'])],
    #         [Paragraph(seller_signature_text, styles['Signature']), '']
    #     ], 
    #     colWidths=[doc_width / 2, doc_width / 2]
    # )
    # signature_table.setStyle(TableStyle([('VALIGN', (0, 0), (-1, -1), 'TOP'), ('ALIGN', (0, 0), (-1, -1), 'CENTER')]))
    # story.append(signature_table)

    # return story

    # --- Signatures ---
    seller_signature_text = f"For <b>{safe_get(invoice_data, 'company.name')}</b>"
    
    # NEW: Logic to fetch and display the buyer's signature image
    buyer_signature_content = Paragraph('_________________________', styles['Signature']) # Default to a line
    signature_url = safe_get(invoice_data, 'buyer.signature_url')
    if signature_url:
        try:
            response = requests.get(signature_url, stream=True)
            if response.status_code == 200:
                image_data = BytesIO(response.content)
                # Adjust width and height as needed for your signature images
                signature_image = Image(image_data, width=40 * mm, height=15 * mm)
                signature_image.hAlign = 'CENTER'
                buyer_signature_content = signature_image
        except Exception as e:
            print(f"Warning: Could not fetch buyer signature. Error: {e}")
            # If fetching fails, it will fall back to the default line

    signature_table = Table(
        [
            [Spacer(1, 15*mm), Spacer(1, 15*mm)],
            # The buyer's signature content is now dynamic
            [Paragraph('_________________________', styles['Signature']), buyer_signature_content],
            [Paragraph('Authorized Signatory', styles['Signature']), Paragraph("Buyer's Signature", styles['Signature'])],
            [Paragraph(seller_signature_text, styles['Signature']), ''] 
        ], 
        colWidths=[doc_width / 2, doc_width / 2]
    )
    signature_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER')
    ]))
    story.append(signature_table)

    return story


# ==============================================================================
# MAIN FUNCTION: Builds the final PDF document
# ==============================================================================
def generate_final_invoice(invoice_data, filename="final_invoice.pdf"):
    """
    Main function to generate the invoice PDF.
    Handles single or multi-copy generation based on `generate_copies` flag.
    """
    doc = SimpleDocTemplate(filename, pagesize=A4,
                            topMargin=15 * mm, bottomMargin=20 * mm,
                            leftMargin=15 * mm, rightMargin=15 * mm)

    # --- Custom Styles ---
    styles = getSampleStyleSheet()
    
    title_style = styles['Title']
    title_style.fontName = 'Helvetica-Bold'
    title_style.fontSize = 22
    title_style.alignment = TA_RIGHT
    title_style.textColor = PRIMARY_COLOR

    styles.add(ParagraphStyle(name='CompanyHeader', fontName='Helvetica-Bold', fontSize=16, textColor=BLACK_COLOR, leading=18))
    styles.add(ParagraphStyle(name='Header', fontName='Helvetica', fontSize=10, alignment=TA_RIGHT, textColor=BLACK_COLOR))
    styles.add(ParagraphStyle(name='CopyLabel', fontName='Helvetica-Bold', fontSize=14, alignment=TA_CENTER, textColor=colors.grey, spaceAfter=6))
    styles.add(ParagraphStyle(name='SectionHeader', fontName='Helvetica-Bold', fontSize=11, alignment=TA_LEFT, textColor=PRIMARY_COLOR, spaceBefore=8, spaceAfter=4))
    styles.add(ParagraphStyle(name='NormalLeft', parent=styles['Normal'], alignment=TA_LEFT, fontSize=10, leading=14, textColor=BLACK_COLOR))
    styles.add(ParagraphStyle(name='TableHead', fontName='Helvetica-Bold', fontSize=10, alignment=TA_CENTER, textColor=colors.whitesmoke))
    styles.add(ParagraphStyle(name='TableHeadRight', parent=styles['TableHead'], alignment=TA_RIGHT))
    styles.add(ParagraphStyle(name='TableBody', fontName='Helvetica', fontSize=10, alignment=TA_LEFT, textColor=BLACK_COLOR))
    styles.add(ParagraphStyle(name='TableBodyRight', parent=styles['TableBody'], alignment=TA_RIGHT))
    styles.add(ParagraphStyle(name='TotalLabel', fontName='Helvetica', fontSize=10, alignment=TA_RIGHT, textColor=BLACK_COLOR))
    styles.add(ParagraphStyle(name='TotalValue', fontName='Helvetica-Bold', fontSize=12, alignment=TA_RIGHT, textColor=BLACK_COLOR))
    styles.add(ParagraphStyle(name='Signature', parent=styles['Normal'], alignment=TA_CENTER, fontSize=10, textColor=BLACK_COLOR))

    master_story = []
    doc_width = doc.width

    # --- **FIXED**: LOGIC FOR DUPLICATE/TRIPLICATE ---
    # This logic now correctly interprets a boolean 'true' from the frontend.
    generate_copies_value = safe_get(invoice_data, 'generate_copies', False)

    if generate_copies_value is True:
        # If frontend sends 'true', generate all three default copies.
        copy_types = ["ORIGINAL COPY", "DUPLICATE COPY", "TRIPLICATE COPY"]
    elif isinstance(generate_copies_value, list) and generate_copies_value:
        # If frontend sends a specific list, use that.
        copy_types = generate_copies_value
    else:
        # Otherwise, default to a single copy with no label.
        copy_types = ['']

    for i, copy_type in enumerate(copy_types):
        page_story = create_invoice_page_story(invoice_data, styles, doc_width, copy_type)
        master_story.extend(page_story)
        
        if i < len(copy_types) - 1:
            master_story.append(PageBreak())
    
    try: 
        doc.build(master_story, onFirstPage=add_footer, onLaterPages=add_footer)
        print(f"✅ Successfully generated final invoice: {filename}")
        return filename
    except Exception as e: 
        print(f"❌ Error building PDF: {e}")
        return None
    
# ==============================================================================
import os
import datetime
from num2words import num2words
from reportlab.pdfgen import canvas
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
# MODIFIED: Import StyleSheet1 to create a fresh stylesheet
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle, StyleSheet1
from reportlab.lib.enums import TA_RIGHT, TA_LEFT, TA_CENTER
from reportlab.lib.colors import HexColor, black, gray
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm

def generate_invoice_pdf4(data: dict, file_path: str = None) -> str:
    """
    Generates a modern, professional PDF invoice from a dictionary of data.

    This function enhances the visual design with improved typography, spacing,
    and a clean layout, while remaining compatible with the original data structure.
    It includes a fix for the 'Style already defined' error in server environments.

    Args:
        data (dict): A dictionary containing all the necessary invoice information.
        file_path (str, optional): The full path to save the PDF. 
                                   If None, a default name is generated.

    Returns:
        str: The file path to the generated PDF invoice.
    """
    # --- 1. Data Extraction (Safe extraction with defaults) ---
    # This block is compatible with your original data structure.
    company_name = (data.get("company", {}).get("name") or "Your Company Name").strip()
    company_address = str(data.get("company", {}).get("address") or "123 Business Rd\nCity, State 560001").strip()
    company_gstin = (data.get("company", {}).get("gstin") or "YOUR_GSTIN").strip()
    company_email = (data.get("company", {}).get("email") or "contact@yourcompany.com").strip()
    company_pan = (data.get("company", {}).get("pan") or "").strip() 

    company_bank_name = (data.get("bank", {}).get("name") or "Your Bank Name").strip()
    company_account_no = (data.get("bank", {}).get("account") or "1234567890").strip()
    company_ifsc_code = (data.get("bank", {}).get("branch_ifsc") or "YOURBANK001").strip()

    buyer_name = (data.get("buyer", {}).get("name") or "Customer Name").strip()
    buyer_address = str(data.get("buyer", {}).get("address") or "456 Client Ave\nClient City, State 110001").strip()
    buyer_gstin = (data.get("buyer", {}).get("gstin") or "CUSTOMER_GSTIN").strip()

    invoice_no = (data.get('invoice', {}).get('number') or "INV-001").strip()
    invoice_date_str = (data.get("invoice", {}).get('date') or datetime.date.today().strftime('%d %b, %Y')).strip()
    
    # Use .get() with a default of [] for items
    items = data.get("items", [])
    if not isinstance(items, list):
        items = []

    # Calculate totals from items list
    subtotal = sum(item.get('amount', 0) for item in items)
    cgst_amount = sum(item.get('gst_amount', 0) for item in items) / 2 # Assuming equal split
    sgst_amount = sum(item.get('gst_amount', 0) for item in items) / 2
    
    amount_in_words = data.get("amount_in_words", "Zero Only")
    
    # --- 2. PDF Setup ---
    if file_path is None:
        folder = "invoices"
        os.makedirs(folder, exist_ok=True)
        safe_now = datetime.datetime.now().strftime("%Y-%m-%d_%H-%M-%S")
        file_path = os.path.join(folder, f"invoice_{company_name.replace(' ', '_')}_{safe_now}.pdf")

    width, height = A4
    margin = 15 * mm
    doc = SimpleDocTemplate(file_path, pagesize=A4,
                            leftMargin=margin, rightMargin=margin,
                            topMargin=margin, bottomMargin=margin)

    # --- 3. Styles and Colors ---
    primary_color = HexColor("#003366")
    secondary_color = HexColor("#F0F0F0")
    text_color = HexColor("#333333")
    
    # CORRECTED: Create a new, independent stylesheet for each run.
    styles = StyleSheet1()
    styles.add(ParagraphStyle(name='Normal', fontName='Helvetica', fontSize=9, textColor=text_color, leading=12))
    styles.add(ParagraphStyle(name='BodyText', parent=styles['Normal']))
    styles.add(ParagraphStyle(name='H1', parent=styles['Normal'], fontName='Helvetica-Bold', fontSize=18, textColor=primary_color, spaceAfter=6, leading=22))
    styles.add(ParagraphStyle(name='H2', parent=styles['Normal'], fontName='Helvetica-Bold', fontSize=14, textColor=primary_color, spaceAfter=4, leading=18))
    styles.add(ParagraphStyle(name='BodyBold', parent=styles['BodyText'], fontName='Helvetica-Bold'))
    styles.add(ParagraphStyle(name='BodyRight', parent=styles['BodyText'], alignment=TA_RIGHT))
    styles.add(ParagraphStyle(name='BodyBoldRight', parent=styles['BodyBold'], alignment=TA_RIGHT))
    styles.add(ParagraphStyle(name='TableHead', parent=styles['BodyBold'], alignment=TA_CENTER, textColor=black))
    styles.add(ParagraphStyle(name='SmallText', parent=styles['BodyText'], fontSize=8))
    
    story = []

    # --- 4. Header Section ---
    header_data = [
        [
            [
                Paragraph(company_name.upper(), styles['H2']),
                Spacer(1, 2*mm),
                Paragraph(company_address.replace('\n', '<br/>'), styles['BodyText']),
                Paragraph(f"<b>GSTIN:</b> {company_gstin}", styles['BodyText']),
                Paragraph(f"<b>Email:</b> {company_email}", styles['BodyText']),
            ],
            [
                Paragraph("INVOICE", styles['H1']),
                Spacer(1, 2*mm),
                Table([
                    [Paragraph("<b>Invoice #:</b>", styles['BodyRight']), Paragraph(invoice_no, styles['BodyText'])],
                    [Paragraph("<b>Date:</b>", styles['BodyRight']), Paragraph(invoice_date_str, styles['BodyText'])],
                ], colWidths=['*', '50%'], style=[('VALIGN', (0,0), (-1,-1), 'TOP')])
            ]
        ]
    ]
    header_table = Table(header_data, colWidths=[width * 0.55, width * 0.45 - (2*margin)])
    header_table.setStyle(TableStyle([('VALIGN', (0, 0), (-1, -1), 'TOP'), ('LEFTPADDING', (0,0),(-1,-1),0), ('RIGHTPADDING', (0,0),(-1,-1),0)]))
    story.append(header_table)
    story.append(Spacer(1, 10 * mm))

    # --- 5. Bill To Section ---
    bill_to_data = [
        [Paragraph("BILL TO:", styles['H2'])], [Spacer(1, 3*mm)],
        [Paragraph(buyer_name, styles['BodyBold'])],
        [Paragraph(buyer_address.replace('\n', '<br/>'), styles['BodyText'])],
        [Paragraph(f"<b>GSTIN:</b> {buyer_gstin}", styles['BodyText'])],
    ]
    bill_to_table = Table(bill_to_data, colWidths=[width - 2 * margin])
    bill_to_table.setStyle(TableStyle([('VALIGN', (0, 0), (-1, -1), 'TOP'), ('LEFTPADDING', (0,0),(-1,-1),0)]))
    story.append(bill_to_table)
    story.append(Spacer(1, 10 * mm))

    # --- 6. Items Table ---
    item_table_data = [
        [Paragraph("Sr.", styles['TableHead']), Paragraph("Description", styles['TableHead']),
         Paragraph("HSN/SAC", styles['TableHead']), Paragraph("Qty", styles['TableHead']),
         Paragraph("Rate", styles['TableHead']), Paragraph("Amount", styles['TableHead'])]
    ]
    for i, item in enumerate(items, 1):
        item_table_data.append([
            Paragraph(str(i), styles['BodyText']),
            Paragraph(str(item.get("name", "")), styles['BodyText']),
            Paragraph(str(item.get("hsn", "")), styles['BodyText']),
            Paragraph(f"{item.get('quantity', 0)} {item.get('unit', '')}".strip(), styles['BodyRight']),
            Paragraph(f"{item.get('rate', 0.0):,.2f}", styles['BodyRight']),
            Paragraph(f"{item.get('amount', 0.0):,.2f}", styles['BodyRight'])
        ])
        
    item_table_col_widths = [15*mm, 70*mm, 20*mm, 20*mm, 25*mm, 30*mm]
    item_table = Table(item_table_data, colWidths=item_table_col_widths, repeatRows=1)
    item_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), secondary_color), ('GRID', (0, 0), (-1, -1), 1, gray),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'), ('LEFTPADDING', (0, 0), (-1, -1), 5),
        ('RIGHTPADDING', (0, 0), (-1, -1), 5), ('TOPPADDING', (0, 0), (-1, -1), 3),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
    ]))
    story.append(item_table)
    
    # --- 7. Totals Section ---
    grand_total = subtotal + cgst_amount + sgst_amount
    
    totals_data = [
        ['Subtotal', f'{subtotal:,.2f}'],
        ['CGST', f'{cgst_amount:,.2f}'],
        ['SGST', f'{sgst_amount:,.2f}'],
        [Paragraph('<b>Grand Total</b>', styles['BodyBoldRight']), Paragraph(f'<b>₹ {grand_total:,.2f}</b>', styles['BodyBoldRight'])]
    ]
    
    totals_table = Table(totals_data, colWidths=['*', 50*mm])
    totals_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'), ('LEFTPADDING', (0,0),(-1,-1),0),
        ('LINEABOVE', (0, -1), (-1, -1), 1, black), ('ALIGN', (0, 0), (-1, -1), 'RIGHT'),
    ]))
    
    wrapper_table = Table([[totals_table]], colWidths=[width - 2*margin])
    wrapper_table.setStyle(TableStyle([('ALIGN', (0,0),(-1,-1),'RIGHT'), ('LEFTPADDING', (0,0),(-1,-1),0)]))
    story.append(wrapper_table)
    story.append(Spacer(1, 10 * mm))
    
    # --- 8. Amount in Words & Bank Details ---
    final_section_data = [
        [
            [
                Paragraph("Amount in Words:", styles['BodyBold']),
                Paragraph(amount_in_words, styles['BodyText']),
                Spacer(1, 8*mm),
                Paragraph("Terms & Conditions:", styles['BodyBold']),
                Paragraph("1. Goods once sold will not be taken back.", styles['SmallText']),
            ],
            [
                Paragraph("Bank Details:", styles['BodyBold']),
                Paragraph(f"Bank: {company_bank_name}", styles['BodyText']),
                Paragraph(f"A/C No: {company_account_no}", styles['BodyText']),
                Paragraph(f"IFSC: {company_ifsc_code}", styles['BodyText']),
                Spacer(1, 15*mm),
                Paragraph("For " + company_name, styles['BodyText']),
                Spacer(1, 15*mm),
                Paragraph("Authorised Signatory", styles['BodyText']),
            ]
        ]
    ]
    
    final_table = Table(final_section_data, colWidths=[width * 0.55, width * 0.45 - (2*margin)])
    final_table.setStyle(TableStyle([('VALIGN', (0, 0), (-1, -1), 'TOP'), ('LINEABOVE', (1, 4), (1, 4), 0.5, gray)]))
    story.append(final_table)
    
    # --- 9. Footer ---
    def footer(canvas, doc):
        canvas.saveState()
        canvas.setFont('Helvetica', 8)
        canvas.setFillColor(gray)
        footer_text = "This is a computer-generated invoice."
        canvas.drawCentredString(width / 2.0, margin / 2, footer_text)
        canvas.restoreState()

    doc.build(story, onFirstPage=footer, onLaterPages=footer)
    
    return file_path