export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { to, subject, html } = req.body;
    if (!to || !subject || !html) return res.status(400).json({ error: 'Missing fields' });

    const resp = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + process.env.RESEND_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: 'Moose Pilot <invoices@moosepilotokc.com>',
        to: [to],
        subject,
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
