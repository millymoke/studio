
// A serializable representation of a File object
export interface SerializableFile {
    name: string;
    type: string;
}

// Represents a file that has been processed for preview
export interface FileWithPreview {
    file: File | SerializableFile;
    preview: string;
}

// Represents a file that has been uploaded and stored
export interface UploadedFile {
    file: SerializableFile;
    preview?: string; // for images
    altText?: string;
    coverPhoto?: {
        file: SerializableFile;
        preview: string;
    }
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
