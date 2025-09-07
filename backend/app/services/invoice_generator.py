import os
import re
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
import datetime
from num2words import num2words
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, Frame,PageBreak,PageTemplate
from reportlab.lib.styles import getSampleStyleSheet,ParagraphStyle
from reportlab.lib import colors
from reportlab.lib.enums import TA_RIGHT, TA_CENTER, TA_LEFT
from datetime import datetime


def generate_invoice_pdf1(data):
    # --- Data Extraction with Defaults ---
    # print(1)
    company_name = (data.get("company_name") or "").strip()
    company_gstin = (data.get("company_gstin") or "").strip()
    company_address_lines = str(data.get("company_address") or "").strip().split('\n')
    company_pan = (data.get("company_pan") or "").strip()
    company_bank_name = (data.get("company_bank_name") or "").strip()
    company_account_no = (data.get("company_account_no") or "").strip()
    company_ifsc_code = (data.get("company_ifsc_code") or "").strip()
    company_bank_branch = (data.get("company_bank_branch") or "").strip()
    invoice_no=(data.get('invoice_no') or "").strip()
    # print(2)

    buyer_name = (data.get("buyer_name") or "").strip()
    buyer_address_lines = str(data.get("buyer_address") or "").strip().split('\n')
    buyer_gstin = (data.get("buyer_gstin") or "").strip()
    buyer_mobile = (data.get("buyer_mobile") or "").strip()

    irn = (data.get("irn") or "").strip()
    ack_no = (data.get("ack_no") or " ").strip()
    ack_date = (data.get("ack_date") or datetime.now().strftime('%d %b %y').upper()).strip()
    invoice_date = (data.get("invoice_date") or datetime.now().strftime('%d %b %y').upper()).strip()
    delivery_note = (data.get("delivery_note") or "").strip()
    mode_of_payment = (data.get("mode_of_payment") or "").strip()
    reference_no = (data.get("reference_no") or "").strip()
    other_references = (data.get("other_references") or "").strip()
    buyer_order_no = (data.get("buyer_order_no") or "").strip()
    buyer_order_date = (data.get("buyer_order_date") or "").strip()
    dispatch_doc_no = (data.get("dispatch_doc_no") or "").strip()
    dispatch_date = (data.get("dispatch_date") or "").strip()
    dispatched_through = (data.get("dispatched_through") or "").strip()
    destination = (data.get("destination") or "").strip()
    bill_of_lading_no = (data.get("bill_of_lading_no") or "").strip()
    bill_of_lading_date = (data.get("bill_of_lading_date") or "").strip()
    motor_vehicle_no = (data.get("motor_vehicle_no") or "").strip()
    terms_of_delivery = (data.get("terms_of_delivery") or "").strip()
    # print(3)

    items = data.get("product", [])
    if not isinstance(items, list):
        raise ValueError("Product items must be a list of dictionaries.")

    packing_and_forwarding = data.get("packing_and_forwarding", 0.0)
    round_off = data.get("round_off", 0.0)
    cgst_rate = data.get("cgst_rate", 0.0)
    sgst_rate = data.get("sgst_rate", 0.0)

    # --- PDF Setup ---
    folder = os.path.join("invoices")
    os.makedirs(folder, exist_ok=True)
    now = datetime.datetime.now()
    safe_now = now.strftime("%Y-%m-%d_%H-%M-%S")  # replace : with -

    file_name = f"invoice_{safe_now}.pdf"
    file_path = os.path.join(folder, file_name)
    # print(4)

    # Define margins globally within the function
    margin = 10 * mm
    width, height = A4

    # The main document template, with margins
    doc = SimpleDocTemplate(file_path, pagesize=A4,
                            leftMargin=margin, rightMargin=margin,
                            topMargin=margin, bottomMargin=margin)

    styles = getSampleStyleSheet()
    style_normal = styles['Normal']
    style_normal.fontSize = 7
    style_normal.leading = 8 # Line spacing

    style_bold = styles['Normal']
    style_bold.fontSize = 7
    style_bold.fontName = 'Helvetica-Bold'
    style_bold.leading = 8

    style_header = styles['Normal']
    style_header.fontSize = 16
    style_header.fontName = 'Helvetica-Bold'
    style_header.alignment = TA_CENTER

    style_right = styles['Normal']
    style_right.fontSize = 7
    style_right.alignment = TA_RIGHT

    style_center = styles['Normal']
    style_center.fontSize = 7
    style_center.alignment = TA_CENTER

    story = []

    # --- Header & Footer Drawing Function ---
    def header_footer_template_elements(canvas_obj, doc_obj):
        canvas_obj.saveState()
        
        # Outer Border
        canvas_obj.rect(margin, margin, width - 2 * margin, height - 2 * margin)

        # Header Box (Fixed at top)
        header_box_height = 34 * mm
        # Draw line dividing header from content area (below header_box_height from top edge)
        canvas_obj.line(margin, height - margin - header_box_height, width - margin, height - margin - header_box_height)
        
        y_start_header_text = height - margin - 5 * mm
        canvas_obj.setFont("Helvetica-Bold", 16)
        canvas_obj.drawCentredString(width / 2, y_start_header_text, "TAX INVOICE")

        canvas_obj.setFont("Helvetica-Bold", 10)
        canvas_obj.drawString(width - margin - 40 * mm, y_start_header_text, "e-Invoice")

        canvas_obj.setFont("Helvetica", 7)
        canvas_obj.drawString(margin + 2 * mm, y_start_header_text - 7 * mm, "IRN:")
        canvas_obj.drawString(margin + 2 * mm, y_start_header_text - 10 * mm, irn)
        canvas_obj.drawString(margin + 2 * mm, y_start_header_text - 14 * mm, "Ack No.:")
        canvas_obj.drawString(margin + 2 * mm, y_start_header_text - 17 * mm, ack_no)
        canvas_obj.drawString(margin + 2 * mm, y_start_header_text - 21 * mm, "Ack Date:")
        canvas_obj.drawString(margin + 2 * mm, y_start_header_text - 24 * mm, ack_date)

        # Footer (Fixed at bottom)
        canvas_obj.setFont("Helvetica-Oblique", 6)
        canvas_obj.drawCentredString(width / 2, margin + 3 * mm, "This is a Computer Generated Invoice")
        
        # Page Number
        canvas_obj.drawString(width - margin - 20*mm, margin + 3 * mm, f"Page {doc_obj.page}")

        canvas_obj.restoreState()

    # Define a frame for the main content area, excluding the fixed header/footer space
    # The header box is 34mm high, and the top margin is 10mm. So content starts at height - 10mm (top margin) - 34mm (header box)
    # The bottom content ends at the bottom margin (10mm)
    frame_top_y = height - margin - 34 * mm # Top of content frame
    frame_height = frame_top_y - margin     # Height of content frame
    
    # Create the main frame for the document content
    main_frame = Frame(doc.leftMargin, doc.bottomMargin,
                       doc.width, doc.height - (34 * mm),  # Adjusted height for header box
                       leftPadding=0, bottomPadding=0,
                       rightPadding=0, topPadding=0,
                       id='normal')
  
    # Create a PageTemplate with our header/footer function and the main frame
    # We set the 'onPage' callback to draw our fixed elements
    doc.addPageTemplates([
        PageTemplate(id='AllPages', frames=main_frame, onPage=header_footer_template_elements)
    ])


    # --- Company and Buyer Details Section (Table) ---
    company_address_text = "<br/>".join(company_address_lines)
    buyer_address_text = "<br/>".join(buyer_address_lines)

    company_data = [
        [Paragraph(f"<font name='Helvetica-Bold' size='7'>{company_name}</font>", style_normal)],
        [Paragraph(f"<font size='6'>{company_address_text}</font>", style_normal)],
        [Paragraph(f"<font size='6'>GSTIN/UIN: {company_gstin}</font>", style_normal)],
        [Paragraph(f"<font size='6'>PAN/DLEPM: {company_pan}</font>", style_normal)]
    ]
    buyer_data = [
        [Paragraph("<font name='Helvetica-Bold' size='7'>Consignee (Ship to)</font>", style_normal)],
        [Paragraph(f"<font size='7'>{buyer_name}</font>", style_normal)],
        [Paragraph(f"<font size='6'>{buyer_address_text}</font>", style_normal)],
        [Paragraph(f"<font size='6'>Mobile No.: {buyer_mobile}</font>", style_normal)],
        [Paragraph(f"<font size='6'>GSTIN/UIN: {buyer_gstin}</font>", style_normal)]
    ]

    company_table = Table(company_data, colWidths=[(width - 2 * margin) / 2 - 2 * mm])
    company_table.setStyle(TableStyle([
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('LEFTPADDING', (0,0), (-1,-1), 2*mm),
        ('RIGHTPADDING', (0,0), (-1,-1), 2*mm),
        ('TOPPADDING', (0,0), (-1,-1), 0),
        ('BOTTOMPADDING', (0,0), (-1,-1), 0),
    ]))

    buyer_table = Table(buyer_data, colWidths=[(width - 2 * margin) / 2 - 2 * mm])
    buyer_table.setStyle(TableStyle([
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('LEFTPADDING', (0,0), (-1,-1), 2*mm),
        ('RIGHTPADDING', (0,0), (-1,-1), 2*mm),
        ('TOPPADDING', (0,0), (-1,-1), 0),
        ('BOTTOMPADDING', (0,0), (-1,-1), 0),
    ]))

    company_buyer_combined_data = [[company_table, buyer_table]]
    company_buyer_table = Table(company_buyer_combined_data, colWidths=[(width - 2 * margin) / 2, (width - 2 * margin) / 2])
    company_buyer_table.setStyle(TableStyle([
        ('BOX', (0, 0), (-1, -1), 0.25, colors.black),
        ('LINEAFTER', (0, 0), (0, -1), 0.25, colors.black),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('TOPPADDING', (0,0), (-1,-1), 0),
        ('BOTTOMPADDING', (0,0), (-1,-1), 0),
        ('LEFTPADDING', (0,0), (-1,-1), 0),
        ('RIGHTPADDING', (0,0), (-1,-1), 0),
    ]))
    story.append(company_buyer_table)
    story.append(Spacer(0, 2*mm))
    
    # --- Invoice Details Grid (Table) ---
    invoice_details_data = [
        [Paragraph("Invoice No.", style_normal), Paragraph(str(invoice_no or ""), style_normal), Paragraph("Dated", style_normal), Paragraph(str(invoice_date or ""), style_normal)],
        [Paragraph("Delivery Note", style_normal), Paragraph(str(delivery_note or ""), style_normal), Paragraph("Mode/Terms of Payment", style_normal), Paragraph(str(mode_of_payment or ""), style_normal)],
        [Paragraph("Reference No.", style_normal), Paragraph(str(reference_no or ""), style_normal), Paragraph("Other Reference(s)", style_normal), Paragraph(str(other_references or ""), style_normal)],
        [Paragraph("Buyer's Order No.", style_normal), Paragraph(str(buyer_order_no or ""), style_normal), Paragraph("Dated", style_normal), Paragraph(str(buyer_order_date or ""), style_normal)],
        [Paragraph("Dispatch Doc No.", style_normal), Paragraph(str(dispatch_doc_no or ""), style_normal), Paragraph("Delivery Note Date", style_normal), Paragraph(str(dispatch_date or ""), style_normal)],
        [Paragraph("Dispatched Through", style_normal), Paragraph(str(dispatched_through or ""), style_normal), Paragraph("Destination", style_normal), Paragraph(str(destination or ""), style_normal)],
        [Paragraph("Bill of Lading/LR-RR No.", style_normal), Paragraph(str(bill_of_lading_no or ""), style_normal), Paragraph("Motor Vehicle No.", style_normal), Paragraph(str(motor_vehicle_no or ""), style_normal)],
        [Paragraph("Terms of Delivery", style_normal), Paragraph(str(terms_of_delivery or ""), style_normal), "", ""]
    ]

    col_widths_inv_details = [
        (width - 2 * margin) / 4,
        (width - 2 * margin) / 4,
        (width - 2 * margin) / 4,
        (width - 2 * margin) / 4
    ]

    invoice_details_table = Table(invoice_details_data, colWidths=col_widths_inv_details, rowHeights=8*mm)
    invoice_details_table.setStyle(TableStyle([
        ('BOX', (0, 0), (-1, -1), 0.25, colors.black),
        ('GRID', (0, 0), (-1, -1), 0.25, colors.black),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('LEFTPADDING', (0,0), (-1,-1), 2*mm),
        ('RIGHTPADDING', (0,0), (-1,-1), 2*mm),
        ('TOPPADDING', (0,0), (-1,-1), 2*mm),
        ('BOTTOMPADDING', (0,0), (-1,-1), 2*mm),
    ]))
    story.append(invoice_details_table)
    story.append(Spacer(0, 2*mm))
    
    # --- Item Table ---
    item_table_data = []
    headers = [
        Paragraph("Sr No.", style_bold),
        Paragraph("Description of Goods/Services", style_bold),
        Paragraph("HSN/SAC", style_bold),
        Paragraph("Quantity", style_bold),
        Paragraph("Rate", style_bold),
        Paragraph("Per", style_bold),
        Paragraph("Amount", style_bold)
    ]
    item_table_data.append(headers)

    col_widths_items = [10 * mm, 70 * mm, 25 * mm, 20 * mm, 20 * mm, 15 * mm, 30 * mm]

    subtotal = 0.0
    total_kgs_weight = 0.0
    

    for i, item in enumerate(items, 1):
        desc = item.get("description", "")
        hsn = item.get("hsn", "")
        qty_str = item.get("pcs_or_weight", "0")
        rate = item.get("rate", 0.0)
        per = item.get("per", "")
        amount = item.get("base_price", 0.0)
        subtotal += amount

        numeric_qty = item.get("numeric_quantity", 0.0)
        if per.lower() == 'kgs.':
            total_kgs_weight += numeric_qty

        item_row = [
            Paragraph(str(i), style_center),
            Paragraph(str(desc), style_normal),
            Paragraph(str(hsn), style_center),
            Paragraph(str(qty_str), style_right),
            Paragraph(f"{rate:.2f}", style_right),
            Paragraph(str(per), style_center),
            Paragraph(f"{amount:.2f}", style_right)
        ]
        item_table_data.append(item_row)
    
    # Add a minimum number of empty rows if needed, or if no items
    # min_rows_for_visual = 5 # Adjust as needed
    # if len(items) < min_rows_for_visual:
    #     for _ in range(min_rows_for_visual - len(items)):
    #         item_table_data.append(["", "", "", "", "", "", ""])

    item_table_style = TableStyle([
        ('GRID', (0, 0), (-1, -1), 0.25, colors.black),
        ('BOX', (0, 0), (-1, -1), 0.25, colors.black),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('BACKGROUND', (0, 0), (-1, 0), colors.lightgrey), # Header background
        ('ALIGN', (0,0), (0,-1), 'CENTER'), # Sr No
        ('ALIGN', (2,0), (2,-1), 'CENTER'), # HSN
        ('ALIGN', (3,0), (3,-1), 'RIGHT'), # Qty
        ('ALIGN', (4,0), (4,-1), 'RIGHT'), # Rate
        ('ALIGN', (5,0), (5,-1), 'CENTER'), # Per
        ('ALIGN', (6,0), (6,-1), 'RIGHT'), # Amount
        ('LEFTPADDING', (0,0), (-1,-1), 2*mm),
        ('RIGHTPADDING', (0,0), (-1,-1), 2*mm),
        ('TOPPADDING', (0,0), (-1,-1), 2*mm),
        ('BOTTOMPADDING', (0,0), (-1,-1), 2*mm),
    ])

    item_table = Table(item_table_data, colWidths=col_widths_items)
    item_table.setStyle(item_table_style)
    story.append(item_table)
    story.append(Spacer(0, 2*mm))

    # --- Totals Section (Table) ---
    cgst = subtotal * cgst_rate
    sgst = subtotal * sgst_rate
    total = subtotal + packing_and_forwarding + cgst + sgst + round_off
    
    totals_data = [
        [Paragraph("Total", style_bold), "", Paragraph(f"{subtotal:.2f}", style_right)],
        [Paragraph("PACKING & FORWARDING (SALES)", style_normal), "", Paragraph(f"{packing_and_forwarding:.2f}", style_right)],
        [Paragraph(f"OUTPUT CGST @ {cgst_rate*100:.0f}%", style_normal), "", Paragraph(f"{cgst:.2f}", style_right)],
        [Paragraph(f"OUTPUT SGST @ {sgst_rate*100:.0f}%", style_normal), "", Paragraph(f"{sgst:.2f}", style_right)],
        [Paragraph("ROUND OFF", style_normal), "", Paragraph(f"{round_off:.2f}", style_right)],
        [Paragraph("GRAND TOTAL", style_bold), "", Paragraph(f"₹ {total:.2f}", style_right)],
        [Paragraph(f"{total_kgs_weight:.1f} Kgs.", style_normal), "", ""] # Kgs text
    ]

    totals_col_widths = [
        (width - 2 * margin) * 0.5, # Left side (Total, Packing, etc.)
        (width - 2 * margin) * 0.1, # Small spacer column
        (width - 2 * margin) * 0.4  # Amount column
    ]

    totals_table = Table(totals_data, colWidths=totals_col_widths)
    totals_table.setStyle(TableStyle([
        ('BOX', (0, 0), (-1, -1), 0.25, colors.black),
        ('ALIGN', (0,0), (0,-1), 'LEFT'),
        ('ALIGN', (2,0), (2,-1), 'RIGHT'),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('SPAN', (0,5), (1,5)), # Span GRAND TOTAL
        ('SPAN', (0,6), (1,6)), # Span Kgs. text
        ('FONTNAME', (0,5), (0,5), 'Helvetica-Bold'), # Bold Grand Total label
        ('FONTNAME', (2,5), (2,5), 'Helvetica-Bold'), # Bold Grand Total amount
        ('LEFTPADDING', (0,0), (-1,-1), 2*mm),
        ('RIGHTPADDING', (0,0), (-1,-1), 2*mm),
        ('TOPPADDING', (0,0), (-1,-1), 2*mm),
        ('BOTTOMPADDING', (0,0), (-1,-1), 2*mm),
    ]))
    story.append(totals_table)
    story.append(Spacer(0, 2*mm))

    # --- Amount in Words ---
    in_words = num2words(round(total, 2), lang='en_IN').replace(" and ", " ").title() + " Only"
    amount_in_words_table = Table([[Paragraph("Amount Chargeable (in words):", style_normal)],
                                   [Paragraph(in_words, style_normal)]],
                                  colWidths=[width - 2 * margin])
    amount_in_words_table.setStyle(TableStyle([
        ('BOX', (0, 0), (-1, -1), 0.25, colors.black),
        ('LEFTPADDING', (0,0), (-1,-1), 2*mm),
        ('RIGHTPADDING', (0,0), (-1,-1), 2*mm),
        ('TOPPADDING', (0,0), (-1,-1), 2*mm),
        ('BOTTOMPADDING', (0,0), (-1,-1), 2*mm),
    ]))
    story.append(amount_in_words_table)
    story.append(Spacer(0, 2*mm))

    # --- Tax Breakup Table ---
    tax_breakup_data = []
    tax_headers = [
        Paragraph("Taxable Value", style_bold),
        Paragraph("Central Tax<br/>Rate", style_bold),
        Paragraph("Central Tax<br/>Amount", style_bold),
        Paragraph("State Tax<br/>Rate", style_bold),
        Paragraph("State Tax<br/>Amount", style_bold),
        Paragraph("Total Tax Amount", style_bold)
    ]
    tax_breakup_data.append(tax_headers)

    tax_col_widths = [45 * mm, 20 * mm, 25 * mm, 20 * mm, 25 * mm, 30 * mm]

    total_taxable_value_summary = 0.0
    total_cgst_amount_summary = 0.0
    total_sgst_amount_summary = 0.0
    grand_total_tax_amount_summary = 0.0
    
    tax_breakup_rows_data = data.get("tax_breakup_rows", [])
    if not tax_breakup_rows_data and subtotal > 0:
        tax_breakup_rows_data.append({
            "taxable_value": subtotal,
            "central_tax_rate": f"{cgst_rate*100:.0f}%",
            "central_tax_amount": cgst,
            "state_tax_rate": f"{sgst_rate*100:.0f}%",
            "state_tax_amount": sgst,
            "total_tax_amount": cgst + sgst
        })
        
    for idx, row_data in enumerate(tax_breakup_rows_data):
        taxable_value = float(row_data.get("taxable_value", 0.0))
        central_tax_rate_str = row_data.get("central_tax_rate", f"{cgst_rate*100:.0f}%")
        central_tax_amount = float(row_data.get("central_tax_amount", 0.0))
        state_tax_rate_str = row_data.get("state_tax_rate", f"{sgst_rate*100:.0f}%")
        state_tax_amount = float(row_data.get("state_tax_amount", 0.0))
        total_tax_amount = float(row_data.get("total_tax_amount", 0.0))

        total_taxable_value_summary += taxable_value
        total_cgst_amount_summary += central_tax_amount
        total_sgst_amount_summary += state_tax_amount
        grand_total_tax_amount_summary += total_tax_amount

        tax_breakup_data.append([
            Paragraph(f"{taxable_value:.2f}", style_right),
            Paragraph(central_tax_rate_str, style_center),
            Paragraph(f"{central_tax_amount:.2f}", style_right),
            Paragraph(state_tax_rate_str, style_center),
            Paragraph(f"{state_tax_amount:.2f}", style_right),
            Paragraph(f"{total_tax_amount:.2f}", style_right)
        ])
   
    # Total row for Tax Breakup
    tax_breakup_data.append([
        Paragraph("Total", style_bold),
        "",
        Paragraph(f"{total_cgst_amount_summary:.2f}", style_right),
        "",
        Paragraph(f"{total_sgst_amount_summary:.2f}", style_right),
        Paragraph(f"{grand_total_tax_amount_summary:.2f}", style_right)
    ])

    tax_breakup_table = Table(tax_breakup_data, colWidths=tax_col_widths)
    tax_breakup_table.setStyle(TableStyle([
        ('BOX', (0, 0), (-1, -1), 0.25, colors.black),
        ('GRID', (0, 0), (-1, -1), 0.25, colors.black),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('BACKGROUND', (0, 0), (-1, 0), colors.lightgrey), # Header background
        ('FONTNAME', (0,-1), (-1,-1), 'Helvetica-Bold'), # Bold last row (Total)
        ('LEFTPADDING', (0,0), (-1,-1), 2*mm),
        ('RIGHTPADDING', (0,0), (-1,-1), 2*mm),
        ('TOPPADDING', (0,0), (-1,-1), 2*mm),
        ('BOTTOMPADDING', (0,0), (-1,-1), 2*mm),
        ('SPAN', (0,-1), (1,-1)), # Span "Total" across first two columns
        ('SPAN', (3,-1), (3,-1)), # Span empty cell for rate on total row (aligns better)
    ]))
    story.append(tax_breakup_table)
    story.append(Spacer(0, 2*mm))

    # --- Bank Details & Declaration ---
    bank_declaration_data = [
        [Paragraph("Company's Bank Details", style_bold), Paragraph(f"For {company_name}", style_bold)],
        [Paragraph(f"Bank Name: {company_bank_name}", style_normal), ""],
        [Paragraph(f"A/C No: {company_account_no}", style_normal), ""],
        [Paragraph(f"IFSC Code: {company_ifsc_code}", style_normal), ""],
        [Paragraph(f"Branch: {company_bank_branch}", style_normal), ""],
        [Spacer(0, 5*mm), Spacer(0,5*mm)], # Space for signature line
        [Paragraph("Declaration:", style_bold), Paragraph("Authorised Signatory", style_center)],
        [Paragraph("We declare this invoice shows the actual price of the goods described and that all particulars are true and correct.", style_normal), ""]
    ]

    bank_declaration_table = Table(bank_declaration_data, colWidths=[(width - 2 * margin) / 2, (width - 2 * margin) / 2])
    bank_declaration_table.setStyle(TableStyle([
        ('BOX', (0, 0), (-1, -1), 0.25, colors.black),
        ('LINEAFTER', (0, 0), (0, -1), 0.25, colors.black),
        ('ALIGN', (1,1), (1,5), 'RIGHT'), # For Company Name and placeholder line
        ('ALIGN', (1,6), (1,6), 'CENTER'), # Authorised Signatory label
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('LINEABOVE', (1,6), (1,6), 0.25, colors.black), # Signature line (above "Authorised Signatory")
        ('LEFTPADDING', (0,0), (-1,-1), 2*mm),
        ('RIGHTPADDING', (0,0), (-1,-1), 2*mm),
        ('TOPPADDING', (0,0), (-1,-1), 2*mm),
        ('BOTTOMPADDING', (0,0), (-1,-1), 2*mm),
    ]))
    story.append(bank_declaration_table)

    # Build the PDF
    doc.build(story) # No need for onFirstPage/onLaterPages here; the PageTemplate handles it.
    
    return file_path


