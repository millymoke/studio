// VPS storage utilities for bookmarks and saved posts

export async function bookmarkPost(uid: string, uploadId: string): Promise<void> {
  await fetch('/api/vps/bookmark', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ uid, uploadId })
  });
}

export async function unbookmarkPost(uid: string, uploadId: string): Promise<void> {
  await fetch('/api/vps/bookmark', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ uid, uploadId })
  });
}

export async function getBookmarkedPosts(uid: string): Promise<string[]> {
  const res = await fetch(`/api/vps/bookmark?uid=${uid}`);
  const data = await res.json();
  return data.bookmarks || [];
}

export async function savePost(uid: string, uploadId: string): Promise<void> {
  await fetch('/api/vps/saved', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ uid, uploadId })
  });
}

export async function unsavePost(uid: string, uploadId: string): Promise<void> {
  await fetch('/api/vps/saved', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ uid, uploadId })
  });
}

export async function getSavedPosts(uid: string): Promise<string[]> {
  const res = await fetch(`/api/vps/saved?uid=${uid}`);
  const data = await res.json();
  return data.saved || [];
}
