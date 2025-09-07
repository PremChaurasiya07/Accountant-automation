import os
import asyncio
import smtplib
from datetime import datetime
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from dotenv import load_dotenv
from cryptography.fernet import Fernet # Used for decrypting passwords
from app.core.supabase import supabase # Using your shared Supabase client

# ==============================================================================
# 1. SETUP & CONFIGURATION
# ==============================================================================

# Load environment variables from a .env file in the script's directory
load_dotenv()

# --- Cryptography Configuration ---
ENCRYPTION_KEY = os.getenv("ENCRYPTION_KEY")

# --- SMTP Email Configuration (Gmail specific as per your function) ---
SMTP_SERVER = "smtp.gmail.com"
SMTP_PORT = 587

# ==============================================================================
# 2. STATIC EMAIL BODY GENERATION
# ==============================================================================

def create_static_reminder_body(invoice_details: dict) -> str:
    """
    Generates a static, professional HTML email body for the reminder.
    """
    client_name = invoice_details.get("clientName")
    invoice_number = invoice_details.get("invoiceNumber")
    due_date = invoice_details.get("due_date")
    amount = invoice_details.get("amount")
    invoice_url = invoice_details.get("invoiceURL") # This now comes directly from the DB

    return f"""
    <html>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #333; line-height: 1.6;">
        <p>Dear {client_name},</p>
        <p>This is a friendly reminder regarding invoice <strong>#{invoice_number}</strong>, which was due on <strong>{due_date}</strong>.</p>
        <p>The outstanding amount is <strong>₹{amount:,.2f}</strong>.</p>
        <p>You can view the invoice and your payment options by clicking the secure link below:</p>
        <p style="margin: 20px 0;">
          <a href="{invoice_url}" style="color: #ffffff; background-color: #2c3e50; padding: 12px 18px; text-decoration: none; border-radius: 5px;" target="_blank">
            View Invoice
          </a>
        </p>
        <p>If you have already settled this invoice, please disregard this email. If you have any questions, please feel free to reply to this message.</p>
        <p>Thank you for your business.</p>
        <p>Best regards,<br>The Accounts Team</p>
      </body>
    </html>
    """.strip()

# ==============================================================================
# 3. EMAIL SENDING SERVICE (WITH DECRYPTION & ENHANCED ERROR HANDLING)
# ==============================================================================

async def send_reminder_email(
    to_email: str, 
    subject: str, 
    html_body: str, 
    sender_email: str, 
    encrypted_password: str
):
    """
    Decrypts the sender's password using the Fernet key and sends an HTML email.
    Includes specific error handling for authentication failures.
    """
    if not ENCRYPTION_KEY:
        raise ValueError("ENCRYPTION_KEY is not configured on the server.")

    print(f"Preparing to send email from {sender_email} to {to_email}")
    
    # Decrypt the password
    cipher_suite = Fernet(ENCRYPTION_KEY.encode())
    try:
        decrypted_password = cipher_suite.decrypt(encrypted_password.encode()).decode()
    except Exception as e:
        print(f"ERROR: Could not decrypt password for sender {sender_email}. Check key and password format. Error: {e}")
        raise ValueError("Decryption failed. Please check the seller's stored credentials.") from e

    msg = MIMEMultipart("alternative")
    msg['From'] = sender_email
    msg['To'] = to_email
    msg['Subject'] = subject
    msg.attach(MIMEText(html_body, 'html'))

    def smtp_send():
        """Synchronous helper function to run blocking SMTP code in a thread."""
        with smtplib.SMTP(SMTP_SERVER, SMTP_PORT) as server:
            server.starttls()
            server.login(sender_email, decrypted_password)
            server.send_message(msg)

    try:
        loop = asyncio.get_running_loop()
        await loop.run_in_executor(None, smtp_send)
        print(f"Successfully sent email to {to_email}")
    except smtplib.SMTPAuthenticationError as e:
        # Specific error handling for bad username/password, as in your function
        print(f"ERROR: SMTP Authentication failed for {sender_email}. Reason: {e}")
        raise ConnectionRefusedError(
            "Email sending failed. Please advise the user to check that their "
            "sender email and Google App Password are correct in their profile."
        ) from e
    except Exception as e:
        print(f"ERROR: An unexpected error occurred while sending email from {sender_email}. Reason: {e}")
        raise

# ==============================================================================
# 4. MAIN REMINDER PROCESSING LOGIC
# ==============================================================================

async def process_reminders_job():
    """
    The main job function. Finds due invoices, generates reminders with a URL,
    and sends them via email using user-specific credentials.
    """
    print(f"\n--- CRON JOB: Starting daily reminder process at {datetime.now()} ---")
    
    if not all([supabase, ENCRYPTION_KEY]):
        print("CRITICAL ERROR: Missing Supabase client or ENCRYPTION_KEY in environment. Aborting job.")
        return

    try:
        # Call the database function to get due invoices with seller credentials and invoice URL
        response = await asyncio.to_thread(lambda: supabase.rpc('get_due_invoices').execute())
        
        if not response.data:
            print("CRON JOB: Found 0 invoices to remind. Process finished.")
            return

        due_invoices = response.data
        print(f"CRON JOB: Found {len(due_invoices)} invoices to process.")

        for invoice in due_invoices:
            invoice_id = invoice['id']
            sender_email = invoice.get('senderEmail')
            encrypted_password = invoice.get('encryptedPassword')
            invoice_url = invoice.get('invoiceURL') # Get the URL from the database

            print(f"\nProcessing reminder for Invoice ID: {invoice_id} ({invoice['invoiceNumber']})")
            
            if not sender_email or not encrypted_password:
                print(f"WARNING: Skipping Invoice ID {invoice_id} because sender email or encrypted password is not configured.")
                continue

            # Check if the fetched URL is valid before proceeding
            if not invoice_url:
                print(f"WARNING: Skipping Invoice ID {invoice_id} because no invoice URL was found in the database.")
                continue

            try:
                # Create the static HTML email body using the fetched URL
                html_body = create_static_reminder_body(invoice)
                
                # Send the email using the decrypted credentials
                await send_reminder_email(
                    to_email=invoice['clientEmail'],
                    subject=f"Payment Reminder for Invoice #{invoice['invoiceNumber']}",
                    html_body=html_body,
                    sender_email=sender_email,
                    encrypted_password=encrypted_password
                )
                
                # Update the `last_reminder_sent` timestamp in the database to prevent re-sending
                await asyncio.to_thread(
                    lambda: supabase.from_('invoices_record')
                    .update({'last_reminder_sent': datetime.now().isoformat()})
                    .eq('id', invoice_id)
                    .execute()
                )
                
                print(f"Successfully processed and sent reminder for Invoice ID: {invoice_id}")

            except Exception as e:
                print(f"ERROR: Failed to process reminder for Invoice ID {invoice_id}. Reason: {e}")
                continue # Continue to the next invoice

    except Exception as e:
        print(f"CRITICAL ERROR: The reminder job failed entirely. Reason: {e}")
    
    print(f"--- CRON JOB: Reminder process finished at {datetime.now()} ---")