''' template 2 design for invoice '''

def generate_invoice_pdf2(data):
    """
    Generates a PDF invoice based on the provided data, mimicking the layout
    and content of the example image. This function is adapted to specifically
    consume the JSON output format generated by the 'parsed_info' function
    provided by the user, handling all necessary mapping and conversions internally.

    Args:
        data (dict): A dictionary containing invoice details, as produced by the
                     'parsed_info' function. Missing or empty string values will
                     result in blank spaces or omitted sections in the PDF.

                     Expected structure (keys are optional; values will be
                     stripped of leading/trailing whitespace if present):
                     {
                         "company_name": "STRING",
                         "company_address": "MULTI-LINE_STRING_WITH_NEWLINES",
                         "company_mobile": "STRING", # Added based on common practice
                         "company_gstin": "STRING",
                         "company_state_name": "STRING", # Added based on common practice
                         "company_state_code": "STRING", # Added based on common practice
                         "company_email": "STRING", # Added based on common practice

                         "invoice_no": "STRING",
                         "invoice_date": "STRING (e.g., 'YYYY-MM-DD' from parsed_info)",
                         "irn": "STRING", # Optional
                         "ack_no": "STRING", # Optional
                         "ack_date": "STRING (e.g., 'DD MMM YY' from parsed_info)", # Optional
                         "delivery_note": "STRING",
                         "mode_of_payment": "STRING",
                         "reference_no": "STRING",
                         "other_references": "STRING",
                         "buyer_order_no": "STRING",
                         "buyer_order_date": "STRING",
                         "dispatch_doc_no": "STRING",
                         "dispatch_date": "STRING", # This maps to delivery_note_date in PDF layout
                         "dispatched_through": "STRING",
                         "destination": "STRING",
                         "terms_of_delivery": "STRING",

                         "buyer_name": "STRING",
                         "buyer_address": "MULTI-LINE_STRING_WITH_NEWLINES",
                         "buyer_gstin": "STRING",
                         "buyer_state_name": "STRING", # Added based on common practice
                         "buyer_state_code": "STRING", # Added based on common practice
                         "buyer_mobile": "STRING", # Added based on common practice
                         "buyer_email": "STRING", # Added based on common practice

                         "product": [ # List of product dictionaries, if empty, table will be empty
                             {
                                 "description": "STRING",
                                 "hsn": "STRING", # Maps to hsn_sac in PDF layout
                                 "gst_rate": FLOAT, # Combined GST rate (e.g., 0.18 for 18%)
                                 "quantity_str": "STRING (e.g., '13.86 kg' or '26 pcs')", # Already good
                                 "rate": FLOAT,
                                 "per": "STRING (e.g., 'kg', 'pcs')",
                                 "amount": FLOAT # Line item total (taxable value)
                             },
                             ...
                         ],
                         "cgst_amount": FLOAT, # Extracted directly from parsed_info output
                         "sgst_amount": FLOAT, # Extracted directly from parsed_info output
                         "round_off": FLOAT, # Maps to round_off_amount in PDF layout

                         "company_bank_name": "STRING",
                         "company_account_no": "STRING",
                         "company_ifsc_code": "STRING",
                         "company_bank_branch": "STRING",
                         "declaration_text": "STRING (Optional, default provided)"
                     }
    Returns:
        str: The file path to the generated PDF invoice.
    """

    # --- Data Extraction and Mapping from parsed_info format ---
    def get_trimmed_string(dict_obj, key):
        value = dict_obj.get(key, '')
        return value.strip() if isinstance(value, str) else ''

    def get_float(dict_obj, key):
        value = dict_obj.get(key, 0.0)
        try:
            return float(value)
        except (ValueError, TypeError):
            return 0.0

    # Company Details
    company_name = get_trimmed_string(data, "company_name")
    company_address_lines = [line.strip() for line in data.get("company_address", '').split('\n') if line.strip()]
    company_mobile = get_trimmed_string(data, "company_mobile") # From parsed_info prompt
    company_gstin = get_trimmed_string(data, "company_gstin")
    company_state_name = get_trimmed_string(data, "company_state_name") # From parsed_info prompt
    company_state_code = get_trimmed_string(data, "company_state_code") # From parsed_info prompt
    company_email = get_trimmed_string(data, "company_email") # From parsed_info prompt

    # Invoice Header Details
    invoice_no = get_trimmed_string(data, "invoice_no")
    # Convert invoice_date from YYYY-MM-DD (parsed_info) to DD Mon YY (PDF display)
    invoice_date_raw = get_trimmed_string(data, "invoice_date")
    invoice_date = ""
    if invoice_date_raw:
        try:
            invoice_date = datetime.strptime(invoice_date_raw, '%Y-%m-%d').strftime('%d %b %y')
        except ValueError:
            invoice_date = invoice_date_raw # Fallback if format is unexpected

    irn = get_trimmed_string(data, "irn")
    ack_no = get_trimmed_string(data, "ack_no")
    # ack_date from parsed_info is already 'DD MMM YY' if it exists or default, so no change needed
    ack_date = get_trimmed_string(data, "ack_date")

    delivery_note = get_trimmed_string(data, "delivery_note")
    mode_of_payment = get_trimmed_string(data, "mode_of_payment")
    reference_no = get_trimmed_string(data, "reference_no")
    other_references = get_trimmed_string(data, "other_references")
    buyer_order_no = get_trimmed_string(data, "buyer_order_no")
    buyer_order_date = get_trimmed_string(data, "buyer_order_date") # Keep as is, assume AI handles format
    dispatch_doc_no = get_trimmed_string(data, "dispatch_doc_no")
    # MAPPING: parsed_info's "dispatch_date" maps to PDF's "delivery_note_date"
    delivery_note_date = get_trimmed_string(data, "dispatch_date")
    dispatched_through = get_trimmed_string(data, "dispatched_through")
    destination = get_trimmed_string(data, "destination")
    terms_of_delivery = get_trimmed_string(data, "terms_of_delivery")

    # Buyer Details
    buyer_name = get_trimmed_string(data, "buyer_name")
    buyer_address_lines = [line.strip() for line in data.get("buyer_address", '').split('\n') if line.strip()]
    buyer_gstin = get_trimmed_string(data, "buyer_gstin")
    buyer_state_name = get_trimmed_string(data, "buyer_state_name") # From parsed_info prompt
    buyer_state_code = get_trimmed_string(data, "buyer_state_code") # From parsed_info prompt
    buyer_mobile = get_trimmed_string(data, "buyer_mobile") # From parsed_info prompt
    buyer_email = get_trimmed_string(data, "buyer_email") # From parsed_info prompt

    # Product Items (Loop and map inner keys)
    items_raw = data.get("product", [])
    items = []
    for item_raw in items_raw:
        # MAPPING for product items
        desc = get_trimmed_string(item_raw, "description")
        hsn_sac = get_trimmed_string(item_raw, "hsn") # MAPPED: hsn -> hsn_sac
        gst_rate_float = get_float(item_raw, "gst_rate")
        gst_rate_str = f"{gst_rate_float * 100:.0f} %" if gst_rate_float else "" # Convert float to "XX %" string
        quantity_str = get_trimmed_string(item_raw, "pcs_or_weight") # No change, AI should provide full string
        rate = get_float(item_raw, "rate")
        per = get_trimmed_string(item_raw, "per")
        amount = get_float(item_raw, "amount") # MAPPED: item_total_amount -> amount (taxable value)

        items.append({
            "description": desc,
            "hsn_sac": hsn_sac,
            "gst_rate": gst_rate_str,
            "quantity_str": quantity_str,
            "rate": rate,
            "per": per,
            "amount": amount # This is the taxable amount for the line item
        })

    # Amounts & Totals
    # Direct mapping for CGST, SGST, Round Off
    cgst_amount = get_float(data, "cgst_amount")
    sgst_amount = get_float(data, "sgst_amount")
    round_off_amount = get_float(data, "round_off") # MAPPED: round_off -> round_off_amount

    # Company Bank Details
    company_bank_name = get_trimmed_string(data, "company_bank_name")
    company_account_no = get_trimmed_string(data, "company_account_no")
    company_ifsc_code = get_trimmed_string(data, "company_ifsc_code")
    company_bank_branch = get_trimmed_string(data, "company_bank_branch")
    declaration_text = data.get("declaration_text", "We declare this invoice shows the actual price of the goods described and that all particulars are true and correct.").strip()


    # --- PDF Setup ---
    folder = os.path.join("invoices")
    os.makedirs(folder, exist_ok=True)
    file_name = f"invoice_{datetime.now().strftime('%Y%m%d%H%M%S')}.pdf"
    file_path = os.path.join(folder, file_name)

    margin = 10 * mm
    width, height = A4

    doc = SimpleDocTemplate(file_path, pagesize=A4,
                            leftMargin=margin, rightMargin=margin,
                            topMargin=margin, bottomMargin=margin)

    # --- Styles ---
    styles = getSampleStyleSheet()

    style_normal = ParagraphStyle('normal', parent=styles['Normal'], fontSize=7, leading=8, alignment=TA_LEFT)
    style_bold = ParagraphStyle('bold', parent=styles['Normal'], fontSize=7, fontName='Helvetica-Bold', leading=8, alignment=TA_LEFT)
    style_header_main = ParagraphStyle('header_main', parent=styles['Normal'], fontSize=16, fontName='Helvetica-Bold', alignment=TA_CENTER)
    style_header_einvoice = ParagraphStyle('header_einvoice', parent=styles['Normal'], fontSize=10, fontName='Helvetica-Bold', alignment=TA_RIGHT)
    style_right = ParagraphStyle('right', parent=styles['Normal'], fontSize=7, alignment=TA_RIGHT, leading=8)
    style_center = ParagraphStyle('center', parent=styles['Normal'], fontSize=7, alignment=TA_CENTER, leading=8)
    style_small = ParagraphStyle('small', parent=styles['Normal'], fontSize=6, leading=7, alignment=TA_LEFT)
    style_small_bold = ParagraphStyle('small_bold', parent=styles['Normal'], fontSize=6, fontName='Helvetica-Bold', leading=7, alignment=TA_LEFT)


    story = []

    # --- Header & Footer Drawing Function ---
    def on_page_elements(canvas_obj, doc_obj):
        canvas_obj.saveState()

        # Outer Border
        canvas_obj.rect(margin, margin, width - 2 * margin, height - 2 * margin)

        # Header Box (Fixed at top) - This height needs to be consistent
        header_area_height = 35 * mm
        canvas_obj.line(margin, height - margin - header_area_height, width - margin, height - margin - header_area_height)

        # "Tax Invoice" title
        canvas_obj.setFont("Helvetica-Bold", 16)
        canvas_obj.drawCentredString(width / 2, height - margin - 6 * mm, "Tax Invoice")

        # e-Invoice details (only if IRN is present)
        if irn:
            canvas_obj.setFont("Helvetica-Bold", 10)
            canvas_obj.drawString(width - margin - 45 * mm, height - margin - 6 * mm, "e-Invoice")

            canvas_obj.setFont("Helvetica", 7)
            y_irn_block_start = height - margin - 15 * mm

            current_y_irn = y_irn_block_start
            if irn:
                canvas_obj.drawString(margin + 2 * mm, current_y_irn, "IRN:")
                canvas_obj.drawString(margin + 12 * mm, current_y_irn, irn)
                current_y_irn -= 5 * mm
            if ack_no:
                canvas_obj.drawString(margin + 2 * mm, current_y_irn, "Ack No.:")
                canvas_obj.drawString(margin + 12 * mm, current_y_irn, ack_no)
                current_y_irn -= 5 * mm
            if ack_date:
                canvas_obj.drawString(margin + 2 * mm, current_y_irn, "Ack Date:")
                canvas_obj.drawString(margin + 12 * mm, current_y_irn, ack_date)

        # Footer
        canvas_obj.setFont("Helvetica-Oblique", 6)
        canvas_obj.drawCentredString(width / 2, margin + 3 * mm, "This is a Computer Generated Invoice")

        # Page Number (right aligned in footer)
        canvas_obj.drawString(width - margin - 20*mm, margin + 3 * mm, f"Page {doc_obj.page}")

        canvas_obj.restoreState()

    # Define the main frame for content. It starts below the fixed header area.
    frame_top_y = height - margin - 35 * mm

    main_frame = Frame(doc.leftMargin, doc.bottomMargin,
                       doc.width, frame_top_y - doc.bottomMargin,
                       leftPadding=0, bottomPadding=0,
                       rightPadding=0, topPadding=0,
                       id='normal')

    doc.addPageTemplates([
        PageTemplate(id='AllPages', frames=main_frame, onPage=on_page_elements)
    ])

    # --- Content for Main Top Table (Company, Invoice Details, Buyer) ---

    # Left Cell Content: Company Details (only add if company name is provided)
    company_cell_content = []
    if company_name:
        company_cell_content.append(Paragraph(f"<font name='Helvetica-Bold' size='9'>{company_name}</font>", style_bold))
        company_cell_content.append(Spacer(0, 1*mm))
        company_cell_content.extend([Paragraph(line, style_small) for line in company_address_lines])
        if company_mobile:
            company_cell_content.append(Paragraph(f"Mobile No.: {company_mobile}", style_small))
        if company_gstin:
            company_cell_content.append(Paragraph(f"GSTIN/UIN: {company_gstin}", style_small))
        if company_state_name or company_state_code:
            company_cell_content.append(Paragraph(f"State Name: {company_state_name}, Code: {company_state_code}", style_small))
        if company_email:
            company_cell_content.append(Paragraph(f"E-Mail: {company_email}", style_small))

    # Right Cell Content: Invoice Details (Sub-table) + Buyer Details (Sub-table)
    right_cell_content = []

    # Invoice details sub-table data (dynamically built)
    invoice_header_sub_table_data = []

    # Always include Invoice No and Dated if they are present, otherwise empty placeholders
    row_invoice_no_dated = []
    row_invoice_no_dated.append(Paragraph("Invoice No.", style_small_bold) if invoice_no else "")
    row_invoice_no_dated.append(Paragraph(invoice_no, style_small) if invoice_no else "")
    row_invoice_no_dated.append(Paragraph("Dated", style_small_bold) if invoice_date else "")
    row_invoice_no_dated.append(Paragraph(invoice_date, style_small) if invoice_date else "")
    invoice_header_sub_table_data.append(row_invoice_no_dated)

    def add_optional_row(data_list, label1, value1, label2, value2):
        row_content = []
        # Decide if labels should be included based on value presence
        row_content.append(Paragraph(label1, style_small) if value1 else "")
        row_content.append(Paragraph(value1, style_small) if value1 else "")
        row_content.append(Paragraph(label2, style_small) if value2 else "")
        row_content.append(Paragraph(value2, style_small) if value2 else "")

        # Only add row if at least one value is present
        if any([value1, value2]): # Check if any value is non-empty
            data_list.append(row_content)

    add_optional_row(invoice_header_sub_table_data, "Delivery Note", delivery_note, "Mode/Terms of Payment", mode_of_payment)
    add_optional_row(invoice_header_sub_table_data, "Reference No.", reference_no, "Other Ref(s).", other_references)
    add_optional_row(invoice_header_sub_table_data, "Buyer's Order No.", buyer_order_no, "Dated", buyer_order_date)
    add_optional_row(invoice_header_sub_table_data, "Dispatch Doc No.", dispatch_doc_no, "Delivery Note Date", delivery_note_date)
    add_optional_row(invoice_header_sub_table_data, "Dispatched Through", dispatched_through, "Destination", destination)

    # Terms of Delivery row - spans across 4 columns if present, otherwise no row
    if terms_of_delivery:
        invoice_header_sub_table_data.append([
            Paragraph("Terms of Delivery", style_small_bold),
            Paragraph(terms_of_delivery, style_small), "", ""
        ])

    invoice_header_sub_table_col_widths = [(width - 2 * margin) * 0.25 / 2, (width - 2 * margin) * 0.25 / 2, (width - 2 * margin) * 0.25 / 2, (width - 2 * margin) * 0.25 / 2]
    invoice_header_sub_table_style = [
        ('GRID', (0,0), (-1,-1), 0.25, colors.black),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('LEFTPADDING', (0,0), (-1,-1), 1*mm),
        ('RIGHTPADDING', (0,0), (-1,-1), 1*mm),
        ('TOPPADDING', (0,0), (-1,-1), 1*mm),
        ('BOTTOMPADDING', (0,0), (-1,-1), 1*mm),
    ]
    if terms_of_delivery and len(invoice_header_sub_table_data) > 0:
        terms_row_idx = len(invoice_header_sub_table_data) - 1
        invoice_header_sub_table_style.append(('SPAN', (0, terms_row_idx), (1, terms_row_idx))) # Span label
        invoice_header_sub_table_style.append(('SPAN', (2, terms_row_idx), (3, terms_row_idx))) # Span value

    # Only create the table if there is data for it
    if invoice_header_sub_table_data:
        invoice_header_sub_table = Table(invoice_header_sub_table_data, colWidths=invoice_header_sub_table_col_widths)
        invoice_header_sub_table.setStyle(TableStyle(invoice_header_sub_table_style))
        right_cell_content.append(invoice_header_sub_table)
        right_cell_content.append(Spacer(0, 2*mm))

    # Buyer details sub-table data (only if buyer name is provided)
    buyer_details_sub_table_data = []
    if buyer_name:
        buyer_details_sub_table_data.append([Paragraph("<font name='Helvetica-Bold' size='7'>Buyer (Bill to)</font>", style_small_bold)])
        buyer_details_sub_table_data.append([Paragraph(f"<font name='Helvetica-Bold' size='8'>{buyer_name}</font>", style_bold)])
        buyer_details_sub_table_data.extend([[Paragraph(line, style_small)] for line in buyer_address_lines])
        if buyer_gstin:
            buyer_details_sub_table_data.append([Paragraph(f"GSTIN/UIN: {buyer_gstin}", style_small)])
        if buyer_state_name or buyer_state_code:
            buyer_details_sub_table_data.append([Paragraph(f"State Name: {buyer_state_name}, Code: {buyer_state_code}", style_small)])
        if buyer_mobile:
            buyer_details_sub_table_data.append([Paragraph(f"Mobile No.: {buyer_mobile}", style_small)])
        if buyer_email:
            buyer_details_sub_table_data.append([Paragraph(f"E-Mail: {buyer_email}", style_small)])


    if buyer_details_sub_table_data:
        buyer_details_sub_table = Table(buyer_details_sub_table_data, colWidths=[(width - 2 * margin) / 2])
        buyer_details_sub_table.setStyle(TableStyle([
            ('VALIGN', (0,0), (-1,-1), 'TOP'),
            ('LEFTPADDING', (0,0), (-1,-1), 2*mm),
            ('RIGHTPADDING', (0,0), (-1,-1), 2*mm),
            ('TOPPADDING', (0,0), (-1,-1), 0),
            ('BOTTOMPADDING', (0,0), (-1,-1), 0),
        ]))
        right_cell_content.append(buyer_details_sub_table)

    # Only create the main_top_table if either company or right_cell_content has data
    if company_cell_content or right_cell_content:
        main_top_table_data = [[
            company_cell_content,
            right_cell_content
        ]]

        main_top_table = Table(main_top_table_data, colWidths=[(width - 2 * margin) * 0.5, (width - 2 * margin) * 0.5])
        main_top_table.setStyle(TableStyle([
            ('BOX', (0,0), (-1,-1), 0.25, colors.black),
            ('LINEAFTER', (0,0), (0,-1), 0.25, colors.black),
            ('VALIGN', (0,0), (-1,-1), 'TOP'),
            ('TOPPADDING', (0,0), (-1,-1), 0),
            ('BOTTOMPADDING', (0,0), (-1,-1), 0),
            ('LEFTPADDING', (0,0), (-1,-1), 0),
            ('RIGHTPADDING', (0,0), (-1,-1), 0),
        ]))
        story.append(main_top_table)
        story.append(Spacer(0, 2*mm))


    # --- Item Table ---
    item_table_data = []
    headers = [
        Paragraph("Sr No.", style_bold),
        Paragraph("Description of Goods", style_bold),
        Paragraph("HSN/SAC", style_bold),
        Paragraph("GST", style_bold),
        Paragraph("Quantity", style_bold),
        Paragraph("Rate", style_bold),
        Paragraph("Per", style_bold),
        Paragraph("Amount", style_bold)
    ]
    item_table_data.append(headers)

    col_widths_items = [10 * mm, 60 * mm, 20 * mm, 15 * mm, 20 * mm, 20 * mm, 15 * mm, 30 * mm]

    subtotal = 0.0

    for i, item in enumerate(items, 1):
        # Mapped keys are already used from the processed 'items' list
        desc = item["description"]
        hsn_sac = item["hsn_sac"]
        gst_rate_str = item["gst_rate"]
        quantity_str = item["quantity_str"]
        rate = item["rate"]
        per = item["per"]
        amount = item["amount"] # This is the taxable value

        subtotal += amount

        item_row = [
            Paragraph(str(i), style_center),
            Paragraph(desc, style_normal),
            Paragraph(hsn_sac, style_center),
            Paragraph(gst_rate_str, style_center),
            Paragraph(quantity_str, style_right),
            Paragraph(f"{rate:.2f}", style_right),
            Paragraph(per, style_center),
            Paragraph(f"{amount:.2f}", style_right)
        ]
        item_table_data.append(item_row)

    # Add empty rows to ensure minimum height for the item table, if needed.
    min_item_rows_for_visual = 10
    if len(items) < min_item_rows_for_visual:
        for _ in range(min_item_rows_for_visual - len(items)):
            item_table_data.append(["", "", "", "", "", "", "", ""])

    item_table_style = TableStyle([
        ('GRID', (0, 0), (-1, -1), 0.25, colors.black),
        ('BOX', (0, 0), (-1, -1), 0.25, colors.black),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('BACKGROUND', (0, 0), (-1, 0), colors.lightgrey), # Header background
        ('ALIGN', (0,0), (0,-1), 'CENTER'),
        ('ALIGN', (2,0), (2,-1), 'CENTER'),
        ('ALIGN', (3,0), (3,-1), 'CENTER'),
        ('ALIGN', (4,0), (4,-1), 'RIGHT'),
        ('ALIGN', (5,0), (5,-1), 'RIGHT'),
        ('ALIGN', (6,0), (6,-1), 'CENTER'),
        ('ALIGN', (7,0), (7,-1), 'RIGHT'),
        ('LEFTPADDING', (0,0), (-1,-1), 2*mm),
        ('RIGHTPADDING', (0,0), (-1,-1), 2*mm),
        ('TOPPADDING', (0,0), (-1,-1), 2*mm),
        ('BOTTOMPADDING', (0,0), (-1,-1), 2*mm),
    ])

    # Now add the CGST, SGST, Round Off, and Total rows *within* this item table, spanning columns

    current_row_idx = len(item_table_data)

    total_gst_amount_sum = cgst_amount + sgst_amount # Sum of direct CGST/SGST amounts

    # CGST/SGST row
    if total_gst_amount_sum != 0.0:
        item_table_data.append([
            Paragraph("Cgst Sgst", style_small_bold), "", "", "", "", "", "",
            Paragraph(f"{total_gst_amount_sum:.2f}", style_right)
        ])
        item_table_style.add('SPAN', (0, current_row_idx), (6, current_row_idx))
        current_row_idx += 1

    # Round Off row
    if round_off_amount != 0.0:
        item_table_data.append([
            Paragraph("Round Off", style_small_bold), "", "", "", "", "", "",
            Paragraph(f"{round_off_amount:.2f}", style_right)
        ])
        item_table_style.add('SPAN', (0, current_row_idx), (6, current_row_idx))
        current_row_idx += 1

    # Total row
    grand_total = subtotal + total_gst_amount_sum + round_off_amount
    item_table_data.append([
        Paragraph("Total", style_bold), "", "", "", "", "", "",
        Paragraph(f"₹ {grand_total:.2f}", style_bold)
    ])
    item_table_style.add('SPAN', (0, current_row_idx), (6, current_row_idx))
    item_table_style.add('ALIGN', (7, current_row_idx), (7, current_row_idx), 'RIGHT')
    item_table_style.add('FONTNAME', (7, current_row_idx), (7, current_row_idx), 'Helvetica-Bold')

    item_table = Table(item_table_data, colWidths=col_widths_items)
    item_table.setStyle(item_table_style)
    story.append(item_table)
    story.append(Spacer(0, 2*mm))

    # --- Amount in Words ---
    in_words = num2words(round(grand_total, 2), lang='en_IN').replace(" and ", " ").title() + " Only"
    amount_in_words_table = Table([[Paragraph("Amount Chargeable (in words):", style_normal)],
                                    [Paragraph(in_words, style_bold)]],
                                    colWidths=[width - 2 * margin])
    amount_in_words_table.setStyle(TableStyle([
        ('BOX', (0, 0), (-1, -1), 0.25, colors.black),
        ('LEFTPADDING', (0,0), (-1,-1), 2*mm),
        ('RIGHTPADDING', (0,0), (-1,-1), 2*mm),
        ('TOPPADDING', (0,0), (-1,-1), 2*mm),
        ('BOTTOMPADDING', (0,0), (-1,-1), 2*mm),
    ]))
    story.append(amount_in_words_table)
    story.append(Spacer(0, 2*mm))

    # --- Declaration & Bank Details ---
    declaration_bank_data = []

    # Left Column content for Bank Details (dynamically built)
    bank_details_content = []
    # Only add "Company's Bank Details" header if at least one bank detail is provided
    if company_bank_name or company_account_no or company_ifsc_code or company_bank_branch:
        bank_details_content.append(Paragraph("Company's Bank Details", style_small_bold))
        if company_bank_name:
            bank_details_content.append(Paragraph(f"Bank Name: {company_bank_name}", style_small))
        if company_account_no:
            bank_details_content.append(Paragraph(f"A/C No: {company_account_no}", style_small))
        if company_ifsc_code:
            bank_details_content.append(Paragraph(f"IFSC Code: {company_ifsc_code}", style_small))
        if company_bank_branch:
            bank_details_content.append(Paragraph(f"Branch: {company_bank_branch}", style_small))

    # Right Column content for Signature (only if company name for signature is provided)
    right_signature_content = []
    if company_name:
        right_signature_content.append(Paragraph(f"For {company_name}", style_bold))

    # Add first row if either side has content
    if bank_details_content or right_signature_content:
        declaration_bank_data.append([bank_details_content, right_signature_content])

        # Spacer for signature line on right and Declaration label on left
        declaration_bank_data.append([
            Paragraph("Declaration:", style_small_bold),
            Spacer(0, 15*mm) # Placeholder for signature line spacing
        ])

        # Declaration text | Authorised Signatory
        declaration_bank_data.append([
            Paragraph(declaration_text, style_small),
            Paragraph("Authorised Signatory", style_center)
        ])

        declaration_bank_table = Table(declaration_bank_data, colWidths=[(width - 2 * margin) * 0.5, (width - 2 * margin) * 0.5])

        # Define styles dynamically based on row count
        declaration_bank_table_style = [
            ('BOX', (0, 0), (-1, -1), 0.25, colors.black),
            ('LINEAFTER', (0, 0), (0, -1), 0.25, colors.black),
            ('VALIGN', (0,0), (-1,-1), 'TOP'),
            ('LEFTPADDING', (0,0), (-1,-1), 2*mm),
            ('RIGHTPADDING', (0,0), (-1,-1), 2*mm),
            ('TOPPADDING', (0,0), (-1,-1), 2*mm),
            ('BOTTOMPADDING', (0,0), (-1,-1), 2*mm),

            ('ALIGN', (1,0), (1,0), 'RIGHT'), # "For Company Name" right aligned
            ('ALIGN', (1, len(declaration_bank_data) - 1), (1, len(declaration_bank_data) - 1), 'CENTER'), # "Authorised Signatory" centered
            ('LINEABOVE', (1, len(declaration_bank_data) - 1), (1, len(declaration_bank_data) - 1), 0.25, colors.black), # Signature line
        ]

        declaration_bank_table.setStyle(TableStyle(declaration_bank_table_style))
        story.append(declaration_bank_table)


    # Build the PDF
    doc.build(story)

    return file_path


