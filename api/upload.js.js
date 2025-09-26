// Proxy nhận binary rồi PUT sang kho ngoài (transfer.sh) để lấy URL public.
// Không multipart, không token. Không lưu trên Vercel.

const BYTES_4_3MB = 4.3 * 1024 * 1024; // ~4.3MB guard

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end('Method Not Allowed');

  try {
    // Tên file từ query + sanitize nhẹ
    const rawName = (req.query?.name || 'file.bin').toString();
    const safeName =
      rawName.replace(/[^\w.\- ]+/g, '_').slice(0, 180) || 'file.bin';

    // Đọc body (phù hợp 1–2 MB)
    const chunks = [];
    let size = 0;
    await new Promise((resolve, reject) => {
      req.on('data', (c) => {
        chunks.push(c);
        size += c.length;
        if (size > BYTES_4_3MB) reject(new Error('Payload too large'));
      });
      req.on('end', resolve);
      req.on('error', reject);
    });

    const buf = Buffer.concat(chunks);
    const contentType =
      req.headers['content-type'] || 'application/octet-stream';

    // Endpoint đích (default: transfer.sh). Có thể override qua env nếu muốn.
    const base = process.env.UPSTREAM_PUT_BASE || 'https://transfer.sh';
    const target = `${base}/${encodeURIComponent(safeName)}`;

    // Chuyển tiếp: PUT raw body
    const upstream = await fetch(target, {
      method: 'PUT',
      body: buf,
      headers: { 'Content-Type': contentType },
    });

    const text = await upstream.text();
    if (!upstream.ok) {
      throw new Error(
        `Upstream error ${upstream.status}: ${text.slice(0, 200)}`
      );
    }

    // transfer.sh trả về URL dạng text/plain
    const url = text.trim();

    res.setHeader('Cache-Control', 'no-store');
    res.status(200).json({ url, size });
  } catch (err) {
    const msg = err?.message || 'Upload failed';
    const status = msg.includes('Payload too large') ? 413 : 500;
    res.status(status).json({ error: msg });
  }
}
