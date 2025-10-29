import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'public', 'files', 'data');
const BOOKMARKS_FILE = path.join(DATA_DIR, 'bookmarks.json');

async function ensureDataDir() {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
  } catch (e) {}
}

async function readBookmarks(): Promise<Record<string, string[]>> {
  try {
    const data = await fs.readFile(BOOKMARKS_FILE, 'utf-8');
    return JSON.parse(data);
  } catch {
    return {};
  }
}

async function writeBookmarks(data: Record<string, string[]>) {
  await ensureDataDir();
  await fs.writeFile(BOOKMARKS_FILE, JSON.stringify(data, null, 2));
}

export async function GET(req: NextRequest) {
  const uid = req.nextUrl.searchParams.get('uid');
  if (!uid) return NextResponse.json({ error: 'Missing uid' }, { status: 400 });

  const bookmarks = await readBookmarks();
  return NextResponse.json({ bookmarks: bookmarks[uid] || [] });
}

export async function POST(req: NextRequest) {
  const { uid, uploadId } = await req.json();
  if (!uid || !uploadId) return NextResponse.json({ error: 'Missing data' }, { status: 400 });

  const bookmarks = await readBookmarks();
  if (!bookmarks[uid]) bookmarks[uid] = [];
  if (!bookmarks[uid].includes(uploadId)) {
    bookmarks[uid].push(uploadId);
  }
  await writeBookmarks(bookmarks);
  return NextResponse.json({ success: true });
}

export async function DELETE(req: NextRequest) {
  const { uid, uploadId } = await req.json();
  if (!uid || !uploadId) return NextResponse.json({ error: 'Missing data' }, { status: 400 });

  const bookmarks = await readBookmarks();
  if (bookmarks[uid]) {
    bookmarks[uid] = bookmarks[uid].filter(id => id !== uploadId);
  }
  await writeBookmarks(bookmarks);
  return NextResponse.json({ success: true });
}
