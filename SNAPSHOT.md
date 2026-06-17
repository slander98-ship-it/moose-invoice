# STABLE-v1 Snapshot — June 17, 2026

This is the known-good rollback point for the entire Moose's Pilot Car Service system.
**Tag:** `refs/tags/STABLE-v1` on both GitHub repos.

---

## What's Working at This Snapshot

- ✅ PIN keypad login (Supabase drivers table, 9 drivers)
- ✅ 9-step invoice form — all fields, trip log, billing
- ✅ Two PDF types: PILOT CAR (Form 1) + RIG MOVE (Form 2) — download buttons on success screen
- ✅ Email send — server-side PDF via pdfkit, B&W logo top-left, attached as PDF to Resend email
- ✅ SHARE/TEXT button (Web Share API + clipboard fallback)
- ✅ Success screen — yellow branded header, side-by-side download buttons
- ✅ Supabase invoice save on submit
- ✅ Moose approval email with TAP TO APPROVE button
- ✅ Triple-tap logo on main site opens invoice app in fullscreen iframe

---

## Repo SHAs

| Repo | Commit SHA |
|------|-----------|
| slander98-ship-it/moose-invoice | `97ba1c86deb9dff8e68f56c00a891d6a6a388ae5` |
| slander98-ship-it/Mooseinvoicebolt | `cfb75cdbd8205eda48e3efefa1930d809d89fbaa` |

## File SHAs (moose-invoice)

| File | SHA |
|------|-----|
| index.html | `c6ecba31116a` |
| vercel.json | `f40d8d2940b7` |
| package.json | `3b87651bf751` |
| api/send-email.js | `641e58fd4ae6` |
| api/scan-permit.js | `7fc652b47f7c` |

---

## How to Roll Back to This Point

```bash
# Restore moose-invoice to STABLE-v1
git checkout STABLE-v1
```

Or via GitHub API — reset main to the SHA above using:
```
PATCH /repos/slander98-ship-it/moose-invoice/git/refs/heads/main
{ "sha": "97ba1c86deb9dff8e68f56c00a891d6a6a388ae5", "force": true }
```

---

## Services & Credentials (all active at snapshot)

| Service | Detail |
|---------|--------|
| Invoice App | https://moose-invoice.vercel.app |
| Main Website | https://moosepilotokc.com |
| Supabase | akdgwvhdsisoosrleuqw.supabase.co |
| Resend | invoices@moosepilotokc.com → Mooseou@yahoo.com |
| DNS | Netlify DNS panel (NSONE nameservers) |

---

## Next Items After This Snapshot

- Approval-to-trucking-company email (auto-send to trucking co email on approve)
- Zoho Books integration (KLM Group, org ID 898378763)
- Contact form on moosepilotokc.com → switch from Formspree to Resend
- Invoice number collision protection
