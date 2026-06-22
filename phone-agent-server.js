// Rolling Wrench Diesel AI AI Dispatcher Backend
// Deploy to Render/Railway/VPS. Connect Twilio Voice webhook to POST /voice/incoming.
// This starter uses Twilio webhooks/TwiML and sends completed call leads to the app-compatible JSON shape.

import express from 'express';
import twilio from 'twilio';

const app = express();
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

const PORT = process.env.PORT || 3000;
const SHOP_NAME = process.env.SHOP_NAME || 'Rolling Wrench Diesel';
const APP_INGEST_URL = process.env.APP_INGEST_URL || ''; // future Supabase/Render endpoint to store leads
const NOTIFY_SMS_TO = process.env.NOTIFY_SMS_TO || '2605026222';
const TWILIO_FROM = process.env.TWILIO_FROM || '';
const twilioClient = process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN
  ? twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)
  : null;

const memory = [];

function twimlSayGather(message, action = '/voice/capture') {
  const vr = new twilio.twiml.VoiceResponse();
  const gather = vr.gather({ input: 'speech dtmf', speechTimeout: 'auto', numDigits: 1, action, method: 'POST' });
  gather.say({ voice: 'alice' }, message);
  vr.say({ voice: 'alice' }, 'I did not catch that. Please call again or text the shop. Thank you.');
  return vr.toString();
}

function parseLead(call) {
  const transcript = [call.step1, call.step2, call.step3, call.step4].filter(Boolean).join('\n');
  const urgent = /roadside|broke down|no start|air leak|brake|stuck|urgent|emergency/i.test(transcript);
  return {
    id: `CALL-${Date.now()}`,
    customer: call.name || 'Phone Caller',
    phone: call.from || '',
    truck: call.truck || '',
    job: call.problem || transcript || 'Phone call request',
    location: call.location || '',
    date: call.date || new Date().toISOString().slice(0, 10),
    time: call.time || '',
    urgency: urgent ? 'Urgent' : 'Normal',
    source: 'AI AI Dispatcher',
    transcript,
    status: 'New',
    created: new Date().toLocaleString()
  };
}

async function postToApp(lead) {
  if (!APP_INGEST_URL) return false;
  try {
    const res = await fetch(APP_INGEST_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(lead) });
    return res.ok;
  } catch { return false; }
}

async function notifyOwner(lead) {
  if (!twilioClient || !TWILIO_FROM || !NOTIFY_SMS_TO) return;
  const body = `${lead.urgency === 'Urgent' ? 'URGENT ' : ''}${SHOP_NAME} phone lead\n${lead.customer}\n${lead.phone}\n${lead.truck}\n${lead.job}\n${lead.location}\n${lead.date} ${lead.time}`.slice(0, 1500);
  await twilioClient.messages.create({ to: NOTIFY_SMS_TO, from: TWILIO_FROM, body });
}

const calls = new Map();

app.get('/health', (_req, res) => res.json({ ok: true, service: 'rwd-phone-agent' }));

app.post('/voice/incoming', (req, res) => {
  calls.set(req.body.CallSid, { from: req.body.From, step: 1 });
  res.type('text/xml').send(twimlSayGather(`Thank you for calling ${SHOP_NAME}. Tell me your name, company, and call back number.`));
});

app.post('/voice/capture', async (req, res) => {
  const sid = req.body.CallSid;
  const call = calls.get(sid) || { from: req.body.From, step: 1 };
  const speech = req.body.SpeechResult || req.body.Digits || '';
  if (call.step === 1) {
    call.step1 = speech; call.name = speech; call.step = 2; calls.set(sid, call);
    return res.type('text/xml').send(twimlSayGather('What truck, unit number, VIN, or equipment are we working on?'));
  }
  if (call.step === 2) {
    call.step2 = speech; call.truck = speech; call.step = 3; calls.set(sid, call);
    return res.type('text/xml').send(twimlSayGather('What is the problem or service needed? Say roadside if it is a breakdown.'));
  }
  if (call.step === 3) {
    call.step3 = speech; call.problem = speech; call.step = 4; calls.set(sid, call);
    return res.type('text/xml').send(twimlSayGather('What is the location and preferred appointment day and time?'));
  }
  call.step4 = speech; call.location = speech;
  const lead = parseLead(call);
  memory.unshift(lead);
  await postToApp(lead);
  await notifyOwner(lead).catch(() => {});
  calls.delete(sid);
  const vr = new twilio.twiml.VoiceResponse();
  vr.say({ voice: 'alice' }, 'Thank you. I have sent this to Rolling Wrench Diesel. If this is urgent, the shop will be notified right away. Goodbye.');
  vr.hangup();
  res.type('text/xml').send(vr.toString());
});

app.get('/leads', (_req, res) => res.json(memory));

app.listen(PORT, () => console.log(`RWD phone agent running on ${PORT}`));