# from reportlab.lib.pagesizes import A4
# from reportlab.lib import colors
# from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
# from reportlab.lib.units import mm
# from reportlab.platypus import Table, TableStyle, Paragraph, Spacer, Frame, BaseDocTemplate, PageTemplate
# from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
# import datetime

#   def generate_invoice_pdf3(invoice_data, filename="tax_invoice.pdf"):
#     """
#     Generate a tax invoice PDF from invoice data
    
#     Args:
#         invoice_data (dict): Dictionary containing all invoice information
#         filename (str): Output PDF filename
    
#     Returns:
#         str: Path to generated PDF file
#     """

    
    
#     # Define page margins for the content inside the frame
#     content_left_margin = 15*mm
#     content_right_margin = 15*mm
#     content_top_margin = 15*mm
#     content_bottom_margin = 20*mm

#     # Initialize BaseDocTemplate with zero margins
#     doc = BaseDocTemplate(filename, pagesize=A4, 
#                             topMargin=0, bottomMargin=0,
#                             leftMargin=0, rightMargin=0)
    
#     styles = getSampleStyleSheet()
#     # Calculate the usable width for content within the outer border
#     usable_width = A4[0] - (content_left_margin + content_right_margin)
    
#     # Custom styles
#     title_style = ParagraphStyle(
#         'CustomTitle',
#         parent=styles['Heading1'],
#         fontSize=16,
#         spaceAfter=3,
#         alignment=TA_CENTER,
#         fontName='Helvetica-Bold'
#     )
    
