# Fake CRM Gestion — payment webhook receiver

A stand-in for the real **CRM Gestion** platform, used to develop and test the
Winaity → CRM payment forwarding **before** the real CRM is ready. It implements
exactly the contract the real CRM must implement:

- **One POST endpoint** (default `POST /webhook/payments`)
- **Bearer auth** — `Authorization: Bearer <CRM_API_KEY>`
- **HMAC signature check** — `X-Winaity-Signature: hmac_sha256(rawBody, CRM_HMAC_SECRET)`
- **Idempotent** — the same `event_id` is recorded once (deliveries can repeat)
- Returns **200** on success

Everything received is shown live at `http://localhost:5600` (auto-refresh 5s).

## Run

```bash
cd crm-gestion-fake
cp .env.example .env      # keep the dev secrets, or set your own
npm install
npm start                 # → http://localhost:5600
```

## Prove it works (no Stripe needed)

In a second terminal:

```bash
node send-test.js            # → HTTP 200 {"ok":true}   (valid signature)
node send-test.js --bad-sig  # → HTTP 400 invalid_signature
node send-test.js --bad-key  # → HTTP 401 invalid_api_key
```

Open `http://localhost:5600` to see the payload land.

## Payload shape

```json
{
  "event_id": "in_...",              // Stripe invoice id — used for idempotency
  "event_type": "payment.succeeded", // .failed | subscription.canceled
  "occurred_at": "ISO-8601",
  "tenant":   { "id": "...", "name": "ACME SARL" },
  "customer": { "email": "...", "stripe_customer_id": "cus_..." },
  "payment": {
    "invoice_id": "in_...",
    "amount_ht": 2500,               // cents, pre-tax
    "tva": 500,                      // cents
    "amount_ttc": 3000,              // cents, total charged
    "currency": "eur",
    "plan": "pro",                   // pro | pro_org
    "billing_cycle": "monthly",      // monthly | annual
    "status": "paid",
    "subscription_status": "active",
    "paid_at": "ISO-8601",
    "next_payment_at": "ISO-8601",   // next renewal date
    "stripe_subscription_id": "sub_...",
    "hosted_invoice_url": "https://...",
    "invoice_pdf": "https://...pdf"
  }
}
```

> This is a dev tool. State is in memory only — restart clears it. Do not deploy.
