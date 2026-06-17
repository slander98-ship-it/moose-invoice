export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { to, subject, invoiceData } = req.body;
    if (!to) return res.status(400).json({ error: 'Missing recipient' });

    const d = invoiceData || {};
    const invNum = (d.invNum || '').replace('INV-', '');
    const chk = (p) => d.position === p ? '&#9745;' : '&#9744;';
    const fq = (v) => (v > 0 ? v : '');
    const fa = (q, r) => (q > 0 && r > 0 ? '$' + (q * r).toFixed(2) : '');
    const C = 'border:1px solid #000;padding:3px 5px;font-size:9pt;';
    const CH = C + 'background:#eee;font-weight:700;text-align:center;';

    const trips = d.trips || [];
    const tdata = [...trips];
    while (tdata.length < 5) tdata.push({});

    const tripRows = tdata.map((t, i) => {
      const so = (i === 0 && d.start_odometer) ? Number(d.start_odometer).toFixed(1) : '';
      const eo = (i === trips.length - 1 && d.end_odometer) ? Number(d.end_odometer).toFixed(1) : '';
      const mi = (i === trips.length - 1 && d.tripMi) ? Number(d.tripMi).toFixed(1) : '';
      return `<tr>
        <td style="${C}">${t.date||''}</td>
        <td style="${C}">${t.startCity||''}</td>
        <td style="${C}">${t.startTime||''}</td>
        <td style="${C}">${so}</td>
        <td style="${C}">${t.endCity||''}</td>
        <td style="${C}">${t.endTime||''}</td>
        <td style="${C}">${eo}</td>
        <td style="${C}">${mi}</td>
        <td style="${C}">${t.motel||''}</td>
      </tr>`;
    }).join('');

    const invoiceHTML = `<!DOCTYPE html>
<html><head><meta charset="UTF-8">
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family:Arial,sans-serif; font-size:9pt; color:#000; padding:20px; background:#fff; }
  table { border-collapse:collapse; width:100%; }
  .hdr { font-size:22pt; font-weight:900; }
  .sub { font-size:9pt; }
  .inv-num { font-size:26pt; font-weight:900; }
  .section { margin-bottom:6px; }
  .row { display:flex; gap:8px; margin-bottom:3px; }
  .lbl { font-weight:700; white-space:nowrap; min-width:110px; }
  .val { border-bottom:1px solid #000; flex:1; padding:1px 4px; }
  .charges-left { width:55%; vertical-align:top; padding-right:10px; }
  .charges-right { vertical-align:top; }
  .crow { display:flex; justify-content:space-between; padding:2px 0; border-bottom:1px solid #ddd; font-size:9pt; }
  .total-line { border-top:2px solid #000; margin-top:6px; padding-top:4px; text-align:right; font-size:13pt; font-weight:900; }
  .terms { font-size:7.5pt; text-align:center; margin-top:8px; }
  .thankyou { text-align:center; font-style:italic; font-weight:700; font-size:11pt; margin-top:6px; }
</style>
</head><body>

<table style="margin-bottom:10px;">
  <tr>
    <td style="text-align:center; vertical-align:middle;">
      <div class="hdr">Moose's Pilot Car Service, LLC</div>
      <div class="sub">525 N Peniel — Oklahoma City, OK 73127 — 405-255-5484</div>
      <div class="sub">mooseou@yahoo.com</div>
    </td>
    <td style="text-align:right; vertical-align:top; width:120px;">
      <div style="font-size:9pt; font-weight:700;">Invoice #</div>
      <div class="inv-num">${invNum}</div>
    </td>
  </tr>
</table>

<div style="font-size:9pt; margin-bottom:6px;">
  <b>Pilot Position:</b>&nbsp; ${chk('Lead')} Lead &nbsp; ${chk('Chase')} Chase &nbsp; ${chk('High Pole')} High Pole &nbsp; ${chk('Steer Man')} Steer Man
  &nbsp;&nbsp;&nbsp;&nbsp; <b>DATE:</b> ${d.date||''}
</div>

<table style="margin-bottom:5px;">
  <tr>
    <td style="font-weight:700;white-space:nowrap;padding-right:4px;padding-bottom:3px;">TRUCKING CO:</td>
    <td style="border-bottom:1px solid #000;padding:1px 4px;width:42%;">${d.trucking_co||''}</td>
    <td style="font-weight:700;padding-left:10px;padding-right:4px;">PHONE:</td>
    <td style="border-bottom:1px solid #000;padding:1px 4px;">${d.trucking_co_phone||''}</td>
  </tr>
  <tr>
    <td style="font-weight:700;white-space:nowrap;padding-right:4px;padding-bottom:3px;">BILLING ADDRESS:</td>
    <td style="border-bottom:1px solid #000;padding:1px 4px;">${d.billing_address||''}</td>
    <td style="font-weight:700;padding-left:10px;padding-right:4px;">CONTACT:</td>
    <td style="border-bottom:1px solid #000;padding:1px 4px;">${d.contact_name||''}</td>
  </tr>
  <tr>
    <td style="font-weight:700;white-space:nowrap;padding-right:4px;padding-bottom:3px;">DRIVER:</td>
    <td style="border-bottom:1px solid #000;padding:1px 4px;">${d.driver_name||''}</td>
    <td style="font-weight:700;padding-left:10px;padding-right:4px;">TRUCK #:</td>
    <td style="border-bottom:1px solid #000;padding:1px 4px;">${d.driver_truck||''}</td>
  </tr>
  <tr>
    <td style="font-weight:700;white-space:nowrap;padding-right:4px;padding-bottom:3px;">LOAD:</td>
    <td style="border-bottom:1px solid #000;padding:1px 4px;">${d.load_type||''}</td>
    <td style="font-weight:700;padding-left:10px;padding-right:4px;">H/W/L:</td>
    <td style="border-bottom:1px solid #000;padding:1px 4px;">${d.load_height||''}/${d.load_width||''}/${d.load_length||''}</td>
  </tr>
  <tr>
    <td style="font-weight:700;white-space:nowrap;padding-right:4px;padding-bottom:3px;">PICK UP:</td>
    <td colspan="3" style="border-bottom:1px solid #000;padding:1px 4px;">${d.pickup_location||''} ${d.pickup_city||''}, ${d.pickup_state||''} &nbsp; DATE: ${d.pickup_date||''}</td>
  </tr>
  <tr>
    <td style="font-weight:700;white-space:nowrap;padding-right:4px;">DROP OFF:</td>
    <td colspan="3" style="border-bottom:1px solid #000;padding:1px 4px;">${d.dropoff_location||''} ${d.dropoff_city||''}, ${d.dropoff_state||''} &nbsp; DATE: ${d.dropoff_date||''}</td>
  </tr>
</table>

<table style="margin-bottom:8px;">
  <thead>
    <tr>
      <th style="${CH}">DATE</th>
      <th style="${CH}">START CITY,ST</th>
      <th style="${CH}">START</th>
      <th style="${CH}">START ODO</th>
      <th style="${CH}">END CITY,ST</th>
      <th style="${CH}">END</th>
      <th style="${CH}">END ODO</th>
      <th style="${CH}">MILES</th>
      <th style="${CH}">MOTEL</th>
    </tr>
  </thead>
  <tbody>${tripRows}</tbody>
</table>

<table style="margin-bottom:8px;">
  <tr>
    <td class="charges-left">
      <div class="crow"><b>TOTAL ESCORTED MILES</b><span>${fq(d.escorted_miles)} ${d.escorted_rate > 0 ? '@ $'+Number(d.escorted_rate).toFixed(2) : ''}</span></div>
      <div class="crow"><b>FUEL S/C — MILES ONLY</b><span>${fq(d.fuel_sc_miles)} ${d.fuel_sc_rate > 0 ? '@ $'+Number(d.fuel_sc_rate).toFixed(2) : ''}</span></div>
      <div class="crow"><b>DEADHEAD MILES</b><span>${fq(d.deadhead_miles)} ${d.deadhead_rate > 0 ? '@ $'+Number(d.deadhead_rate).toFixed(2) : ''}</span></div>
      <div class="crow"><b>FLAT DAY RATE</b><span>${fq(d.flat_day_qty)} ${d.flat_day_rate > 0 ? '@ $'+Number(d.flat_day_rate).toFixed(2) : ''}</span></div>
      <div class="crow"><b>MOTELS</b><span>${fq(d.motel_qty)} ${d.motel_rate > 0 ? '@ $'+Number(d.motel_rate).toFixed(2) : ''}</span></div>
      <div class="crow"><b>DOWN TIME</b><span>${fq(d.downtime_hours)} ${d.downtime_rate > 0 ? '@ $'+Number(d.downtime_rate).toFixed(2) : ''}</span></div>
      <div class="crow"><b>NO-GO'S</b><span>${fq(d.nogo_qty)} ${d.nogo_rate > 0 ? '@ $'+Number(d.nogo_rate).toFixed(2) : ''}</span></div>
    </td>
    <td class="charges-right">
      <div class="crow"><span>PER MILE =</span><b>${fa(d.escorted_miles, d.escorted_rate)}</b></div>
      <div class="crow"><span>MILES ONLY =</span><b>${fa(d.fuel_sc_miles, d.fuel_sc_rate)}</b></div>
      <div class="crow"><span>PER MILE =</span><b>${fa(d.deadhead_miles, d.deadhead_rate)}</b></div>
      <div class="crow"><span>PER DAY =</span><b>${fa(d.flat_day_qty, d.flat_day_rate)}</b></div>
      <div class="crow"><span>PER DAY =</span><b>${fa(d.motel_qty, d.motel_rate)}</b></div>
      <div class="crow"><span>PER HOUR =</span><b>${fa(d.downtime_hours, d.downtime_rate)}</b></div>
      <div class="crow"><span>PER DAY =</span><b>${fa(d.nogo_qty, d.nogo_rate)}</b></div>
      <div class="total-line">TOTAL CHARGES = $${Number(d.total || 0).toFixed(2)}</div>
    </td>
  </tr>
</table>

<div style="font-size:9pt; margin-top:6px;">
  <b>DRIVER'S SIGNATURE:</b> ______________________________ &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; <b>DATE:</b> ${d.date||''}
</div>
<div style="font-size:9pt; margin-top:4px;">
  <b>Escort Subcontracting for Moose's Pilot Service:</b> ${d.escort_sub||'___________________________'} &nbsp; DBA _______________
</div>
<div class="terms">
  TERMS: DUE UPON RECEIPT — After 45 days a 9% LATE FEE will be added to your BILL.<br>
  All collections cost/Attorney's fees incurred to collect Debit is the Responsibility of the Trucking Company.
</div>
<div class="thankyou">Thank You for Your Business!!!</div>

</body></html>`;

    // Convert HTML to PDF via html2pdf.app (free, no API key needed)
    let pdfBuffer = null;
    try {
      const pdfResp = await fetch('https://api.html2pdf.app/v1/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          html: invoiceHTML,
          apiKey: 'guest',
          format: 'Letter',
          landscape: false,
          marginTop: 10,
          marginBottom: 10,
          marginLeft: 10,
          marginRight: 10
        })
      });
      if (pdfResp.ok) {
        const buf = await pdfResp.arrayBuffer();
        pdfBuffer = Buffer.from(buf).toString('base64');
      }
    } catch (pdfErr) {
      console.warn('PDF generation failed, sending HTML only:', pdfErr.message);
    }

    const emailPayload = {
      from: 'Moose Pilot <invoices@moosepilotokc.com>',
      to: [to],
      subject: subject || `Invoice #${invNum} — Moose's Pilot Car Service`,
      html: invoiceHTML
    };

    if (pdfBuffer) {
      emailPayload.attachments = [{
        filename: `Invoice-${invNum}-MoosePilot.pdf`,
        content: pdfBuffer
      }];
    }

    const resp = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer re_8MCmYaxY_5ZAb9nVLDyPKyoAo9r7f515D',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(emailPayload)
    });

    const result = await resp.json();
    if (!resp.ok) return res.status(resp.status).json(result);
    return res.status(200).json({ ...result, hasPdf: !!pdfBuffer });

  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