#     header_style = ParagraphStyle(
#         'CustomHeader',
#         parent=styles['Normal'],
#         fontSize=12,
#         fontName='Helvetica-Bold'
#     )
    
#     normal_style = ParagraphStyle(
#         'CustomNormal',
#         parent=styles['Normal'],
#         fontSize=11,
#         fontName='Helvetica'
#     )
    
#     small_style = ParagraphStyle(
#         'CustomSmall',
#         parent=styles['Normal'],
#         fontSize=10,
#         fontName='Helvetica'
#     )

#     # Style for right-aligned small text
#     small_right_align_style = ParagraphStyle(
#         'SmallRightAlign',
#         parent=small_style,
#         alignment=TA_RIGHT
#     )

#     # Style for bank details to make it compact
#     bank_details_style = ParagraphStyle(
#         'BankDetails',
#         parent=small_style,
#         leading=10 # Reduced leading for denser text in bank details
#     )

#     # --- Helper Functions ---
#     def create_company_table(data):
#         company_info = [
#             [Paragraph(f"<b>{data['company']['name']}</b>", header_style)],
#             [Paragraph(data['company']['address'], small_style)],
#             [Paragraph(f"Dist.- {data['company']['district']}", small_style)],
#             [Paragraph(f"Mob. No {data['company']['mobile']} {data['company']['phone']}", small_style)],
#             [Paragraph(f"GSTIN/UIN: {data['company']['gstin']}", small_style)],
#             [Paragraph(f"State Name: {data['company']['state']}", small_style)],
#             [Paragraph(f"Contact: {data['company']['contact']}", small_style)],
#             [Paragraph(f"E-Mail: {data['company']['email']}", small_style)]
#         ]

