export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { imageData, mimeType } = req.body;
    if (!imageData) return res.status(400).json({ error: 'No image data' });

    const prompt = 'Extract info from this oversize load permit or trucking document. Return ONLY valid JSON, no markdown, no backticks: {"trucking_co":"","trucking_co_phone":"","billing_address":"","contact_name":"","load_type":"","load_height":"","load_width":"","load_length":"","load_weight":"","pickup_location":"","pickup_city":"","pickup_state":"","pickup_date":"","dropoff_location":"","dropoff_city":"","dropoff_state":"","job_number":""}';

    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent?key=${process.env.GEMINI_KEY}`;
    const geminiBody = JSON.stringify({
      contents: [{
        parts: [
          { text: prompt },
          { inline_data: { mime_type: mimeType || 'image/jpeg', data: imageData } }
        ]
      }],
      generationConfig: {
        maxOutputTokens: 500,
        responseMimeType: 'application/json'
      }
    });

    // Gemini's free tier occasionally returns 503 "model overloaded / high demand"
    // for a moment, especially right after a model version changes. Retry a few
    // times with a short backoff before giving up, so a transient blip doesn't
    // surface as a hard failure to the driver.
    let resp, data;
    const maxAttempts = 3;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      resp = await fetch(geminiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: geminiBody
      });
      data = await resp.json();
      if (resp.ok) break;
      const isOverloaded = resp.status === 503 || /overloaded|high demand/i.test(data.error?.message || '');
      if (!isOverloaded || attempt === maxAttempts) {
        return res.status(resp.status).json({ error: data.error?.message || 'Gemini error' });
      }
      await new Promise(r => setTimeout(r, attempt * 1000)); // 1s, then 2s
    }

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    if (!text) return res.status(502).json({ error: 'Gemini returned no text' });
    return res.status(200).json({ text });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
