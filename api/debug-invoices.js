export default async function handler(req, res) {
  try {
    const SB_URL = 'https://akdgwvhdsisoosrleuqw.supabase.co';
    const SB_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFrZGd3dmhkc2lzb29zcmxldXF3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE0NDM1ODgsImV4cCI6MjA5NzAxOTU4OH0.xNMnvfpVcRWtGGDzRh3DwWyY1VLQJbqdpV_dxP5YoSs';
    const resp = await fetch(SB_URL + '/rest/v1/invoices?select=invoice_number&order=invoice_number.desc', {
      headers: {
        apikey: SB_ANON,
        Authorization: 'Bearer ' + SB_ANON,
        Prefer: 'count=exact'
      }
    });
    const rows = await resp.json();
    const contentRange = resp.headers.get('content-range');
    let maxN = null, minN = null;
    const arr = Array.isArray(rows) ? rows : [];
    arr.forEach(r => {
      const n = parseInt(String(r.invoice_number || '').replace(/[^0-9]/g, ''), 10);
      if (!isNaN(n)) {
        if (maxN === null || n > maxN) maxN = n;
        if (minN === null || n < minN) minN = n;
      }
    });
    res.status(200).json({
      httpStatus: resp.status,
      rowsReturned: arr.length,
      contentRange,
      maxNumeric: maxN,
      minNumeric: minN,
      top10: arr.slice(0, 10),
      bottom10: arr.slice(-10)
    });
  } catch (e) {
    res.status(500).json({ error: e.message, stack: e.stack });
  }
}
