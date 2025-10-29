"use client";

import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  limit,
  serverTimestamp,
  DocumentData,
  startAfter,
} from 'firebase/firestore';
import { db } from '@/lib/firebase-config';
import { uploadFileToVPS, deleteFileFromVPS, createVPSUserPath } from '@/lib/vps-storage-utils';
// Optional legacy support for existing Firebase Storage URLs
import { ref, getBlob } from 'firebase/storage';
import { storage } from '@/lib/firebase-config';
import type { Upload, UploadedFile, SerializableFile, CreatePostInput, CreateArticleInput, SearchResult } from '@/lib/types';

const currentTime = Date.now();

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

const getFileType = (file: File | SerializableFile): 'image' | 'video' | 'document' | 'article' => {
  if (file.type.startsWith('image/')) return 'image';
  if (file.type.startsWith('video/')) return 'video';
  if (file.type.startsWith('text/') || file.type === 'application/pdf') return 'document';
  return 'document';
}

const uploadFileToStorage = async (file: File, path: string): Promise<string> => {
  // Ensure the filename portion is URL/FS safe before sending to API
  const parts = path.split('/')
  const fname = parts.pop() || ''
  const directory = parts.join('/')
  const safeName = fname
    .normalize('NFKD')
    .replace(/[^\w.-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^[-.]+|[-.]+$/g, '') // Remove leading/trailing dashes and dots
    .replace(/-\./g, '.') // Remove dash before extension
    .replace(/\.-/g, '.') // Remove dash after extension
  const safePath = directory ? `${directory}/${safeName}` : safeName
  
  const result = await uploadFileToVPS(file, safePath);
  if (!result.success || !result.file) {
    throw new Error(result.error || 'Upload failed');
  }
  return result.file.url;
}

const deleteFileFromStorage = async (path: string): Promise<void> => {
  const res = await deleteFileFromVPS(path);
  if (!res.success) throw new Error(res.error || 'Delete failed');
}

const toFirestoreUploadedFile = (uf: UploadedFile) => {
  const out: any = {
    file: uf.file,
    preview: uf.preview,
    objectPosition: uf.objectPosition || 'center',
  };
  if (typeof uf.altText === 'string' && uf.altText.length > 0) out.altText = uf.altText;
  if (uf.url) out.url = uf.url;
  if (uf.coverPhoto) {
    out.coverPhoto = { file: uf.coverPhoto.file, preview: uf.coverPhoto.preview };
  }
  return out;
};

const sanitizeForFirestore = (obj: any): any => {
  const sanitized: any = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined && value !== null) {
      if (typeof value === 'object' && !Array.isArray(value) && value.constructor === Object) {
        sanitized[key] = sanitizeForFirestore(value);
      } else if (Array.isArray(value)) {
        sanitized[key] = value.map(item =>
          typeof item === 'object' && item !== null ? sanitizeForFirestore(item) : item
        );
      } else {
        sanitized[key] = value;
      }
    }
  }
  return sanitized;
};

