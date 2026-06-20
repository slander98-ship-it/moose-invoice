# Moose's Pilot Car Service LLC — Invoice System
## Project Knowledge Base
### Built by KLM Group (Sean) | June 2026

---

## SYSTEM STATUS: LIVE AND WORKING
- Invoice app: https://moose-invoice.vercel.app
- Main website: https://moosepilotokc.com
- Last stable checkpoint: STABLE-v2, June 17 2026

---

## STABLE-v2 ROLLBACK — CRITICAL

If anything breaks, tell Claude: "Roll back to STABLE-v2"

### Rollback command (Claude executes this):
PATCH /repos/slander98-ship-it/moose-invoice/git/refs/heads/main
body: {"sha": "e691fc7c31c2c9a59a484560c00b9fe916fa0b89", "force": true}
Vercel auto-deploys in 60 seconds after reset.

### Repo commit SHAs at STABLE-v2:
- moose-invoice repo: e691fc7c31c2c9a59a484560c00b9fe916fa0b89
- Mooseinvoicebolt repo: cfb75cdbd8205eda48e3efefa1930d809d89fbaa
- Tags: refs/tags/STABLE-v1 and refs/tags/STABLE-v2 on both repos

### File SHAs at STABLE-v2 (moose-invoice):
- index.html:         fcf989220e73
- vercel.json:        f40d8d2940b7
- package.json:       3b87651bf751
- api/send-email.js:  e1408312c59e
- api/scan-permit.js: 7fc652b47f7c

### What STABLE-v2 contains (all working):
- PIN keypad login — 9 active drivers in Supabase
- 9-step invoice form — all fields, trip log, billing calculations
- PILOT CAR PDF (Form 1) — matches paper invoice 4554
- RIG MOVE PDF (Form 2) — matches paper invoice 0871
- Email send — server-side PDF via pdfkit:
  - B&W logo top-left
  - Driver signature from pad rendered on signature line
  - Subcontractor/escort name on escort line
  - Attached as real PDF via Resend
- SHARE/TEXT buttons (Web Share API + clipboard fallback)
- Supabase invoice save on submit
- Moose approval email with TAP TO APPROVE button
- Triple-tap logo on moosepilotokc.com opens invoice app in fullscreen iframe

---

## ARCHITECTURE — TWO SEPARATE REPOS, NEVER MERGE

### Repo 1: Invoice App
- GitHub: slander98-ship-it/moose-invoice
- Vercel project: moose-invoice (prj_8p3naPIMB9aXoYfX9RYKFfZ4K8r0)
- Live URL: https://moose-invoice.vercel.app
- Files: index.html, package.json, vercel.json, api/send-email.js, api/scan-permit.js

### Repo 2: Main Website
- GitHub: slander98-ship-it/Mooseinvoicebolt
- Vercel project: mooseisloose (prj_ZKOwi9AbLFV1IhyEqgslCTQfsw7Z)
- Live URL: https://moosepilotokc.com
- Triple-tap logo triggers fullscreen iframe loading the invoice app

---

## TECH STACK

| Service | Purpose | Status |
|---------|---------|--------|
| Vercel | Hosts both projects | Live |
| GitHub (slander98-ship-it) | Source control | Active |
| Supabase | Database — drivers, invoices, customers | Live |
| Resend | Transactional email | Live |
| pdfkit | Server-side PDF generation | Working |
| OpenAI | Permit scan (OPENAI_KEY in Vercel env) | Built |
| Netlify | DNS management only (not hosting) | Active |

---

## CREDENTIALS

| Item | Value |
|------|-------|
| GitHub Token | GITHUB_TOKEN_IN_VERCEL_ENV |
| Supabase URL | https://akdgwvhdsisoosrleuqw.supabase.co |
| Resend API Key | re_8MCmYaxY_5ZAb9nVLDyPKyoAo9r7f515D |
| Email FROM | invoices@moosepilotokc.com |
| Email TO (Moose) | Mooseou@yahoo.com |
| Zoho Books Org | KLM Group, org ID 898378763 |

---

## SUPABASE SCHEMA

### drivers table
| Column | Type | Notes |
|--------|------|-------|
| pin | text | Last 4 digits of phone |
| name | text | Driver full name |
| phone | text | Full phone number |
| active | boolean | Soft disable |

### Active Drivers
| Driver | PIN | Driver | PIN |
|--------|-----|--------|-----|
| Moose | 5484 | Kris | 8689 |
| Miguel | 0822 | Sweet | 7663 |
| Miesha | 0910 | Jon J | 7418 |
| Jackie | 4312 | Paul Wilson | 3595 |
| Matt Cottmon | 0602 | | |

