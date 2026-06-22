# Rolling Wrench Diesel — AI Dispatcher Phone Setup

This build adds a **AI Dispatcher** screen in the app.

## What it does now
- Saves dispatcher settings locally.
- Lets you paste a call transcript from this chat or voicemail.
- Creates a phone lead.
- Sends the lead into Schedule.
- Creates a Work Order from the call.

## Live phone connection path
1. Buy or use a Twilio phone number.
2. Deploy `phone-agent-server.js` to Render/Railway/VPS.
3. Add environment variables from `phone-agent.env.example`.
4. In Twilio, set the number Voice webhook to:
   `https://YOUR-BACKEND/voice/incoming`
5. Calls will be captured as structured leads.
6. Next production step is connecting `APP_INGEST_URL` to Supabase/Render so leads sync into every device.

## Call intake fields
- Name/company
- Callback number
- Truck/unit/VIN/equipment
- Problem/service needed
- Location
- Preferred appointment day/time
- Urgency flag

## Production note
This starter uses Twilio speech gather/TwiML. A full natural voice agent can be upgraded later with OpenAI Realtime/WebSocket or SIP once the phone number and backend are stable.
