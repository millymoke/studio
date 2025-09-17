
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
    altText?: string;
    objectPosition?: string; // e.g. 'top', 'center', 'bottom'
    coverPhoto?: {
        file: SerializableFile;
        preview: string; // Data URL for the cover photo
    };
}

export interface Upload {
  id: string;
  type: 'video' | 'article' | 'image' | 'document';
  title: string;
  description: string;
  link: string;
  tags: string[];
  files: UploadedFile[];
  displayOption: 'individual' | 'carousel';
}
