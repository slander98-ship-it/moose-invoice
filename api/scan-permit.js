export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { imageData, mimeType } = req.body;
    if (!imageData) return res.status(400).json({ error: 'No image data' });

    const resp = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        max_tokens: 500,
        messages: [{
          role: 'user',
          content: [
            { type: 'image_url', image_url: { url: `data:${mimeType || 'image/jpeg'};base64,${imageData}` } },
            { type: 'text', text: 'Extract info from this oversize load permit or trucking document. Return ONLY valid JSON, no markdown, no backticks: {"trucking_co":"","trucking_co_phone":"","billing_address":"","contact_name":"","load_type":"","load_height":"","load_width":"","load_length":"","load_weight":"","pickup_location":"","pickup_city":"","pickup_state":"","pickup_date":"","dropoff_location":"","dropoff_city":"","dropoff_state":"","job_number":""}' }
          ]
        }]
      })
    });

    const data = await resp.json();
    if (!resp.ok) return res.status(resp.status).json({ error: data.error?.message || 'OpenAI error' });
    const text = data.choices[0].message.content.trim();
    return res.status(200).json({ text });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
