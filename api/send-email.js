export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { to, subject, invoiceData, pdfBase64, filename } = req.body;
    if (!to) return res.status(400).json({ error: 'Missing recipient' });

    let html = '<p>Invoice from Mooses Pilot Car Service</p>';

    if (invoiceData) {
      const d = invoiceData;
      const invNum = (d.invNum || '').replace('INV-', '');
      const chk = (p) => d.position === p ? '[X]' : '[ ]';
      const fq = (v) => v > 0 ? v : '';
      const fa = (q, r) => q > 0 && r > 0 ? '$' + (q * r).toFixed(2) : '';
      const C = 'border:1px solid #000;padding:2px 4px;font-size:9px;';
      const CH = C + 'background:#f0f0f0;font-weight:700;text-align:center;';

      const trips = d.trips || [];
      const tdata = [...trips];
      while (tdata.length < 5) tdata.push({});

      const tripRows = tdata.map((t, i) => {
        const so = (i === 0 && d.start_odometer) ? Number(d.start_odometer).toFixed(1) : '';
        const eo = (i === trips.length - 1 && d.end_odometer) ? Number(d.end_odometer).toFixed(1) : '';
        const mi = (i === trips.length - 1 && d.tripMi) ? Number(d.tripMi).toFixed(1) : '';
        return `<tr><td style="${C}">${t.date||''}</td><td style="${C}">${t.startCity||''}</td><td style="${C}">${t.startTime||''}</td><td style="${C}">${so}</td><td style="${C}">${t.endCity||''}</td><td style="${C}">${t.endTime||''}</td><td style="${C}">${eo}</td><td style="${C}">${mi}</td><td style="${C}">${t.motel||''}</td></tr>`;
      }).join('');

      html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>
*{margin:0;padding:0;box-sizing:border-box;}
body{font-family:Arial,sans-serif;font-size:9px;color:#000;padding:12px;background:#fff;}
table{border-collapse:collapse;width:100%;}
</style></head><body>
<table style="margin-bottom:8px;"><tr>
<td style="text-align:center;vertical-align:middle;">
<div style="font-size:20px;font-weight:700;">Moose's Pilot Car Service, LLC</div>
<div style="font-size:9px;">525 N Peniel — Oklahoma City, OK 73127 — 405-255-5484</div>
</td>
<td style="text-align:right;vertical-align:top;width:100px;">
<div style="font-size:9px;font-weight:700;">Invoice #</div>
<div style="font-size:22px;font-weight:900;">${invNum}</div>
</td>
</tr></table>
<div style="font-size:9px;margin-bottom:4px;">
<b>Pilot Position:</b> ${chk('Lead')} Lead &nbsp;${chk('Chase')} Chase &nbsp;${chk('High Pole')} High Pole &nbsp;${chk('Steer Man')} Steer Man
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<b>DATE:</b> ${d.date||''}
</div>
<table style="margin-bottom:3px;">
<tr><td style="font-weight:700;white-space:nowrap;padding-right:4px;">TRUCKING CO:</td><td style="border-bottom:1px solid #000;padding:1px 4px;width:40%;">${d.trucking_co||''}</td><td style="font-weight:700;padding-left:8px;padding-right:4px;">PHONE:</td><td style="border-bottom:1px solid #000;padding:1px 4px;">${d.trucking_co_phone||''}</td></tr>
<tr><td style="font-weight:700;white-space:nowrap;padding-right:4px;">BILLING ADDRESS:</td><td style="border-bottom:1px solid #000;padding:1px 4px;">${d.billing_address||''}</td><td style="font-weight:700;padding-left:8px;padding-right:4px;">CONTACT:</td><td style="border-bottom:1px solid #000;padding:1px 4px;">${d.contact_name||''}</td></tr>
<tr><td style="font-weight:700;white-space:nowrap;padding-right:4px;">DRIVER:</td><td style="border-bottom:1px solid #000;padding:1px 4px;">${d.driver_name||''}</td><td style="font-weight:700;padding-left:8px;padding-right:4px;">TRUCK#:</td><td style="border-bottom:1px solid #000;padding:1px 4px;">${d.driver_truck||''}</td></tr>
<tr><td style="font-weight:700;white-space:nowrap;padding-right:4px;">LOAD:</td><td style="border-bottom:1px solid #000;padding:1px 4px;">${d.load_type||''}</td><td style="font-weight:700;padding-left:8px;padding-right:4px;">H/W/L:</td><td style="border-bottom:1px solid #000;padding:1px 4px;">${d.load_height||''}/${d.load_width||''}/${d.load_length||''}</td></tr>
<tr><td style="font-weight:700;white-space:nowrap;padding-right:4px;">PICK UP:</td><td colspan="3" style="border-bottom:1px solid #000;padding:1px 4px;">${d.pickup_location||''} ${d.pickup_city||''}, ${d.pickup_state||''} &nbsp; DATE: ${d.pickup_date||''}</td></tr>
<tr><td style="font-weight:700;white-space:nowrap;padding-right:4px;">DROP OFF:</td><td colspan="3" style="border-bottom:1px solid #000;padding:1px 4px;">${d.dropoff_location||''} ${d.dropoff_city||''}, ${d.dropoff_state||''} &nbsp; DATE: ${d.dropoff_date||''}</td></tr>
</table>
<table style="margin-bottom:4px;">
<tr><th style="${CH}">DATE</th><th style="${CH}">START CITY,ST</th><th style="${CH}">START</th><th style="${CH}">START ODO</th><th style="${CH}">END CITY,ST</th><th style="${CH}">END</th><th style="${CH}">END ODO</th><th style="${CH}">MILES</th><th style="${CH}">MOTEL</th></tr>
${tripRows}
</table>
<table style="margin-bottom:6px;"><tr>
<td style="width:55%;vertical-align:top;padding-right:8px;font-size:9px;">
<div style="display:flex;justify-content:space-between;padding:2px 0;"><b>TOTAL ESCORTED MILES</b><span>${fq(d.escorted_miles)} @ ${d.escorted_rate > 0 ? d.escorted_rate.toFixed(2) : ''}</span></div>
<div style="display:flex;justify-content:space-between;padding:2px 0;border-top:1px solid #ccc;"><b>FUEL S/C - MILES</b><span>${fq(d.fuel_sc_miles)} @ ${d.fuel_sc_rate > 0 ? d.fuel_sc_rate.toFixed(2) : ''}</span></div>
<div style="display:flex;justify-content:space-between;padding:2px 0;border-top:1px solid #ccc;"><b>DEADHEAD MILES</b><span>${fq(d.deadhead_miles)} @ ${d.deadhead_rate > 0 ? d.deadhead_rate.toFixed(2) : ''}</span></div>
<div style="display:flex;justify-content:space-between;padding:2px 0;border-top:1px solid #ccc;"><b>FLAT DAY RATE</b><span>${fq(d.flat_day_qty)} @ ${d.flat_day_rate > 0 ? d.flat_day_rate.toFixed(2) : ''}</span></div>
<div style="display:flex;justify-content:space-between;padding:2px 0;border-top:1px solid #ccc;"><b>MOTELS</b><span>${fq(d.motel_qty)} @ ${d.motel_rate > 0 ? d.motel_rate.toFixed(2) : ''}</span></div>
<div style="display:flex;justify-content:space-between;padding:2px 0;border-top:1px solid #ccc;"><b>DOWN TIME</b><span>${fq(d.downtime_hours)} @ ${d.downtime_rate > 0 ? d.downtime_rate.toFixed(2) : ''}</span></div>
<div style="display:flex;justify-content:space-between;padding:2px 0;border-top:1px solid #ccc;"><b>NO-GO'S</b><span>${fq(d.nogo_qty)} @ ${d.nogo_rate > 0 ? d.nogo_rate.toFixed(2) : ''}</span></div>
</td>
<td style="vertical-align:top;font-size:9px;">
<div style="display:flex;justify-content:space-between;padding:2px 0;"><span>PER MILE =</span><b>${fa(d.escorted_miles, d.escorted_rate)}</b></div>
<div style="display:flex;justify-content:space-between;padding:2px 0;border-top:1px solid #ccc;"><span>MILES ONLY =</span><b>${fa(d.fuel_sc_miles, d.fuel_sc_rate)}</b></div>
<div style="display:flex;justify-content:space-between;padding:2px 0;border-top:1px solid #ccc;"><span>PER MILE =</span><b>${fa(d.deadhead_miles, d.deadhead_rate)}</b></div>
<div style="display:flex;justify-content:space-between;padding:2px 0;border-top:1px solid #ccc;"><span>PER DAY =</span><b>${fa(d.flat_day_qty, d.flat_day_rate)}</b></div>
<div style="display:flex;justify-content:space-between;padding:2px 0;border-top:1px solid #ccc;"><span>PER DAY =</span><b>${fa(d.motel_qty, d.motel_rate)}</b></div>
<div style="display:flex;justify-content:space-between;padding:2px 0;border-top:1px solid #ccc;"><span>PER HOUR =</span><b>${fa(d.downtime_hours, d.downtime_rate)}</b></div>
<div style="display:flex;justify-content:space-between;padding:2px 0;border-top:1px solid #ccc;"><span>PER DAY =</span><b>${fa(d.nogo_qty, d.nogo_rate)}</b></div>
<div style="border-top:2px solid #000;margin-top:4px;padding-top:3px;text-align:right;font-size:11px;font-weight:700;">TOTAL CHARGES = $${Number(d.total || 0).toFixed(2)}</div>
</td></tr></table>
<div style="font-size:9px;margin-top:6px;"><b>DRIVER'S SIGNATURE:</b> ______________________________ &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; <b>DATE:</b> ${d.date||''}</div>
<div style="text-align:center;font-size:8px;margin-top:6px;">TERMS: DUE UPON RECEIPT — After 45 days at 9%/month interest added. All collection costs responsibility of Trucking Company.</div>
<div style="font-size:9px;margin-top:4px;"><b>Escort Subcontracting for Moose's Pilot Service:</b> ${d.escort_sub||'___________________________'} &nbsp; DBA _______________</div>
<div style="text-align:center;font-style:italic;font-weight:700;font-size:10px;margin-top:6px;">Thank You for Your Business!!!</div>
</body></html>`;
    }

    const payload = {
      from: 'Moose Pilot <invoices@moosepilotokc.com>',
      to: [to],
      subject: subject || 'Invoice from Mooses Pilot Car Service',
      html
    };

    if (pdfBase64 && filename) {
      payload.attachments = [{ filename, content: pdfBase64 }];
    }

    const resp = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer re_8MCmYaxY_5ZAb9nVLDyPKyoAo9r7f515D',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const result = await resp.json();
    if (!resp.ok) return res.status(resp.status).json(result);
    return res.status(200).json(result);
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
