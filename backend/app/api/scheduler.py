from apscheduler.schedulers.asyncio import AsyncIOScheduler
from services.reminder_service import process_reminders_job

# Create a scheduler instance
scheduler = AsyncIOScheduler(timezone="Asia/Kolkata")

def setup_scheduler():
    """
    Adds the reminder job to the scheduler to run at a specific interval.
    """
    print("Setting up scheduled jobs...")
    
    # Schedule process_reminders_job to run every day at 1:30 AM IST
    scheduler.add_job(
        process_reminders_job, 
        trigger='cron', 
        hour=1, 
        minute=30,
        id="daily_reminder_job",
        replace_existing=True
    )
    
    print("Scheduled jobs have been set up.")
    return scheduler
