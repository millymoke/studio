import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'public', 'files', 'data');
const SAVED_FILE = path.join(DATA_DIR, 'saved.json');

async function ensureDataDir() {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
  } catch (e) {}
}

async function readSaved(): Promise<Record<string, string[]>> {
  try {
    const data = await fs.readFile(SAVED_FILE, 'utf-8');
    return JSON.parse(data);
  } catch {
    return {};
  }
}

async function writeSaved(data: Record<string, string[]>) {
  await ensureDataDir();
  await fs.writeFile(SAVED_FILE, JSON.stringify(data, null, 2));
}

export async function GET(req: NextRequest) {
  const uid = req.nextUrl.searchParams.get('uid');
  if (!uid) return NextResponse.json({ error: 'Missing uid' }, { status: 400 });

  const saved = await readSaved();
  return NextResponse.json({ saved: saved[uid] || [] });
}

export async function POST(req: NextRequest) {
  const { uid, uploadId } = await req.json();
  if (!uid || !uploadId) return NextResponse.json({ error: 'Missing data' }, { status: 400 });

  const saved = await readSaved();
  if (!saved[uid]) saved[uid] = [];
  if (!saved[uid].includes(uploadId)) {
    saved[uid].push(uploadId);
  }
  await writeSaved(saved);
  return NextResponse.json({ success: true });
}

export async function DELETE(req: NextRequest) {
  const { uid, uploadId } = await req.json();
  if (!uid || !uploadId) return NextResponse.json({ error: 'Missing data' }, { status: 400 });

  const saved = await readSaved();
  if (saved[uid]) {
    saved[uid] = saved[uid].filter(id => id !== uploadId);
  }
  await writeSaved(saved);
  return NextResponse.json({ success: true });
}
