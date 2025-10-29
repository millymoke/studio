import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'public', 'files', 'secure-links');

async function ensureDataDir() {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
  } catch (e) {}
}

export async function POST(req: NextRequest) {
  const { linkId, fileDataUri, fileName } = await req.json();
  if (!linkId || !fileDataUri) return NextResponse.json({ error: 'Missing data' }, { status: 400 });

  await ensureDataDir();
  const filePath = path.join(DATA_DIR, `${linkId}.json`);
  await fs.writeFile(filePath, JSON.stringify({ fileDataUri, fileName, createdAt: Date.now() }));
  
  return NextResponse.json({ success: true });
}

export async function GET(req: NextRequest) {
  const linkId = req.nextUrl.searchParams.get('id');
  if (!linkId) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

  const filePath = path.join(DATA_DIR, `${linkId}.json`);
  
  try {
    const data = await fs.readFile(filePath, 'utf-8');
    await fs.unlink(filePath);
    return NextResponse.json(JSON.parse(data));
  } catch {
    return NextResponse.json({ error: 'Link not found or expired' }, { status: 404 });
  }
}
