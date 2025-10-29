
// A serializable representation of a File object
export interface SerializableFile {
    name: string;
    type: string;
    size: number;
}

// Represents a file that has been uploaded and stored, ready for serialization
export interface UploadedFile {
    file: SerializableFile;
    // The preview is a data URL for images, stored in localStorage for quick grid view.
    // For other types, this might be empty, as we'll generate blob URLs from IndexedDB on the fly.
    preview: string; 
    url?: string;
    altText?: string;
    objectPosition?: string; // e.g. 'top', 'center', 'bottom'
    coverPhoto?: {
        file: SerializableFile;
        preview: string; // Data URL for the cover photo
    };
}

export interface Upload {
  id: string;
  uid: string;
  type: 'video' | 'article' | 'image' | 'document';
  title: string;
  description: string;
  link: string;
  tags: string[];
  files: UploadedFile[];
  displayOption: 'individual' | 'carousel';
}

// Input types for creating posts and articles
export interface CreatePostInput {
    uid: string;
    title: string;
    description?: string;
    tags?: string[];
    link?: string;
    displayOption: "individual" | "carousel";
    files: Array<{
        file: File;
        altText?: string;
        coverPhoto?: { file: File; preview: string };
    }>;
}

export interface CreateArticleInput {
    uid: string;
    title: string;
    content: string;
    tags?: string[];
    link?: string;
    coverPhoto?: { file: File; preview: string };
    altText?: string;
}

export interface SearchResult {
    id: string;
    title: string;
    description: string;
    type: string;
    cover?: string;
    source: 'post' | 'article';
}
