import PDFDocument from 'pdfkit';

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

    // ── BUILD PDF WITH PDFKIT ──────────────────────────────────────
    const pdfBuffer = await new Promise((resolve, reject) => {
      const doc = new PDFDocument({ size: 'LETTER', margin: 36 });
      const chunks = [];
      doc.on('data', c => chunks.push(c));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const PW = 612 - 72; // usable width (letter minus margins)
      const ML = 36;
      let y = 36;

      const fq = v => (v > 0 ? String(v) : '');
      const fa = (q, r) => (q > 0 && r > 0 ? '$' + (q * r).toFixed(2) : '');
      const chk = p => d.position === p ? '[X]' : '[ ]';

      // ── HEADER ──
      doc.font('Helvetica-Bold').fontSize(18)
        .text("Moose's Pilot Car Service, LLC", ML, y, { width: PW, align: 'center' });
      y += 22;
      doc.font('Helvetica').fontSize(8)
        .text('525 N Peniel — Oklahoma City, OK 73127 — 405-255-5484', ML, y, { width: PW, align: 'center' });
      y += 12;
      doc.text('mooseou@yahoo.com', ML, y, { width: PW, align: 'center' });
      y += 6;

      // Invoice # top right
      doc.font('Helvetica-Bold').fontSize(9).text('Invoice #', ML + PW - 80, 36);
      doc.font('Helvetica-Bold').fontSize(22).text(invNum, ML + PW - 90, 46, { width: 90, align: 'right' });

      y += 4;
      doc.moveTo(ML, y).lineTo(ML + PW, y).stroke();
      y += 8;

      // ── PILOT POSITION ──
      doc.font('Helvetica-Bold').fontSize(8).text('Pilot Position:', ML, y);
      doc.font('Helvetica').fontSize(8)
        .text(`${chk('Lead')} Lead   ${chk('Chase')} Chase   ${chk('High Pole')} High Pole   ${chk('Steer Man')} Steer Man`, ML + 70, y);
      doc.font('Helvetica-Bold').text('DATE:', ML + PW - 80, y);
      doc.font('Helvetica').text(d.date || '', ML + PW - 50, y);
      y += 14;

      // ── CUSTOMER INFO ──
      const infoRows = [
        ['TRUCKING CO:', d.trucking_co || '', 'PHONE:', d.trucking_co_phone || ''],
        ['BILLING ADDRESS:', d.billing_address || '', 'CONTACT:', d.contact_name || ''],
        ['DRIVER:', d.driver_name || '', 'TRUCK #:', d.driver_truck || ''],
        ['LOAD:', d.load_type || '', 'H/W/L:', `${d.load_height||''}/${d.load_width||''}/${d.load_length||''}`],
      ];
      for (const [l1, v1, l2, v2] of infoRows) {
        doc.font('Helvetica-Bold').fontSize(8).text(l1, ML, y);
        doc.font('Helvetica').fontSize(8).text(v1, ML + 90, y, { width: 170 });
        doc.font('Helvetica-Bold').text(l2, ML + 280, y);
        doc.font('Helvetica').text(v2, ML + 330, y, { width: PW - 330 });
        doc.moveTo(ML + 90, y + 9).lineTo(ML + 258, y + 9).stroke();
        doc.moveTo(ML + 330, y + 9).lineTo(ML + PW, y + 9).stroke();
        y += 14;
      }

      // Pickup / Dropoff
      doc.font('Helvetica-Bold').fontSize(8).text('PICK UP:', ML, y);
      doc.font('Helvetica').fontSize(8)
        .text(`${d.pickup_location || ''} ${d.pickup_city || ''}, ${d.pickup_state || ''}`, ML + 55, y, { width: 240 });
      doc.font('Helvetica-Bold').text('DATE:', ML + PW - 80, y);
      doc.font('Helvetica').text(d.pickup_date || '', ML + PW - 50, y);
      doc.moveTo(ML + 55, y + 9).lineTo(ML + 293, y + 9).stroke();
      y += 14;

      doc.font('Helvetica-Bold').fontSize(8).text('DROP OFF:', ML, y);
      doc.font('Helvetica').fontSize(8)
        .text(`${d.dropoff_location || ''} ${d.dropoff_city || ''}, ${d.dropoff_state || ''}`, ML + 55, y, { width: 240 });
      doc.font('Helvetica-Bold').text('DATE:', ML + PW - 80, y);
      doc.font('Helvetica').text(d.dropoff_date || '', ML + PW - 50, y);
      doc.moveTo(ML + 55, y + 9).lineTo(ML + 293, y + 9).stroke();
      y += 16;

      // ── TRIP LOG TABLE ──
      const TCW = [42, 90, 40, 62, 90, 40, 62, 38, 38]; // col widths, total=502
      const TCH = ['DATE', 'START CITY,ST', 'START', 'START ODO', 'END CITY,ST', 'END', 'END ODO', 'MILES', 'MOTEL'];
      const ROW_H = 14;

      // Header row
      doc.rect(ML, y, PW, ROW_H).fillAndStroke('#eeeeee', '#000000');
      doc.fillColor('#000');
      let tx = ML;
      doc.font('Helvetica-Bold').fontSize(6.5);
      for (let i = 0; i < TCH.length; i++) {
        doc.text(TCH[i], tx + 2, y + 3, { width: TCW[i] - 4, align: 'center' });
        if (i < TCH.length - 1) doc.moveTo(tx + TCW[i], y).lineTo(tx + TCW[i], y + ROW_H).stroke();
        tx += TCW[i];
      }
      doc.rect(ML, y, PW, ROW_H).stroke();
      y += ROW_H;

      // Data rows (5 minimum)
      const trips = d.trips || [];
      const tdata = [...trips];
      while (tdata.length < 5) tdata.push({});
      doc.font('Helvetica').fontSize(7);
      tdata.forEach((t, i) => {
        const so = (i === 0 && d.start_odometer) ? Number(d.start_odometer).toFixed(1) : '';
        const eo = (i === trips.length - 1 && d.end_odometer) ? Number(d.end_odometer).toFixed(1) : '';
        const mi = (i === trips.length - 1 && d.tripMi) ? Number(d.tripMi).toFixed(1) : '';
        const cells = [t.date||'', t.startCity||'', t.startTime||'', so, t.endCity||'', t.endTime||'', eo, mi, t.motel||''];
        tx = ML;
        cells.forEach((val, j) => {
          doc.rect(tx, y, TCW[j], ROW_H).stroke();
          doc.text(val, tx + 2, y + 3, { width: TCW[j] - 4 });
          tx += TCW[j];
        });
        y += ROW_H;
      });
      y += 8;

      // ── DOWNTIME / NO-GO SECTION (header) ──
      const halfW = PW / 2 - 4;
      doc.font('Helvetica-Bold').fontSize(7).text('DOWN — TIME', ML, y, { width: halfW, align: 'center' });
      doc.text('NO-GO/CANCELS', ML + halfW + 8, y, { width: halfW - 30, align: 'center' });
      doc.font('Helvetica-Bold').fontSize(7).text('Y/N', ML + PW - 24, y);
      y += 10;
      // DT sub-headers
      const dtCW = [44, 44, 44, halfW - 132];
      const dtH = ['DATE', 'START-TIME', 'END-TIME', '<<Reason>>'];
      tx = ML;
      doc.rect(ML, y - 2, PW, 12).stroke();
      doc.font('Helvetica-Bold').fontSize(6.5);
      dtH.forEach((h, i) => { doc.text(h, tx + 2, y, { width: dtCW[i] - 4, align: 'center' }); tx += dtCW[i]; });
      doc.text('DATE', tx + 2, y, { width: 42 }); tx += 46;
      doc.text('<<REASON>>', tx, y, { width: halfW - 50 });
      doc.text('MOTEL', ML + PW - 36, y, { width: 36, align: 'center' });
      y += 14;
      // 2 blank DT rows
      for (let r = 0; r < 2; r++) {
        doc.rect(ML, y - 2, PW, 12).stroke();
        y += 12;
      }
      y += 6;

      // ── CHARGES ──
      const charges = [
        ['TOTAL ESCORTED MILES', d.escorted_miles, d.escorted_rate, 'PER MILE ='],
        ['FUEL S/C — ON MILES ONLY', d.fuel_sc_miles, d.fuel_sc_rate, 'MILES ONLY ='],
        ['DEADHEAD MILES', d.deadhead_miles, d.deadhead_rate, 'PER MILE ='],
        ['FLAT DAY RATE', d.flat_day_qty, d.flat_day_rate, 'PER DAY ='],
        ['½ DAY RATE', d.half_day_qty, d.half_day_rate, '½ DAY ='],
        ['MOTELS', d.motel_qty, d.motel_rate, 'PER DAY ='],
        ['DOWN TIME', d.downtime_hours, d.downtime_rate, 'PER HOUR ='],
        ["NO-GO'S", d.nogo_qty, d.nogo_rate, 'PER DAY ='],
      ];
      const LW = PW / 2 - 10;
      doc.font('Helvetica').fontSize(8);
      charges.forEach(([lbl, q, r, rlbl]) => {
        doc.font('Helvetica-Bold').text(lbl, ML, y, { width: 130 });
        // qty line
        doc.moveTo(ML + 133, y + 8).lineTo(ML + 170, y + 8).stroke();
        if (q > 0) doc.font('Helvetica').text(String(q), ML + 133, y, { width: 37, align: 'right' });
        doc.font('Helvetica').text('@', ML + 173, y);
        doc.moveTo(ML + 180, y + 8).lineTo(ML + 220, y + 8).stroke();
        if (r > 0) doc.text(r.toFixed(2), ML + 180, y, { width: 40, align: 'right' });
        // right side
        doc.font('Helvetica-Bold').text(rlbl, ML + LW + 10, y, { width: 70 });
        doc.moveTo(ML + LW + 85, y + 8).lineTo(ML + PW, y + 8).stroke();
        const amt = fa(q, r);
        if (amt) doc.font('Helvetica').text(amt, ML + LW + 85, y, { width: PW - LW - 85, align: 'right' });
        y += 14;
      });

      // TOTAL
      y += 4;
      doc.moveTo(ML + LW + 85, y).lineTo(ML + PW, y).stroke();
      y += 4;
      doc.font('Helvetica-Bold').fontSize(11)
        .text('TOTAL CHARGES = $' + Number(d.total || 0).toFixed(2), ML + LW, y + 2, { width: PW - LW, align: 'right' });
      y += 20;

      // ── SIGNATURE ──
      doc.moveTo(ML, y + 6).lineTo(ML + 200, y + 6).stroke();
      doc.font('Helvetica-Bold').fontSize(8).text("DRIVER'S SIGNATURE:", ML, y + 10);
      doc.font('Helvetica-Bold').text('DATE:', ML + PW - 80, y + 10);
      doc.font('Helvetica').text(d.date || '', ML + PW - 52, y + 10);
      y += 24;

      // Terms
      doc.font('Helvetica').fontSize(7)
        .text('TERMS: DUE UPON RECEIPT', ML, y, { width: PW, align: 'center' });
      y += 9;
      doc.fontSize(6.5)
        .text("After 45 days a 9% LATE FEE will be added to your BILL. All collections cost/Attorney's fees incurred to collect Debit is the Responsibility of the Trucking Company.", ML, y, { width: PW, align: 'center' });
      y += 12;

      doc.font('Helvetica-Bold').fontSize(8)
        .text('Escort Subcontracting for Moose\'s Pilot Service:', ML, y);
      doc.font('Helvetica').text(d.escort_sub || '___________________________', ML + 230, y);
      doc.font('Helvetica-Bold').text('DBA', ML + PW - 80, y);
      y += 14;

      doc.font('Helvetica-BoldOblique').fontSize(10)
        .text('Thank You for Your Business!!!', ML, y, { width: PW, align: 'center' });

      doc.end();
    });

    // ── EMAIL HTML (inline summary) ──
    const emailHTML = `<!DOCTYPE html><html><body style="font-family:Arial,sans-serif;font-size:11px;color:#000;padding:16px;">
<h2 style="margin-bottom:4px;">Moose's Pilot Car Service, LLC</h2>
<p style="margin:0;font-size:10px;">525 N Peniel — OKC, OK 73127 — 405-255-5484</p>
<p style="margin:4px 0 12px;"><b>Invoice #${invNum}</b> &nbsp;|&nbsp; ${d.date||''} &nbsp;|&nbsp; ${d.position||''}</p>
<p><b>Driver:</b> ${d.driver_name||''} &nbsp; <b>Trucking Co:</b> ${d.trucking_co||''}</p>
<p><b>Load:</b> ${d.load_type||''} &nbsp; <b>Total:</b> $${Number(d.total||0).toFixed(2)}</p>
<p style="margin-top:12px;font-size:10px;color:#555;">PDF invoice attached.</p>
</body></html>`;

    const emailPayload = {
      from: 'Moose Pilot <invoices@moosepilotokc.com>',
      to: [to],
      subject: subject || `Invoice #${invNum} — Moose's Pilot Car Service`,
      html: emailHTML,
      attachments: [{
        filename: `Invoice-${invNum}-MoosePilot.pdf`,
        content: pdfBuffer.toString('base64')
      }]
    };

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
    return res.status(200).json({ ...result, hasPdf: true });

  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
