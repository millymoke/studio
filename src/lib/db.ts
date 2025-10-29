
'use client';

import { openDB, type DBSchema } from 'idb';

const DB_NAME = 'ShareSpaceDB';
const DB_VERSION = 1;
const STORE_NAME = 'uploads';

interface UploadsDB extends DBSchema {
  [STORE_NAME]: {
    key: string; // Corresponds to upload.id
    value: {
      id: string;
      files: File[];
    };
  };
}

const dbPromise = openDB<UploadsDB>(DB_NAME, DB_VERSION, {
  upgrade(db) {
    if (!db.objectStoreNames.contains(STORE_NAME)) {
      db.createObjectStore(STORE_NAME, { keyPath: 'id' });
    }
  },
});

export async function saveFilesToDb(id: string, files: File[]): Promise<void> {
  const db = await dbPromise;
  await db.put(STORE_NAME, { id, files });
}

export async function getFilesFromDb(id: string): Promise<File[] | undefined> {
    const db = await dbPromise;
    const result = await db.get(STORE_NAME, id);
    return result?.files;
}

export async function deleteFilesFromDb(id: string): Promise<void> {
    const db = await dbPromise;
    await db.delete(STORE_NAME, id);
}
