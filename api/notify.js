export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const { invNum, driverName, truckingCoName, total, approvalToken } = req.body || {};
    if (!invNum || !approvalToken) return res.status(400).json({ error: 'Missing required fields' });

    const totalNum = Number(total) || 0;
    const html = '<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#0a0a0a;color:#fff;border-radius:12px;overflow:hidden;"><div style="background:#FFE500;padding:20px 24px;text-align:center;"><div style="font-size:22px;font-weight:900;color:#000;">🚛 MOOSES PILOT SERVICES</div></div><div style="padding:24px;"><table style="width:100%;border-collapse:collapse;margin-bottom:20px;"><tr><td style="padding:8px 12px;background:#1a1a1a;color:#FFE500;font-weight:bold;">Invoice #</td><td style="padding:8px 12px;background:#141414;">' + invNum + '</td></tr><tr><td style="padding:8px 12px;background:#1a1a1a;color:#FFE500;font-weight:bold;">Driver</td><td style="padding:8px 12px;background:#141414;">' + (driverName || '') + '</td></tr><tr><td style="padding:8px 12px;background:#1a1a1a;color:#FFE500;font-weight:bold;">Trucking Co</td><td style="padding:8px 12px;background:#141414;">' + (truckingCoName || '') + '</td></tr><tr><td style="padding:8px 12px;background:#1a1a1a;color:#FFE500;font-weight:bold;">Total</td><td style="padding:8px 12px;background:#141414;font-size:18px;font-weight:900;color:#FFE500;">$' + totalNum.toFixed(2) + '</td></tr></table><a href="https://moosepilotokc.com/?token=' + approvalToken + '#approve" style="display:block;background:#FFE500;color:#000;text-align:center;padding:18px;border-radius:8px;font-size:18px;font-weight:900;text-decoration:none;">TAP TO APPROVE</a></div></div>';

    const resp = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + process.env.RESEND_API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: 'Moose Pilot <invoices@moosepilotokc.com>',
        to: ['Mooseou@yahoo.com'],
        subject: '🚛 New Invoice #' + invNum + ' — ' + (truckingCoName || '') + ' — $' + totalNum.toFixed(2) + ' — TAP TO APPROVE',
        html
      })
    });

    const result = await resp.json();
    if (!resp.ok) return res.status(resp.status).json(result);
    return res.status(200).json(result);
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
