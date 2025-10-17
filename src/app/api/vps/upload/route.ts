import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const path = (formData.get('path') as string | null) || 'uploads';
    // userId optional; path may already include it

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const directory = path.split('/').slice(0, -1).join('/');
    const originalFilename = path.split('/').pop() || '';

    // Sanitize filename to avoid spaces and special characters causing 404/invalid image
    // Keep dots for extensions; replace other non-word chars with '-'
    const safeFilename = originalFilename
      .normalize('NFKD')
      .replace(/[^\w.-]+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^[-.]+|[-.]+$/g, '') // Remove leading/trailing dashes and dots
      .replace(/-\./g, '.') // Remove dash before extension
      .replace(/\.-/g, '.'); // Remove dash after extension

    const maxSize = Number(process.env.VPS_MAX_FILE_SIZE || 50 * 1024 * 1024);
    if (file.size > maxSize) {
      return NextResponse.json({ error: 'File too large' }, { status: 400 });
    }

    // Save directly to public/uploads (Next.js serves /public/ as /)
    // Remove 'uploads' from directory if it's already included
    const cleanDirectory = directory.startsWith('uploads/') ? directory.replace('uploads/', '') : directory;
    const uploadDir = join(process.cwd(), 'public', 'files', 'uploads', cleanDirectory);

    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true });
    }

    const filePath = join(uploadDir, safeFilename);
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(filePath, buffer);

    // Public URL (use /files/uploads) + cache-busting param so it appears immediately
    const basePublicPath = `/files/uploads/${cleanDirectory}/${encodeURIComponent(safeFilename)}`;
    const fileUrl = `${basePublicPath}?v=${Date.now()}`;

    return NextResponse.json({
      success: true,
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      filename: safeFilename,
      url: fileUrl,
      size: file.size,
      mimeType: file.type
    });
  } catch (error) {
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }
}