#         company_table = Table(company_info, colWidths=[usable_width * 0.5])
#         company_table.setStyle(TableStyle([
#             ('VALIGN', (0, 0), (-1, -1), 'TOP'),
#             ('LEFTPADDING', (0, 0), (-1, -1), 6),
#             ('RIGHTPADDING', (0, 0), (-1, -1), 6),
#             ('TOPPADDING', (0, 0), (-1, -1), 0),
#             ('BOTTOMPADDING', (0, 0), (-1, -1), 0),
#         ]))
#         return company_table
    
#     def create_invoice_table(data):
#         def safe_para(text):
#             return Paragraph(text if text.strip() else "&nbsp;", small_style)

#         invoice_info = [
#             [Paragraph("<b>Invoice No.</b>", small_style), Paragraph("<b>Dated</b>", small_style)],
#             [safe_para(data['invoice']['number']), safe_para(data['invoice']['date'])],
#             [Paragraph("<b>Delivery Note</b>", small_style), Paragraph("<b>Mode/Terms of Payment</b>", small_style)],
#             [safe_para(data['invoice']['delivery_note']), safe_para(data['invoice']['payment_terms'])],
#             [Paragraph("<b>Reference No. & Date.</b>", small_style), Paragraph("<b>Other References</b>", small_style)],
#             [safe_para(data['invoice']['reference']), safe_para(data['invoice']['other_references'])],
#             [Paragraph("<b>Buyer's Order No.</b>", small_style), Paragraph("<b>Dated</b>", small_style)],
#             [safe_para(data['invoice']['buyer_order']), safe_para(data['invoice']['buyer_order_date'])],
#             [Paragraph("<b>Dispatch Doc No.</b>", small_style), Paragraph("<b>Delivery Note Date</b>", small_style)],
#             [safe_para(data['invoice']['dispatch_doc']), safe_para(data['invoice']['delivery_date'])],
#             [Paragraph("<b>Dispatched through</b>", small_style), Paragraph("<b>Destination</b>", small_style)],
#             [safe_para(data['invoice']['dispatch_through']), safe_para(data['invoice']['destination'])],
#             [Paragraph("<b>Terms of Delivery</b>", small_style), Paragraph("", small_style)],
#             [safe_para(data['invoice']['terms_delivery']), Paragraph("", small_style)]
#         ]

