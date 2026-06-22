# RWD Dispatcher Module - App Build 004

This build adds the phone answering/dispatcher system directly inside the Rolling Wrench Diesel app.

## App Module
Home button: **RWD Dispatcher**

## What it does now inside the app
- Stores Twilio/business phone settings
- Stores greeting, booking rules, urgent rules, and notify number
- Lets you paste a call note/transcript into the app
- Turns the transcript into a dispatcher lead
- Converts a lead into:
  - Customer record
  - Schedule job
  - Work order
  - Invoice draft

## Twilio setup path
After the backend is deployed, Twilio needs this voice webhook:

`https://YOUR-BACKEND-URL/voice/incoming`

Set Twilio phone number settings:
- A call comes in: Webhook
- Method: POST
- URL: `/voice/incoming` endpoint above

## Important
The app is static on GitHub Pages. Twilio cannot post directly into a static GitHub Pages app. It needs the included backend server or a Supabase Edge Function between Twilio and the app data.

## Files
- `app.js` contains the in-app RWD Dispatcher screen
- `phone-agent-server.js` contains the Twilio voice webhook starter
- `phone-agent.env.example` contains environment variable names
