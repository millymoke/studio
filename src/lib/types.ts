
// A serializable representation of a File object
export interface SerializableFile {
    name: string;
    type: string;
    size: number;
}

// Represents a file that has been uploaded and stored, ready for serialization
export interface UploadedFile {
    file: SerializableFile;
    // The preview is now a temporary blob URL for all file types except for small images
    // which might be data URLs. This avoids localStorage quota issues.
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

    