### invoices table (key columns)
- approval_token, status (pending/approved/denied)
- invoice_num, driver_name, driver_phone
- trucking_co, billing_addr, contact
- pickup/dropoff addresses, dates
- escorted miles, rates, all charge line items
- grand_total, trip_log (JSONB), signature_data (base64)
- withhold_pct, driver_payout, moose_keeps
- billing_method (mileage or flat_day_rate)

### customers table
- name (autocomplete in form), billing_addr, phone, contact, email

---

## INVOICE FORM — 9 STEPS

| Step | Fields |
|------|--------|
| 1 | Invoice date, Invoice #, Start Odometer |
| 2 | Pilot Position: Lead/Chase/High Pole/Steer Man |
| 3 | Trucking Co (autocomplete), Phone, Billing Address, Contact |
| 4 | Truck #, Trailer # |
| 5 | Trip Log — per day: Date, Start/End City, Times, Motel Y/N |
| 6 | Load description, Height, Width, Length, Weight, Job # |
| 7 | Pickup address/city/state/date, Dropoff, End Odometer |
| 8 | Billing method + all charge line items |
| 9 | Subcontractor name, DBA, Signature pad |

## BILLING RATE LOGIC
- Mileage: escorted miles @ rate, fuel S/C, deadhead, motels, downtime, no-go
- Flat day rate: $550 x days (min 1)
- System charges whichever is HIGHER (mileage vs day rate)
- High Pole/Steer Man: $2.15/mile vs $550/day
- Lead/Chase: $1.95/mile vs $550/day
- Motel default: $125/night

---

## PDF FORMS

### Form 1 — Pilot Car (Single Driver) — matches paper invoice 4554
- Header: B&W logo + company name + invoice number
- Pilot position checkboxes
- Trucking company info, driver info, load details
- Trip log table (5 rows minimum)
- Downtime + No-Go sections
- All charge line items + total
- Driver signature + date
- Escort subcontracting line
- Terms: Due Upon Receipt / 45 days 9%/month

### Form 2 — Rig Move (Multi-Driver) — matches paper invoice 0871
- Header: B&W logo + company name + invoice number
- Truck Company + RIG#
- Start/End Odometer, Total Miles, Total DH Miles
- Pick Up to Drop Off with direction arrows
- Multi-driver table: Driver Name, Truck #, F, R, HP
- Charges: Total Escorted Miles, Flat Day Rate, High Pole, Hotels
- Terms: Due Upon Receipt / 30 days 5%/month

---

## EMAIL SYSTEM
- send-email.js builds PDF server-side using pdfkit
- Logo embedded as base64 (no external dependency)
- Driver signature rendered from pad drawing (base64 PNG)
- Escort subcontractor name printed on escort line
- PDF attached to Resend email
- Email body is clean HTML summary
- Approval email sent to Mooseou@yahoo.com with TAP TO APPROVE button
- Approval page loads from Supabase via token in URL
- Moose sets withhold %, sees driver payout vs his cut, taps APPROVE

---

## DNS — CRITICAL NOTE
- moosepilotokc.com uses NSONE nameservers
- DNS managed in NETLIFY dashboard (not domain.com, not Vercel)
- To change DNS: Netlify > moosepilotokc.com site > Domain management > Netlify DNS

---

## CODING RULES — NEVER VIOLATE

1. NEVER put HTML template literals inside index.html — kills the PIN keypad JavaScript parser
2. All email/invoice HTML built server-side in api/send-email.js only
3. NEVER restore entire files for surgical fixes — targeted edits only
4. ALWAYS fetch live file state from GitHub before editing
5. ALWAYS use Git Data API for pushes (blob > tree > commit > PATCH ref)
6. NEVER use Contents API PUT after a file has been modified in same session (422 errors)
7. Keep the two repos completely separate — never merge
8. Confirm changes before making them
9. Never store API keys in source code — all keys in Vercel environment variables

---

## OUTSTANDING / NEXT ITEMS
1. Auto-email trucking company on Moose approval (trucking co email from Step 3)
2. Zoho Books integration (org ID 898378763)
3. Contact form on moosepilotokc.com — move from Formspree to Resend
4. Invoice number collision protection
5. Aimee Jaree Moslander PIN 8085 — add to drivers table

---

## RELATIONSHIP TO KALISSA PROJECT
This system is the working prototype for Kalissa — a multi-tenant field service
management SaaS platform. Moose is Customer Zero. Everything built here
becomes Module 1 (Invoicing) of Kalissa. Do not modify Moose's system
when building Kalissa — they stay separate until Kalissa is ready for migration.
