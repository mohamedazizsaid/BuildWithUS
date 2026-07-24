// Sends a sample payment payload to the fake CRM exactly the way api-gateway
// will: JSON body + Bearer token + HMAC-SHA256 signature over the raw bytes.
//
//   node send-test.js                      # succeeds (valid signature)
//   node send-test.js --bad-sig            # should be rejected 400
//   node send-test.js --bad-key            # should be rejected 401
//
// Run `npm start` in another terminal first.
require('dotenv').config();
const crypto = require('crypto');

const PORT = Number(process.env.PORT || 5600);
const WEBHOOK_PATH = process.env.WEBHOOK_PATH || '/webhook/payments';
const API_KEY = process.env.CRM_API_KEY || 'dev-crm-api-key';
const HMAC_SECRET = process.env.CRM_HMAC_SECRET || 'dev-crm-hmac-secret';

const badSig = process.argv.includes('--bad-sig');
const badKey = process.argv.includes('--bad-key');

// Same shape api-gateway forwards (see billing.controller.ts forwardToCrm).
const payload = {
  event_id: 'in_test_' + Math.floor(Math.random() * 1e9),
  event_type: 'payment.succeeded',
  occurred_at: new Date().toISOString(),
  tenant: { id: 'tnt_demo_123', name: 'ACME SARL' },
  customer: { email: 'billing@acme.example', stripe_customer_id: 'cus_TEST123' },
  payment: {
    invoice_id: 'in_TEST123',
    amount_ht: 2500,
    tva: 500,
    amount_ttc: 3000,
    currency: 'eur',
    plan: 'pro',
    billing_cycle: 'monthly',
    status: 'paid',
    subscription_status: 'active',
    paid_at: new Date().toISOString(),
    next_payment_at: new Date(Date.now() + 30 * 864e5).toISOString(),
    stripe_subscription_id: 'sub_TEST123',
    hosted_invoice_url: 'https://invoice.stripe.com/i/test',
    invoice_pdf: 'https://invoice.stripe.com/i/test.pdf',
  },
};

const raw = Buffer.from(JSON.stringify(payload));
let signature = crypto.createHmac('sha256', HMAC_SECRET).update(raw).digest('hex');
if (badSig) signature = 'deadbeef';

(async () => {
  const res = await fetch(`http://localhost:${PORT}${WEBHOOK_PATH}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${badKey ? 'wrong-key' : API_KEY}`,
      'X-Winaity-Signature': signature,
    },
    body: raw,
  });
  console.log('HTTP', res.status, await res.text());
})().catch((e) => {
  console.error('Request failed — is the fake CRM running (npm start)?', e.message);
  process.exit(1);
});
