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

    // Free-tier capacity on the newest Flash gets deprioritized under load and
    // 503s ("high demand") for stretches at a time — widely reported on Google's
    // own dev forum, Oct 2026. Each model has SEPARATE capacity, so when 3.8 is
    // slammed we fail over to an older Flash instead of hammering the same
    // overloaded one. Same free key, no extra signup. 15s per model — the
    // client gives up at 45s, so worst case here stays under that.
    const models = ['gemini-3.8-flash', 'gemini-3.5-flash-lite'];
    let resp, data, lastErr = null;
    for (const model of models) {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${process.env.GEMINI_KEY}`;
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 15000);
      try {
        resp = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: geminiBody,
          signal: ctrl.signal
        });
        data = await resp.json();
      } catch (e) {
        clearTimeout(timer);
        lastErr = e.name === 'AbortError'
          ? 'AI took too long to read the permit — try again.'
          : 'Could not reach the AI — check connection and try again.';
        continue; // try the next model
      }
      clearTimeout(timer);
      if (resp.ok) { lastErr = null; break; }
      const isOverloaded = resp.status === 503 || /overloaded|high demand/i.test(data.error?.message || '');
      if (!isOverloaded) {
        return res.status(resp.status).json({ error: data.error?.message || 'Gemini error' });
      }
      lastErr = 'The AI is slammed right now — try again in a minute.';
      // fall through to the next model
    }
    if (lastErr) return res.status(503).json({ error: lastErr });

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    if (!text) return res.status(502).json({ error: 'Gemini returned no text' });
    return res.status(200).json({ text });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
