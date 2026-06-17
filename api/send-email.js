export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { to, subject, html, pdfBase64, filename } = req.body;
    if (!to || !subject) return res.status(400).json({ error: 'Missing fields' });

    const payload = {
      from: 'Moose Pilot <invoices@moosepilotokc.com>',
      to: [to],
      subject,
      html: html || '<p>Please find your invoice attached from Moose\'s Pilot Car Service.</p>'
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