#         invoice_table = Table(invoice_info, colWidths=[usable_width * 0.25, usable_width * 0.25])
#         invoice_table.setStyle(TableStyle([
#             ('GRID', (0, 0), (-1, -1), 0.5, colors.black),
#             ('VALIGN', (0, 0), (-1, -1), 'TOP'),
#             ('LEFTPADDING', (0, 0), (-1, -1), 4),
#             ('RIGHTPADDING', (0, 0), (-1, -1), 4),
#             ('TOPPADDING', (0, 0), (-1, -1), 2),
#             ('BOTTOMPADDING', (0, 0), (-1, -1), 2),
#         ]))
#         return invoice_table

#     def create_buyer_table(data):
#         buyer_info = [
#             [Paragraph(f"<b>{data['buyer']['name']}</b>", normal_style)],
#             [Paragraph(data['buyer']['address'], small_style)],
#             [Paragraph(f"GSTIN/UIN: {data['buyer']['gstin']}", small_style)],
#             [Paragraph(f"State Name: {data['buyer']['state']}", small_style)]
#         ]

#         buyer_table = Table(buyer_info, colWidths=[usable_width * 0.5])
#         buyer_table.setStyle(TableStyle([
#             ('LINEABOVE', (0, 0), (-1, 0), 1, colors.black),
#             ('VALIGN', (0, 0), (-1, -1), 'TOP'),
#             ('LEFTPADDING', (0, 0), (-1, -1), 6),
#             ('RIGHTPADDING', (0, 0), (-1, -1), 6),
#             ('TOPPADDING', (0, 0), (-1, -1), 3),
#             ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
#         ]))
#         return buyer_table
    