const extractStoragePathFromUrl = (url: string): string | null => {
  try {
    const urlObj = new URL(url);
    // VPS pattern: https://domain/uploads/<path>
    const vpsMatch = urlObj.pathname.match(/\/uploads\/(.+)$/);
    if (vpsMatch) {
      return decodeURIComponent(vpsMatch[1]);
    }

    // Legacy VPS pattern: https://domain/files/<path>
    const legacyVpsMatch = urlObj.pathname.match(/\/files\/(.+)$/);
    if (legacyVpsMatch) {
      return decodeURIComponent(legacyVpsMatch[1]);
    }

    // Try multiple patterns to match different Firebase Storage URL formats
    let pathMatch = urlObj.pathname.match(/\/o\/(.+?)\?/);

    if (!pathMatch) {
      // Try pattern for URLs without query parameters
      pathMatch = urlObj.pathname.match(/\/o\/(.+)$/);
    }

    if (!pathMatch) {
      // Try pattern for direct file paths
      pathMatch = urlObj.pathname.match(/\/v0\/b\/[^\/]+\/o\/(.+?)(?:\?|$)/);
    }

    if (!pathMatch) {
      // Try simple pattern for any /o/ path
      pathMatch = urlObj.pathname.match(/\/o\/(.+)/);
    }

    if (pathMatch) {
      const decodedPath = decodeURIComponent(pathMatch[1]);
      return decodedPath;
    }

    // Fallback: try to extract from the full URL string

    const fallbackMatch = url.match(/\/o\/([^?]+)/);
    if (fallbackMatch) {
      const decodedPath = decodeURIComponent(fallbackMatch[1]);

      return decodedPath;
    }
  } catch (error) {
    console.log("🚀 ~ extractStoragePathFromUrl ~ error:", error)
  }

  return null;
};

export const fetchFileContentFromStorage = async (url: string): Promise<string> => {
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error('Failed to fetch file');
    return await response.text();
  } catch (error) {
    console.log("🚀 ~ fetchFileContentFromStorage ~ error:", error)
    throw error;
  }
};

export const fetchFileBlobFromStorage = async (url: string): Promise<Blob> => {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      console.warn(`Failed to fetch file from ${url}: ${response.status} ${response.statusText}`);
      throw new Error(`Failed to fetch file: ${response.status}`);
    }
    return await response.blob();
  } catch (error) {
    console.error('Error fetching file blob:', error);
    throw error;
  }
};

// ============================================================================
// CREATE OPERATIONS
// ============================================================================

export async function createPost(input: CreatePostInput): Promise<Upload> {
  const { uid, title, description = "", tags = [], link = "", displayOption, files } = input;

  const makeUploadedFile = async (file: File, altText?: string, cover?: { file: File; preview: string }): Promise<UploadedFile> => {
    const filePath = `${createVPSUserPath(uid, 'uploads')}/${currentTime}-${file.name}`;
    const url = await uploadFileToStorage(file, filePath);

    let coverPhoto;
    if (cover && cover.file && cover.file instanceof File && cover.file.size > 0) {
      const fileName = cover.file.name || 'cover-photo';
      const coverPath = `${createVPSUserPath(uid, 'covers')}/${currentTime}-${fileName}`;

      const coverUrl = await uploadFileToStorage(cover.file, coverPath);
      coverPhoto = {
        file: { name: cover.file.name, type: cover.file.type, size: cover.file.size },
        preview: coverUrl
      };
    }

    return {
      file: { name: file.name, type: file.type, size: file.size },
      preview: file.type.startsWith("image/") ? url : "",
      altText,
      coverPhoto,
      objectPosition: "center",
      url
    };
  };

  if (displayOption === "individual") {
    const results: Upload[] = [];

    for (const f of files) {
      const uploaded = await makeUploadedFile(f.file as File, f.altText, f.coverPhoto ? { file: f.coverPhoto.file as File, preview: f.coverPhoto.preview } : undefined);
      const postId = `${currentTime}-${f.file.name}`;

      const uploadDoc: Upload = {
        id: postId,
        uid,
        type: getFileType(f.file as File),
        title,
        description,
        tags,
        link,
        displayOption: "individual",
        files: [uploaded],
      };

      // Store in Firestore
      const firestoreData = sanitizeForFirestore({
        ...uploadDoc,
        uid,
        files: uploadDoc.files.map(toFirestoreUploadedFile),
        uploadedAt: serverTimestamp(),
      });

      await setDoc(doc(collection(db, 'uploads'), postId), firestoreData);
      results.push(uploadDoc);
    }

    return results[0]; // Return first post for individual mode
  } else {
    const uploadedFiles = await Promise.all(
      files.map(f => makeUploadedFile(f.file as File, f.altText, f.coverPhoto ? { file: f.coverPhoto.file as File, preview: f.coverPhoto.preview } : undefined))
    );

    const first = files[0]?.file;
    const postId = currentTime.toString();

    const uploadDoc: Upload = {
      id: postId,
      uid,
      type: getFileType(first as File),
      title,
      description,
      tags,
      link,
      displayOption: "carousel",
      files: uploadedFiles,
    };

    // Store in Firestore
    const firestoreData = sanitizeForFirestore({
      ...uploadDoc,
      uid,
      files: uploadDoc.files.map(toFirestoreUploadedFile),
      uploadedAt: serverTimestamp(),
    });

    await setDoc(doc(collection(db, 'uploads'), postId), firestoreData);
    return uploadDoc;
  }
}

