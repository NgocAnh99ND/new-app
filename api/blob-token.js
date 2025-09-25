// api/blob-token.js
import { createUploadToken } from '@vercel/blob';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  // Tùy chọn bảo mật/giới hạn
  const { token } = await createUploadToken({
    // 'public' => có URL tải trực tiếp; 'private' => cần lớp truy cập riêng
    // Với nhu cầu chia sẻ link tải, dùng 'public' hoặc 'unauthenticated' (unguessable)
    access: 'public',
    // Chỉ cho một lần upload / giới hạn kích thước, MIME (nếu muốn)
    // maxSize: 1024 * 1024 * 1024, // ví dụ 1GB
  });

  res.status(200).json({ token });
}