#     def create_combined_header_section(data):
#         company_table = create_company_table(data)
#         buyer_table = create_buyer_table(data)
#         invoice_table = create_invoice_table(data)

#         left_side = [company_table, Spacer(1, 6), buyer_table]
#         left_combined = Table([[item] for item in left_side], colWidths=[usable_width * 0.5])
#         left_combined.setStyle(TableStyle([
#             ('VALIGN', (0, 0), (-1, -1), 'TOP'),
#             ('LEFTPADDING', (0, 0), (-1, -1), 0),
#             ('RIGHTPADDING', (0, 0), (-1, -1), 0),
#         ]))

#         right_combined = invoice_table

#         final_table = Table([
#             [left_combined, right_combined]
#         ], colWidths=[usable_width * 0.5, usable_width * 0.5])

#         final_table.setStyle(TableStyle([
#             ('BOX', (0, 0), (-1, -1), 1, colors.black),
#             ('VALIGN', (0, 0), (-1, -1), 'TOP'),
#             ('LEFTPADDING', (0, 0), (-1, -1), 0),
#             ('RIGHTPADDING', (0, 0), (-1, -1), 0),
#             ('TOPPADDING', (0, 0), (-1, -1), 0),
#             ('BOTTOMPADDING', (0, 0), (-1, -1), 0),
#         ]))
#         return final_table

#     def create_items_table(items):
#         headers = [
#             Paragraph("<b>Sr</b>", small_style),
#             Paragraph("<b>Description of Goods</b>", small_style),
#             Paragraph("<b>HSN/SAC</b>", small_style),
#             Paragraph("<b>GST Rate</b>", small_style),
#             Paragraph("<b>Quantity</b>", small_style),
#             Paragraph("<b>Rate</b>", small_style),
#             Paragraph("<b>Per</b>", small_style),
#             Paragraph("<b>Amount</b>", small_style),
#         ]

#         data_rows = [headers]
#         total_amount = 0

#         for i, item in enumerate(items, 1):
#             desc_text = f"<b>{item['name']}</b>"
#             if item.get('description'):
#                 desc_text += f"<br/>{item['description']}"
#             row = [
#                 Paragraph(str(i), small_style),
#                 Paragraph(desc_text, small_style),
#                 Paragraph(item['hsn'], small_style),
#                 Paragraph(f"{item['gst_rate']}%", small_style),
#                 Paragraph(f"{item['quantity']} {item['unit']}", small_style),
#                 Paragraph(f"{item['rate']:.2f}", small_style),
#                 Paragraph(item['unit'], small_style),
#                 Paragraph(f"{item['amount']:.2f}", small_style)
#             ]
#             data_rows.append(row)
#             total_amount += item['amount']

#         # Add blank rows to maintain minimum height before totals
#         min_content_rows = 9 
#         current_item_rows = len(items)
#         if current_item_rows < min_content_rows:
#             for _ in range(min_content_rows - current_item_rows):
#                 data_rows.append([Paragraph("&nbsp;", small_style)] + [""] * 7)

#         # Totals calculation
#         cgst = total_amount * 0.09
#         sgst = total_amount * 0.09
#         round_off = round(total_amount + cgst + sgst) - (total_amount + cgst + sgst)
#         final_total = total_amount + cgst + sgst + round_off 

#         # Subtotal with border above and right aligned (placed *after* blank rows)
#         subtotal_paragraph = Paragraph(f"<b>{total_amount:.2f}</b>", small_style)
#         data_rows.append(["", "", "", "", "", "", "", subtotal_paragraph])
#         subtotal_row_idx = len(data_rows) - 1 

