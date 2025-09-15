
// A serializable representation of a File object
export interface SerializableFile {
    name: string;
    type: string;
    size: number;
}

// Represents a file that has been uploaded and stored, ready for serialization
export interface UploadedFile {
    file: SerializableFile;
    preview: string; // For images/docs this is a Data URL, for videos this is a blob: URL
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

    