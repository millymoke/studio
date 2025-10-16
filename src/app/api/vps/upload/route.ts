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
    const filename = path.split('/').pop() || '';

    const maxSize = Number(process.env.VPS_MAX_FILE_SIZE || 50 * 1024 * 1024);
    if (file.size > maxSize) {
      return NextResponse.json({ error: 'File too large' }, { status: 400 });
    }

    const uploadDir = join(process.cwd(), 'public', 'files', directory);
    
    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true });
    }

    const filePath = join(uploadDir, filename);
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(filePath, buffer);

    const fileUrl = `/files/${path}`;

    return NextResponse.json({
      success: true,
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      filename,
      url: fileUrl,
      size: file.size,
      mimeType: file.type
    });
  } catch (error) {
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }
}