#         # GST row
#         tax_desc = Paragraph(
#             "<para align='right'><b><font size=8>CGST<br/>SGST<br/>Round Off</font></b></para>",
#             small_style
#         )
#         tax_vals = Paragraph(
#             f"<para align='right'><b><font size=8>{cgst:.2f}<br/>{sgst:.2f}<br/>{round_off:.2f}</font></b></para>",
#             small_style
#         )
#         data_rows.append(["", tax_desc, "", "", "", "", "", tax_vals])

#         # Final Total
#         final_total_paragraph = Paragraph(f"<b>{final_total:.2f}</b>", header_style)
#         data_rows.append(["", "", "", "", "", "", "", final_total_paragraph])

#         col_widths = [
#             usable_width * 0.05,  # Sl
#             usable_width * 0.42,  # Description
#             usable_width * 0.09,   # HSN
#             usable_width * 0.06,  # GST
#             usable_width * 0.1,  # Quantity
#             usable_width * 0.10,  # Rate
#             usable_width * 0.06,  # Per
#             usable_width * 0.12   # Amount
#         ]

#         table = Table(data_rows, colWidths=col_widths, repeatRows=1)
#         last_row_idx = len(data_rows) - 1

#         table.setStyle(TableStyle([
#             ('BOX', (0, 0), (-1, last_row_idx), 0.8, colors.black), 
#             ('BACKGROUND', (0, 0), (-1, 0), colors.lightgrey),
#             ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
#             ('LINEBELOW', (0, 0), (-1, 0), 0.8, colors.black),
#             ('LINEABOVE', (7, subtotal_row_idx), (7, subtotal_row_idx), 0.6, colors.black),
#             ('LINEABOVE', (0, last_row_idx - 1), (-1, last_row_idx - 1), 0.8, colors.black), 
#             ('LINEBELOW', (0, last_row_idx - 1), (-1, last_row_idx - 1), 0.8, colors.black), 
#             *[
#                 ('LINEBEFORE', (col, 0), (col, last_row_idx), 0.4, colors.black) 
#                 for col in range(1, 8)
#             ],
#             ('VALIGN', (0, 0), (-1, -1), 'TOP'),
#             ('ALIGN', (0, 0), (0, -1), 'CENTER'),
#             ('ALIGN', (2, 0), (2, -1), 'CENTER'),
#             ('ALIGN', (3, 0), (3, -1), 'CENTER'),
#             ('ALIGN', (4, 0), (4, -1), 'CENTER'),
#             ('ALIGN', (5, 0), (5, -1), 'CENTER'),
#             ('ALIGN', (6, 0), (6, -1), 'CENTER'),
#             ('ALIGN', (1, 0), (1, last_row_idx - 3), 'LEFT'), 
#             ('ALIGN', (7, 0), (7, last_row_idx), 'RIGHT'), 
#             ('FONTSIZE', (0, 0), (-1, -1), 8),
#             ('LEFTPADDING', (0, 0), (-1, -1), 3),
#             ('RIGHTPADDING', (0, 0), (-1, -1), 3),
#             ('TOPPADDING', (0, 0), (-1, -1), 2),
#             ('BOTTOMPADDING', (0, 0), (-1, -1), 2),
#         ]))
#         return table

#     def create_declaration_and_bank_table(data, current_width):
#         declaration_text = """<b>Declaration</b><br/>
# 1. Goods once sold will not be taken back.<br/>
# 2. Interest @18%p.a will be charged if the payment is not made within the stipulated time.<br/>
# 3. Subject to Mumbai jurisdiction only.<br/>
# 4. Certified that above particulars are true & correct."""
        
#         bank_details_content = f"""<b>Company's Bank Details</b><br/>
# <b>Bank Name:</b> <font name='Helvetica'>{data['bank']['name']}</font><br/>
# <b>A/c No.:</b> <font name='Helvetica'>{data['bank']['account']}</font><br/>
# <b>Branch & IFS Code:</b> <font name='Helvetica'>{data['bank']['branch_ifsc']}</font>"""

#         declaration_paragraph = Paragraph(declaration_text, small_style)
#         bank_details_paragraph = Paragraph(bank_details_content, bank_details_style)
        
#         for_company_paragraph = Paragraph(f"<b>for {data['company']['name']}</b>", small_right_align_style)
#         authorized_signatory_paragraph = Paragraph("<b>Authorized Signatory</b>", small_right_align_style)

#         table_data = [
#             [declaration_paragraph, bank_details_paragraph],
#             [Paragraph("<b>Customer's Seal and Signature</b>", small_style), 
#              [for_company_paragraph, Spacer(1, 20), authorized_signatory_paragraph] 
#             ]
#         ]
        
#         col_width_left = current_width * 0.6
#         col_width_right = current_width * 0.4
        
#         table = Table(table_data, colWidths=[col_width_left, col_width_right])

#         table.setStyle(TableStyle([
#             ('GRID', (0, 0), (-1, -1), 1, colors.black),
#             ('VALIGN', (0, 0), (-1, -1), 'TOP'),
#             ('LEFTPADDING', (0, 0), (-1, -1), 6),
#             ('RIGHTPADDING', (0, 0), (-1, -1), 6),
#             ('TOPPADDING', (0, 0), (-1, -1), 0),
#             ('BOTTOMPADDING', (0, 0), (-1, -1), 0),
            
#             ('VALIGN', (1,0), (1,0), 'TOP'), 
            
#             ('VALIGN', (0, 1), (0, 1), 'BOTTOM'), 
#             ('BOTTOMPADDING', (0, 1), (0, 1), 20), 

#             ('VALIGN', (1, 1), (1, 1), 'BOTTOM'),
#             ('LEFTPADDING', (1,1), (1,1), 0), 
#             ('RIGHTPADDING', (1,1), (1,1), 0), 
#             ('TOPPADDING', (1,1), (1,1), 0),   
#             ('BOTTOMPADDING', (1,1), (1,1), 0)
#         ]))
        
#         return table

#     # --- Build the story ---
#     story = []
    
#     # Outer Frame for the entire invoice content
#     outer_frame = Frame(content_left_margin, content_bottom_margin, 
#                         A4[0] - content_left_margin - content_right_margin, 
#                         A4[1] - content_top_margin - content_bottom_margin, 
#                         leftPadding=0, bottomPadding=0,
#                         rightPadding=0, topPadding=0,
#                         showBoundary=1) # This draws the border

#     # Add the PageTemplate to the document
#     # BaseDocTemplate knows how to use these templates for page layout
#     doc.addPageTemplates([PageTemplate(id='AllPages', frames=[outer_frame])])

#     story.append(Paragraph("Tax Invoice", title_style))
#     story.append(Spacer(1, 12))
    
#     header_layout = create_combined_header_section(invoice_data)
#     story.append(header_layout)

#     story.append(Spacer(1, 5)) 

#     items_table = create_items_table(invoice_data['items'])
#     story.append(items_table)
#     story.append(Spacer(1, 5)) 
    
#     amount_eoe_data = [
#         [
#             Paragraph(f"<b>Amount Chargeable (in words)</b><br/>{invoice_data['amount_in_words']}", normal_style),
#             Paragraph("E. & O.E", small_right_align_style) 
#         ]
#     ]
#     amount_eoe_table = Table(amount_eoe_data, colWidths=[usable_width * 0.85, usable_width * 0.15]) 
#     amount_eoe_table.setStyle(TableStyle([
#         ('VALIGN', (0,0), (-1,-1), 'BOTTOM'), 
#         ('TOPPADDING', (0,0), (-1,-1), 0),
#         ('BOTTOMPADDING', (0,0), (-1,0), 0), 
#         ('LEFTPADDING', (0,0), (0,0), 0),
#         ('RIGHTPADDING', (1,0), (1,0), 0),
#     ]))
#     story.append(amount_eoe_table)
#     story.append(Spacer(1, 5)) 

#     declaration_bank_table = create_declaration_and_bank_table(invoice_data, usable_width) 
#     story.append(declaration_bank_table)
#     story.append(Spacer(1, 10))
    
#     comp_note = Paragraph("This is a Computer Generated Invoice", 
#                         ParagraphStyle('Center', parent=small_style, alignment=TA_CENTER))
#     story.append(comp_note)
    
#     # Build PDF - BaseDocTemplate will automatically use the defined page templates
#     try:
#         doc.build(story) # CORRECTED: Removed 'template' argument
#         print(f"Successfully generated PDF: {filename}")
#     except Exception as e:
#         print(f"Error building PDF: {e}")
#         import traceback
#         traceback.print_exc() 
#         return None 
    
#     return filename


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
            usable_width * 0.42,  # Description
            usable_width * 0.09,   # HSN
            usable_width * 0.06,  # GST
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
            ('LEFTPADDING', (0, 0), (-1, -1), 3),
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
    
    # **CHANGES ARE HERE**
    canvas.setFont('Helvetica-Bold', 8)  # Set font to Bold
    canvas.setFillColor(BLACK_COLOR)      # Set color to Black
    
    footer_text = "Created using VYAPARI AI"
    text_y = doc.bottomMargin - 7 * mm
    canvas.drawRightString(doc.leftMargin + doc.width, text_y, footer_text)
    
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