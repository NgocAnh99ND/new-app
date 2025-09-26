import { put } from '@vercel/blob';

const BYTES_4_3MB = 4.3 * 1024 * 1024; // ~4.3MB guard

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end('Method Not Allowed');

  try {
    // Lấy tên file từ query (?name=abc.ext) + sanitize đơn giản
    const rawName = (req.query?.name || 'file.bin').toString();
    const safeName = rawName.replace(/[^\w.\- ]+/g, '_').slice(0, 180) || 'file.bin';

    // Đọc toàn bộ body
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
    const contentType = req.headers['content-type'] || 'application/octet-stream';

    // Upload lên Blob (public)
    const key = `uploads/${Date.now()}-${safeName}`;
    const { url, pathname } = await put(key, buf, {
      access: 'public',
      addRandomSuffix: true,
      contentType
    });

    res.setHeader('Cache-Control', 'no-store');
    res.status(200).json({ url, pathname, size });
  } catch (err) {
    const msg = err?.message || 'Upload failed';
    const status = msg.includes('Payload too large') ? 413 : 500;
    res.status(status).json({ error: msg });
  }
}
