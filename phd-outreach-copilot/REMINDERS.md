# Reminder Automation (v0.3.5)

## What is implemented
- Dashboard shows **due follow-ups** based on `nextFollowUpAt`
- API endpoint: `GET /api/reminders/due`

## Suggested automation
Use your scheduler (OpenClaw cron / server cron) to call `/api/reminders/due` every 30-60 minutes,
then send alerts to your preferred channel when `due.length > 0`.

## Reminder logic
A lead is due when:
- `next_follow_up_at <= now`
- status is one of: `draft | sent | replied`
