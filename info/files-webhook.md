Environment variables for Files workflow:

- FILES_WEBHOOK_SECRET: secret string used to HMAC-sign webhook payloads between app and n8n. Example: a long random hex string.
- NEXT_PUBLIC_APP_URL: public base URL for the app (used to assemble callback URL), e.g., https://your-app.com
- Optional APP_URL: server-side base URL if different from NEXT_PUBLIC_APP_URL.

Signature generation (from app to n8n):
- App sends payload with fields { jobId, user, data, callbackUrl, timestamp, nonce, signature }
- signature = HMAC_SHA256(`${jobId}:${user.id}:${timestamp}:${nonce}`, FILES_WEBHOOK_SECRET)

Callback from n8n to app:
- POST to: https://YOUR_APP/api/files/callback
- Body: { jobId, status, result?, error?, timestamp, signature }
- signature = HMAC_SHA256(`${jobId}:${status}:${timestamp}:${nonce}`, FILES_WEBHOOK_SECRET)
- nonce is the same value your workflow received in the initial payload.

Status values expected: pending | in_progress | completed | failed (the callback should send completed or failed).
