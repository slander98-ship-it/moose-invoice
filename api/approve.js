export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const SB_URL = 'https://akdgwvhdsisoosrleuqw.supabase.co';
  const SB_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFrZGd3dmhkc2lzb29zcmxldXF3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE0NDM1ODgsImV4cCI6MjA5NzAxOTU4OH0.xNMnvfpVcRWtGGDzRh3DwWyY1VLQJbqdpV_dxP5YoSs';
  const RESEND_KEY = process.env.RESEND_API_KEY;

  const sbHeaders = {
    'apikey': SB_ANON,
    'Authorization': `Bearer ${SB_ANON}`,
    'Content-Type': 'application/json',
    'Prefer': 'return=representation'
  };

  async function sbGet(table, filter) {
    const r = await fetch(`${SB_URL}/rest/v1/${table}?${filter}`, { headers: sbHeaders });
    return r.json();
  }

  async function sbPatch(table, filter, body) {
    const r = await fetch(`${SB_URL}/rest/v1/${table}?${filter}`, {
      method: 'PATCH',
      headers: sbHeaders,
      body: JSON.stringify(body)
    });
    return r.json();
  }

  // ── POST: handle approve or deny action ──────────────────────────────────
  if (req.method === 'POST') {
    try {
      const { token, action, withhold_pct, trucking_email, deny_reason, invoice_edits } = req.body;
      if (!token || !action) return res.status(400).json({ error: 'Missing token or action' });

      // Fetch invoice
      const rows = await sbGet('invoices', `approval_token=eq.${token}&select=*`);
      if (!rows || !rows.length) return res.status(404).json({ error: 'Invoice not found' });
      const inv = rows[0];

      // Merge any edits Moose made
      const d = { ...inv, ...(invoice_edits || {}) };
      const total = parseFloat(d.total_amount || 0);

      if (action === 'approve') {
        const pct = parseFloat(withhold_pct || 0);
        const moose_keeps = +(total * pct / 100).toFixed(2);
        const driver_payout = +(total - moose_keeps).toFixed(2);

        await sbPatch('invoices', `approval_token=eq.${token}`, {
          status: 'approved',
          withhold_pct: pct,
          moose_keeps,
          driver_payout,
          approved_at: new Date().toISOString(),
          // save any edits back
          trucking_co_name: d.trucking_co_name,
          billing_address: d.billing_address,
          contact_name: d.contact_name,
          trucking_co_phone: d.trucking_co_phone,
          load_type: d.load_type,
          load_height: d.load_height,
          load_width: d.load_width,
          load_length: d.load_length,
          load_weight: d.load_weight,
          escorted_miles: d.escorted_miles,
          escorted_rate: d.escorted_rate,
          deadhead_miles: d.deadhead_miles,
          deadhead_rate: d.deadhead_rate,
          flat_day_qty: d.flat_day_qty,
          flat_day_rate: d.flat_day_rate,
          motel_qty: d.motel_qty,
          motel_rate: d.motel_rate,
          downtime_hours: d.downtime_hours,
          downtime_rate: d.downtime_rate,
          nogo_qty: d.nogo_qty,
          nogo_rate: d.nogo_rate,
          total_amount: total
        });

        // Send PDF to trucking company if email provided
        if (trucking_email && trucking_email.trim()) {
          const invNum = (d.invoice_number || '').replace('INV-', '');
          // Call our own send-email endpoint
          await fetch(`https://moose-invoice.vercel.app/api/send-email`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              to: trucking_email.trim(),
              subject: `Invoice #${invNum} — Moose's Pilot Car Service, LLC`,
              invoiceData: {
                invNum,
                date: d.job_date,
                position: d.pilot_position,
                driver_name: d.driver_name,
                driver_phone: d.driver_phone,
                driver_truck: d.driver_truck_number,
                driver_trailer: d.driver_trailer_number,
                trucking_co: d.trucking_co_name,
                trucking_co_phone: d.trucking_co_phone,
                billing_address: d.billing_address,
                contact_name: d.contact_name,
                load_type: d.load_type,
                load_height: d.load_height,
                load_width: d.load_width,
                load_length: d.load_length,
                load_weight: d.load_weight,
                pickup_location: d.pickup_location,
                pickup_city: d.pickup_city,
                pickup_state: d.pickup_state,
                pickup_date: d.pickup_date,
                dropoff_location: d.dropoff_location,
                dropoff_city: d.dropoff_city,
                dropoff_state: d.dropoff_state,
                dropoff_date: d.dropoff_date,
                trips: d.trips_json ? JSON.parse(d.trips_json) : [],
                start_odometer: d.start_odometer,
                end_odometer: d.end_odometer,
                tripMi: d.trip_miles,
                escorted_miles: parseFloat(d.escorted_miles || 0),
                escorted_rate: parseFloat(d.escorted_rate || 0),
                fuel_sc_miles: parseFloat(d.fuel_sc_miles || 0),
                fuel_sc_rate: parseFloat(d.fuel_sc_rate || 0),
                deadhead_miles: parseFloat(d.deadhead_miles || 0),
                deadhead_rate: parseFloat(d.deadhead_rate || 0),
                flat_day_qty: parseFloat(d.flat_day_qty || 0),
                flat_day_rate: parseFloat(d.flat_day_rate || 0),
                half_day_qty: parseFloat(d.half_day_qty || 0),
                half_day_rate: parseFloat(d.half_day_rate || 0),
                motel_qty: parseFloat(d.motel_qty || 0),
                motel_rate: parseFloat(d.motel_rate || 0),
                downtime_hours: parseFloat(d.downtime_hours || 0),
                downtime_rate: parseFloat(d.downtime_rate || 0),
                nogo_qty: parseFloat(d.nogo_qty || 0),
                nogo_rate: parseFloat(d.nogo_rate || 0),
                total: total,
                sigData: d.signature_data,
                escort_sub: d.escort_subcontractor
              }
            })
          });
        }

        return res.status(200).json({ ok: true, action: 'approved', driver_payout, moose_keeps });

      } else if (action === 'deny') {
        await sbPatch('invoices', `approval_token=eq.${token}`, {
          status: 'denied',
          deny_reason: deny_reason || '',
          denied_at: new Date().toISOString()
        });
        return res.status(200).json({ ok: true, action: 'denied' });
      }

      return res.status(400).json({ error: 'Unknown action' });

    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  }

  // ── GET: serve the approval page ─────────────────────────────────────────
  if (req.method !== 'GET') return res.status(405).end();

  const token = req.query.token;
  if (!token) {
    return res.status(400).send('<h2>Missing approval token.</h2>');
  }

  let inv = null;
  try {
    const rows = await sbGet('invoices', `approval_token=eq.${token}&select=*`);
    if (rows && rows.length) inv = rows[0];
  } catch (e) {
    return res.status(500).send('<h2>Database error.</h2>');
  }

  if (!inv) return res.status(404).send('<h2>Invoice not found.</h2>');

  const already = inv.status === 'approved' || inv.status === 'denied';
  const invNum = (inv.invoice_number || '').replace('INV-', '');
  const total = parseFloat(inv.total_amount || 0);

  const fa = (q, r) => (q > 0 && r > 0) ? '$' + (q * r).toFixed(2) : '';
  const fq = v => (v > 0 ? v : '');
  const fp = v => (v > 0 ? '$' + parseFloat(v).toFixed(2) : '');

  const lineRows = [
    ['TOTAL ESCORTED MILES', inv.escorted_miles, inv.escorted_rate, 'escorted_miles', 'escorted_rate'],
    ['FUEL S/C – MILES', inv.fuel_sc_miles, inv.fuel_sc_rate, 'fuel_sc_miles', 'fuel_sc_rate'],
    ['DEADHEAD MILES', inv.deadhead_miles, inv.deadhead_rate, 'deadhead_miles', 'deadhead_rate'],
    ['FLAT DAY RATE', inv.flat_day_qty, inv.flat_day_rate, 'flat_day_qty', 'flat_day_rate'],
    ['½ DAY RATE', inv.half_day_qty, inv.half_day_rate, 'half_day_qty', 'half_day_rate'],
    ['MOTELS', inv.motel_qty, inv.motel_rate, 'motel_qty', 'motel_rate'],
    ['DOWN TIME', inv.downtime_hours, inv.downtime_rate, 'downtime_hours', 'downtime_rate'],
    ["NO-GO'S", inv.nogo_qty, inv.nogo_rate, 'nogo_qty', 'nogo_rate'],
  ].filter(([,q,r]) => parseFloat(q||0) > 0 || parseFloat(r||0) > 0);

  const lineHTML = lineRows.map(([lbl, q, r, qk, rk]) => `
    <tr>
      <td class="lbl">${lbl}</td>
      <td><input class="edit-num line-qty" data-key="${qk}" value="${parseFloat(q||0)||''}" placeholder="0" oninput="recalc()"></td>
      <td style="color:#888;font-size:11px;padding:0 4px;">@</td>
      <td><input class="edit-num line-rate" data-key="${rk}" value="${parseFloat(r||0)||''}" placeholder="0.00" oninput="recalc()"></td>
      <td class="amt" id="amt_${qk}"></td>
    </tr>`).join('');

  const trips = (() => { try { return JSON.parse(inv.trips_json || '[]'); } catch(e) { return []; } })();
  const to12 = t => { if (!t) return ''; const [h,m] = t.split(':').map(Number); if(isNaN(h)) return t; const ap = h>=12?'PM':'AM'; const hr = h%12||12; return hr+':'+(m<10?'0':'')+m+' '+ap; };
  const tripRows = trips.map(t => `
    <tr>
      <td>${t.date||''}</td><td>${t.startCity||''}</td><td>${to12(t.startTime)}</td>
      <td>${t.endCity||''}</td><td>${to12(t.endTime)}</td><td>${t.motel||'N'}</td>
    </tr>`).join('');

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Review Invoice #${invNum} — Moose's Pilot Car Service</title>
<link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Barlow+Condensed:wght@400;600;700&display=swap" rel="stylesheet">
<style>
  *{box-sizing:border-box;margin:0;padding:0;}
  body{background:#0a0a0a;color:#fff;font-family:'Barlow Condensed',sans-serif;font-size:15px;padding:0 0 60px;}
  .topbar{background:#FFE500;padding:14px 18px;display:flex;align-items:center;gap:12px;}
  .topbar-title{font-family:'Bebas Neue',sans-serif;font-size:1.5rem;color:#000;letter-spacing:.05em;}
  .topbar-sub{font-size:.85rem;color:#000;opacity:.75;}
  .inv-badge{margin-left:auto;background:#000;color:#FFE500;font-family:'Bebas Neue',sans-serif;font-size:1.4rem;padding:4px 14px;border-radius:6px;}
  .card{background:#141414;border:1px solid #2a2a2a;border-radius:10px;padding:16px;margin:14px 14px 0;}
  .card-title{font-family:'Bebas Neue',sans-serif;font-size:1rem;color:#FFE500;letter-spacing:.05em;margin-bottom:10px;}
  .row2{display:grid;grid-template-columns:1fr 1fr;gap:8px;}
  .field{display:flex;flex-direction:column;gap:3px;margin-bottom:8px;}
  .field label{font-size:11px;color:#888;text-transform:uppercase;letter-spacing:.06em;}
  .field input,.field textarea{background:#0d0d0d;border:1px solid #333;border-radius:6px;color:#fff;font-family:'Barlow Condensed',sans-serif;font-size:14px;padding:7px 10px;}
  .field textarea{resize:vertical;min-height:54px;}
  .field input:focus,.field textarea:focus{outline:none;border-color:#FFE500;}
  table.line-table{width:100%;border-collapse:collapse;}
  table.line-table th{font-size:10px;color:#888;text-align:left;padding:3px 4px;border-bottom:1px solid #222;}
  table.line-table td{padding:3px 4px;vertical-align:middle;}
  table.line-table td.lbl{font-size:12px;color:#ccc;white-space:nowrap;}
  table.line-table td.amt{font-size:13px;font-weight:700;color:#FFE500;text-align:right;min-width:72px;}
  .edit-num{background:#0d0d0d;border:1px solid #2a2a2a;border-radius:4px;color:#fff;font-family:'Barlow Condensed',sans-serif;font-size:13px;padding:3px 6px;width:72px;}
  .edit-num:focus{outline:none;border-color:#FFE500;}
  .total-row{display:flex;justify-content:space-between;align-items:center;border-top:2px solid #FFE500;padding-top:10px;margin-top:8px;}
  .total-lbl{font-family:'Bebas Neue',sans-serif;font-size:1rem;color:#FFE500;}
  .total-val{font-family:'Bebas Neue',sans-serif;font-size:1.6rem;color:#FFE500;}
  .slider-wrap{margin:12px 0 6px;}
  .slider-wrap label{font-size:11px;color:#888;text-transform:uppercase;letter-spacing:.06em;}
  input[type=range]{width:100%;accent-color:#FFE500;margin:8px 0;}
  .payout-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:10px;}
  .payout-box{background:#0d0d0d;border:1px solid #2a2a2a;border-radius:8px;padding:12px;text-align:center;}
  .payout-box .p-lbl{font-size:11px;color:#888;text-transform:uppercase;letter-spacing:.06em;margin-bottom:4px;}
  .payout-box .p-val{font-family:'Bebas Neue',sans-serif;font-size:1.5rem;}
  .payout-box.driver .p-val{color:#4caf50;}
  .payout-box.moose .p-val{color:#FFE500;}
  .pct-display{text-align:center;font-size:13px;color:#888;margin-top:2px;}
  .trip-table{width:100%;border-collapse:collapse;font-size:12px;}
  .trip-table th{font-size:10px;color:#888;padding:3px 4px;text-align:left;border-bottom:1px solid #222;}
  .trip-table td{padding:3px 4px;color:#ddd;}
  .status-banner{padding:16px;text-align:center;font-family:'Bebas Neue',sans-serif;font-size:1.4rem;border-radius:8px;margin:14px;}
  .status-banner.approved{background:#1a3d1a;color:#4caf50;border:1px solid #4caf50;}
  .status-banner.denied{background:#3d1a1a;color:#f44336;border:1px solid #f44336;}
  .btn-row{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin:14px;}
  .btn{padding:16px;border:none;border-radius:8px;font-family:'Bebas Neue',sans-serif;font-size:1.3rem;letter-spacing:.06em;cursor:pointer;width:100%;}
  .btn-approve{background:#FFE500;color:#000;}
  .btn-approve:active{background:#d4c000;}
  .btn-deny{background:#1a1a1a;color:#f44336;border:1px solid #f44336;}
  .btn-deny:active{background:#2a0a0a;}
  .btn:disabled{opacity:.4;cursor:not-allowed;}
  .toast{position:fixed;bottom:20px;left:50%;transform:translateX(-50%);background:#FFE500;color:#000;font-family:'Bebas Neue',sans-serif;font-size:1.1rem;padding:12px 28px;border-radius:8px;display:none;z-index:999;}
  .section-note{font-size:11px;color:#555;margin-top:4px;}
  .deny-section{display:none;}
</style>
</head>
<body>

<div class="topbar">
  <div>
    <div class="topbar-title">Moose's Pilot Car Service</div>
    <div class="topbar-sub">Invoice Review & Approval</div>
  </div>
  <div class="inv-badge">#${invNum}</div>
</div>

${already ? `
<div class="status-banner ${inv.status}">
  ${inv.status === 'approved' ? '✅ APPROVED' : '❌ DENIED'}
  ${inv.status === 'denied' && inv.deny_reason ? `<div style="font-size:.85rem;font-family:'Barlow Condensed',sans-serif;margin-top:4px;">${inv.deny_reason}</div>` : ''}
</div>` : ''}

<!-- INVOICE INFO (editable) -->
<div class="card">
  <div class="card-title">Invoice Details</div>
  <div class="row2">
    <div class="field"><label>Invoice #</label><input id="f_invoice_number" value="${invNum}" readonly style="opacity:.5;"></div>
    <div class="field"><label>Date</label><input id="f_date" value="${inv.job_date||''}"></div>
    <div class="field"><label>Driver</label><input id="f_driver_name" value="${inv.driver_name||''}"></div>
    <div class="field"><label>Position</label><input id="f_position" value="${inv.pilot_position||''}"></div>
  </div>
  <div class="field"><label>Trucking Company</label><input id="f_trucking_co_name" value="${inv.trucking_co_name||''}"></div>
  <div class="row2">
    <div class="field"><label>Phone</label><input id="f_trucking_co_phone" value="${inv.trucking_co_phone||''}"></div>
    <div class="field"><label>Contact</label><input id="f_contact_name" value="${inv.contact_name||''}"></div>
  </div>
  <div class="field"><label>Billing Address</label><input id="f_billing_address" value="${inv.billing_address||''}"></div>
  <div class="row2">
    <div class="field"><label>Pickup</label><input id="f_pickup" value="${[inv.pickup_location,inv.pickup_city,inv.pickup_state].filter(Boolean).join(', ')||''}" readonly style="opacity:.5;"></div>
    <div class="field"><label>Dropoff</label><input id="f_dropoff" value="${[inv.dropoff_location,inv.dropoff_city,inv.dropoff_state].filter(Boolean).join(', ')||''}" readonly style="opacity:.5;"></div>
  </div>
  <div class="row2">
    <div class="field"><label>Load</label><input id="f_load_type" value="${inv.load_type||''}"></div>
    <div class="field"><label>Truck #</label><input id="f_truck" value="${inv.driver_truck_number||''}" readonly style="opacity:.5;"></div>
  </div>
</div>

<!-- TRIP LOG -->
${trips.length ? `
<div class="card">
  <div class="card-title">Trip Log</div>
  <div style="overflow-x:auto;">
    <table class="trip-table">
      <thead><tr><th>Date</th><th>Start</th><th>Time</th><th>End</th><th>Time</th><th>Motel</th></tr></thead>
      <tbody>${tripRows}</tbody>
    </table>
  </div>
</div>` : ''}

<!-- CHARGES (editable) -->
<div class="card">
  <div class="card-title">Charges</div>
  <table class="line-table">
    <thead><tr><th>Item</th><th>Qty</th><th></th><th>Rate</th><th style="text-align:right;">Amount</th></tr></thead>
    <tbody id="line-body">
      ${lineHTML}
    </tbody>
  </table>
  <div class="total-row">
    <span class="total-lbl">TOTAL CHARGES</span>
    <span class="total-val" id="grand-total">$${total.toFixed(2)}</span>
  </div>
</div>

<!-- WITHHOLD -->
<div class="card">
  <div class="card-title">Withholding</div>
  <div class="slider-wrap">
    <label>Withhold Percentage — <span id="pct-label">0%</span></label>
    <input type="range" id="withhold-slider" min="0" max="50" step="1" value="0" oninput="recalc()">
  </div>
  <div class="payout-grid">
    <div class="payout-box driver">
      <div class="p-lbl">Driver Gets</div>
      <div class="p-val" id="driver-gets">$${total.toFixed(2)}</div>
    </div>
    <div class="payout-box moose">
      <div class="p-lbl">Moose Keeps</div>
      <div class="p-val" id="moose-keeps">$0.00</div>
    </div>
  </div>
</div>

<!-- TRUCKING CO EMAIL -->
<div class="card">
  <div class="card-title">Forward to Trucking Company</div>
  <div class="field">
    <label>Trucking Company Email</label>
    <input type="email" id="trucking-email" placeholder="billing@truckingco.com">
  </div>
  <div class="section-note">Optional — if provided, the approved invoice PDF will be emailed to this address.</div>
</div>

<!-- DENY REASON (shown when deny tapped) -->
<div class="card deny-section" id="deny-section">
  <div class="card-title" style="color:#f44336;">Denial Reason</div>
  <div class="field">
    <label>Reason for Denial</label>
    <textarea id="deny-reason" placeholder="e.g. Missing mileage, incorrect rate, duplicate submission..."></textarea>
  </div>
  <div class="section-note">Driver notification email will be available once driver emails are on file.</div>
  <button class="btn btn-deny" style="margin-top:12px;width:100%;" onclick="confirmDeny()">CONFIRM DENY</button>
</div>

${!already ? `
<div class="btn-row">
  <button class="btn btn-approve" id="btn-approve" onclick="doApprove()">✅ APPROVE</button>
  <button class="btn btn-deny" id="btn-deny" onclick="showDeny()">❌ DENY</button>
</div>` : ''}

<div class="toast" id="toast"></div>

<script>
const TOKEN = '${token}';
const BASE_TOTAL_START = ${total};

function recalc() {
  // Recalculate total from line items
  let t = 0;
  document.querySelectorAll('#line-body tr').forEach(row => {
    const qEl = row.querySelector('.line-qty');
    const rEl = row.querySelector('.line-rate');
    const aEl = row.querySelector('.amt');
    const qk = qEl ? qEl.dataset.key : null;
    const q = parseFloat(qEl?.value || 0);
    const r = parseFloat(rEl?.value || 0);
    const amt = q > 0 && r > 0 ? q * r : 0;
    if (aEl) aEl.textContent = amt > 0 ? '$' + amt.toFixed(2) : '';
    t += amt;
  });
  document.getElementById('grand-total').textContent = '$' + t.toFixed(2);

  const pct = parseInt(document.getElementById('withhold-slider').value || 0);
  document.getElementById('pct-label').textContent = pct + '%';
  const keeps = +(t * pct / 100).toFixed(2);
  const gets = +(t - keeps).toFixed(2);
  document.getElementById('driver-gets').textContent = '$' + gets.toFixed(2);
  document.getElementById('moose-keeps').textContent = '$' + keeps.toFixed(2);
}

function getEdits() {
  return {
    trucking_co_name: document.getElementById('f_trucking_co_name').value,
    trucking_co_phone: document.getElementById('f_trucking_co_phone').value,
    contact_name: document.getElementById('f_contact_name').value,
    billing_address: document.getElementById('f_billing_address').value,
    load_type: document.getElementById('f_load_type').value,
    driver_name: document.getElementById('f_driver_name').value,
    ...getLineEdits()
  };
}

function getLineEdits() {
  const out = {};
  document.querySelectorAll('#line-body tr').forEach(row => {
    const qEl = row.querySelector('.line-qty');
    const rEl = row.querySelector('.line-rate');
    if (qEl) out[qEl.dataset.key] = parseFloat(qEl.value || 0);
    if (rEl) out[rEl.dataset.key] = parseFloat(rEl.value || 0);
  });
  // recalculate total
  let t = 0;
  document.querySelectorAll('#line-body tr').forEach(row => {
    const q = parseFloat(row.querySelector('.line-qty')?.value || 0);
    const r = parseFloat(row.querySelector('.line-rate')?.value || 0);
    if (q > 0 && r > 0) t += q * r;
  });
  out.total_amount = t;
  return out;
}

function showToast(msg, color) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.style.background = color || '#FFE500';
  t.style.color = color ? '#fff' : '#000';
  t.style.display = 'block';
  setTimeout(() => t.style.display = 'none', 3500);
}

function showDeny() {
  document.getElementById('deny-section').style.display = 'block';
  document.getElementById('deny-section').scrollIntoView({ behavior: 'smooth' });
  document.getElementById('btn-approve').disabled = true;
  document.getElementById('btn-deny').disabled = true;
}

async function doApprove() {
  const btn = document.getElementById('btn-approve');
  btn.disabled = true;
  btn.textContent = 'APPROVING...';
  try {
    const resp = await fetch('/api/approve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token: TOKEN,
        action: 'approve',
        withhold_pct: document.getElementById('withhold-slider').value,
        trucking_email: document.getElementById('trucking-email').value,
        invoice_edits: getEdits()
      })
    });
    const data = await resp.json();
    if (data.ok) {
      showToast('✅ APPROVED — Invoice sent!');
      btn.textContent = '✅ APPROVED';
      document.getElementById('btn-deny').disabled = true;
      setTimeout(() => location.reload(), 2500);
    } else {
      showToast('Error: ' + (data.error || 'Unknown'), '#f44336');
      btn.disabled = false;
      btn.textContent = '✅ APPROVE';
    }
  } catch(e) {
    showToast('Network error', '#f44336');
    btn.disabled = false;
    btn.textContent = '✅ APPROVE';
  }
}

async function confirmDeny() {
  const reason = document.getElementById('deny-reason').value.trim();
  if (!reason) { showToast('Please enter a reason', '#f44336'); return; }
  const btn = event.target;
  btn.disabled = true;
  btn.textContent = 'DENYING...';
  try {
    const resp = await fetch('/api/approve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: TOKEN, action: 'deny', deny_reason: reason })
    });
    const data = await resp.json();
    if (data.ok) {
      showToast('❌ INVOICE DENIED', '#f44336');
      setTimeout(() => location.reload(), 2500);
    } else {
      showToast('Error: ' + (data.error || 'Unknown'), '#f44336');
      btn.disabled = false;
      btn.textContent = 'CONFIRM DENY';
    }
  } catch(e) {
    showToast('Network error', '#f44336');
    btn.disabled = false;
    btn.textContent = 'CONFIRM DENY';
  }
}

// Init
recalc();
</script>
</body>
</html>`;

  res.setHeader('Content-Type', 'text/html');
  return res.status(200).send(html);
}