export async function createArticle(input: CreateArticleInput): Promise<Upload> {
  const { uid, title, content, tags = [], link = "", coverPhoto, altText } = input;

  const articleId = `${currentTime}-${title.replace(/\s+/g, '-')}`;

  // Create article content as a file and upload to storage
  const articleBlob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const articleFile = new File([articleBlob], `${title.replace(/\s+/g, '-')}.txt`, { type: 'text/plain;charset=utf-8' });

  const filePath = `${createVPSUserPath(uid, 'uploads')}/${currentTime}-${articleFile.name}`;
  const url = await uploadFileToStorage(articleFile, filePath);

  // Handle cover photo upload if provided
  let coverPhotoData;
  if (coverPhoto && coverPhoto.file && coverPhoto.file instanceof File && coverPhoto.file.size > 0) {
    const fileName = coverPhoto.file.name || 'cover-photo';
    const coverPath = `${createVPSUserPath(uid, 'covers')}/${currentTime}-${fileName}`;

    const coverUrl = await uploadFileToStorage(coverPhoto.file, coverPath);

    coverPhotoData = {
      file: {
        name: coverPhoto.file.name,
        type: coverPhoto.file.type,
        size: coverPhoto.file.size,
      },
      preview: coverUrl, // Firebase Storage URL for the cover photo
    };
  }

  const uploadDoc: Upload = {
    id: articleId,
    uid,
    type: 'article',
    title,
    description: content.substring(0, 100),
    tags,
    link,
    displayOption: 'individual',
    files: [{
      file: {
        name: articleFile.name,
        type: articleFile.type,
        size: articleFile.size,
      },
      preview: coverPhotoData?.preview || '', // Use cover photo as preview for articles
      url,
      altText: altText || '',
      objectPosition: 'center',
      coverPhoto: coverPhotoData,
    }],
  };

  // Store in Firestore
  const processedFiles = uploadDoc.files.map(toFirestoreUploadedFile);

  const firestoreData = sanitizeForFirestore({
    ...uploadDoc,
    uid,
    files: processedFiles,
    uploadedAt: serverTimestamp(),
  });

  await setDoc(doc(collection(db, 'uploads'), articleId), firestoreData);
  return uploadDoc;
}

// ============================================================================
// READ OPERATIONS
// ============================================================================

export async function getUserUploads(uid: string, limitCount: number = 25, cursor?: any): Promise<{ uploads: Upload[], lastDoc: any }> {
  let uploadsQuery;

  if (cursor) {
    uploadsQuery = query(
      collection(db, 'uploads'),
      where('uid', '==', uid),
      startAfter(cursor),
      limit(limitCount)
    );
  } else {
    uploadsQuery = query(
      collection(db, 'uploads'),
      where('uid', '==', uid),
      limit(limitCount)
    );
  }

  const snap = await getDocs(uploadsQuery);
  const uploads = snap.docs.map(d => d.data() as Upload);
  const lastDoc = snap.docs[snap.docs.length - 1] || null;

  return { uploads, lastDoc };
}

export async function getAllUploads(limitCount: number = 25): Promise<Upload[]> {
  const uploadsQuery = query(collection(db, 'uploads'), limit(limitCount));
  const snap = await getDocs(uploadsQuery);
  return snap.docs.map(d => d.data() as Upload);
}

export async function getUploadById(uploadId: string): Promise<Upload | null> {
  const docRef = doc(db, 'uploads', uploadId);
  const docSnap = await getDoc(docRef);

  if (docSnap.exists()) {
    return docSnap.data() as Upload;
  }
  return null;
}

// ============================================================================
// UPDATE OPERATIONS
// ============================================================================

export async function updatePost(uploadId: string, updates: Partial<Upload>, uid: string): Promise<void> {
  const uploadRef = doc(db, 'uploads', uploadId);

  // Verify ownership
  const upload = await getUploadById(uploadId);
  if (!upload || upload.uid !== uid) {
    throw new Error("🚀 ~ updatePost ~ unauthorized: You can only update your own posts")
  }

  const updateData: any = {
    ...updates,
    updatedAt: serverTimestamp(),
  };

  // If files are being updated, process them
  if (updates.files) {
    updateData.files = updates.files.map(toFirestoreUploadedFile);
  }

  const sanitizedData = sanitizeForFirestore(updateData);
  await updateDoc(uploadRef, sanitizedData);
}

export async function updateArticle(uploadId: string, updates: Partial<Upload>, uid: string): Promise<void> {
  const uploadRef = doc(db, 'uploads', uploadId);

  // Verify ownership
  const upload = await getUploadById(uploadId);
  if (!upload || upload.uid !== uid) {
    throw new Error("🚀 ~ updateArticle ~ unauthorized: You can only update your own articles")
  }

  const updateData: any = {
    ...updates,
    updatedAt: serverTimestamp(),
  };

  // If files are being updated, process them
  if (updates.files) {
    updateData.files = updates.files.map(toFirestoreUploadedFile);
  }

  const sanitizedData = sanitizeForFirestore(updateData);
  await updateDoc(uploadRef, sanitizedData);
}

// ============================================================================
// DELETE OPERATIONS
// ============================================================================

export async function deleteUpload(uploadId: string, uid: string): Promise<void> {
  const upload = await getUploadById(uploadId);

  if (!upload || upload.uid !== uid) {
    throw new Error("🚀 ~ deleteUpload ~ unauthorized: You can only delete your own uploads")
  }

  // Delete files from storage
  for (const file of upload.files) {
    // Delete main file
    if (file.url) {
      const filePath = extractStoragePathFromUrl(file.url);

      if (filePath) {
        try {
          await deleteFileFromStorage(filePath);
        } catch (error) {
          console.log("🚀 ~ deleteUpload ~ error:", error)
        }
      }
    }

    // Delete cover photo if exists
    if (file.coverPhoto?.preview) {
      const coverPath = extractStoragePathFromUrl(file.coverPhoto.preview);
      if (coverPath) {
        try {
          await deleteFileFromStorage(coverPath);
        } catch (error) {
          console.log("🚀 ~ deleteUpload ~ error:", error)
        }
      }
    }
  }

  // Delete document from Firestore
  await deleteDoc(doc(db, 'uploads', uploadId));
}

// ============================================================================
// SEARCH OPERATIONS
// ============================================================================

export async function searchContent(query: string, limitCount: number = 25): Promise<SearchResult[]> {
  const uploads = await getAllUploads(limitCount);

  const results: SearchResult[] = [];
  const searchTerm = query.toLowerCase();

  // Search all uploads (posts and articles)
  uploads.forEach(upload => {
    const matches =
      (upload.title || '').toLowerCase().includes(searchTerm) ||
      (upload.tags || []).some(tag => tag.toLowerCase().includes(searchTerm));

    if (matches) {
      const firstFile = upload.files?.[0];
      const cover = firstFile?.coverPhoto?.preview || firstFile?.preview;

      results.push({
        id: upload.id,
        title: upload.title,
        description: upload.description || '',
        type: upload.type,
        cover,
        source: upload.type === 'article' ? 'article' : 'post'
      });
    }
  });

  return results;
}

// ============================================================================
// USER UTILITIES
// ============================================================================

export async function getUserProfile(uid: string): Promise<DocumentData | null> {
  const userDoc = await getDocs(query(collection(db, 'users'), where('uid', '==', uid)));
  return userDoc.docs[0]?.data() || null;
}

export async function updateUserProfile(uid: string, data: Partial<DocumentData>): Promise<void> {
  await setDoc(doc(db, 'users', uid), data, { merge: true });
}

// ============================================================================
// SAVED POSTS
// ============================================================================

export async function savePost(uid: string, uploadId: string): Promise<void> {
  const savedPostRef = doc(db, 'savedPosts', `${uid}_${uploadId}`);
  await setDoc(savedPostRef, {
    uid,
    uploadId,
    savedAt: serverTimestamp(),
  });
}

export async function unsavePost(uid: string, uploadId: string): Promise<void> {
  const savedPostRef = doc(db, 'savedPosts', `${uid}_${uploadId}`);
  await deleteDoc(savedPostRef);
}

export async function getSavedPosts(uid: string): Promise<string[]> {
  const savedQuery = query(collection(db, 'savedPosts'), where('uid', '==', uid));
  const snap = await getDocs(savedQuery);
  return snap.docs.map(d => d.data().uploadId);
}

export async function getSavedPostsWithData(uid: string): Promise<Upload[]> {
  const savedIds = await getSavedPosts(uid);
  const posts: Upload[] = [];
  
  for (const id of savedIds) {
    const post = await getUploadById(id);
    if (post) posts.push(post);
  }
  
  return posts;
}

// ============================================================================
// BOOKMARKS
// ============================================================================

export async function bookmarkPost(uid: string, uploadId: string): Promise<void> {
  const bookmarkRef = doc(db, 'bookmarks', `${uid}_${uploadId}`);
  await setDoc(bookmarkRef, {
    uid,
    uploadId,
    bookmarkedAt: serverTimestamp(),
  });
}

export async function unbookmarkPost(uid: string, uploadId: string): Promise<void> {
  const bookmarkRef = doc(db, 'bookmarks', `${uid}_${uploadId}`);
  await deleteDoc(bookmarkRef);
}

export async function getBookmarkedPosts(uid: string): Promise<string[]> {
  const bookmarkQuery = query(collection(db, 'bookmarks'), where('uid', '==', uid));
  const snap = await getDocs(bookmarkQuery);
  return snap.docs.map(d => d.data().uploadId);
}

export async function getBookmarkedPostsWithData(uid: string): Promise<Upload[]> {
  const bookmarkedIds = await getBookmarkedPosts(uid);
  const posts: Upload[] = [];
  
  for (const id of bookmarkedIds) {
    const post = await getUploadById(id);
    if (post) posts.push(post);
  }
  
  return posts;
}

export async function deleteUserAvatar(uid: string, avatarUrl: string): Promise<void> {
  const avatarPath = extractStoragePathFromUrl(avatarUrl);
  if (avatarPath) {
    try {
      await deleteFileFromStorage(avatarPath);
    } catch (error) {
      console.log("🚀 ~ deleteUserAvatar ~ error:", error)
    }
  }
}

// ============================================================================
// LEGACY COMPATIBILITY
// ============================================================================

// Legacy functions for backward compatibility
export async function getUserPosts(uid: string, limitCount: number = 25): Promise<Upload[]> {
  const result = await getUserUploads(uid, limitCount);
  return result.uploads;
}

export const getAllPosts = getAllUploads;
export const deletePost = deleteUpload;
export const getUserArticles = getUserPosts;
export const getAllArticles = getAllUploads;
export const deleteArticle = deleteUpload;