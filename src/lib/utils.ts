
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function readFileAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
    reader.readAsDataURL(file);
  });
}

export function generateFilePreview(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        if (file.type.startsWith('video/')) {
            const url = URL.createObjectURL(file);
            resolve(url);
        } else if (file.type.startsWith('image/')) {
            // We use Data URL for images to make them persistent in localStorage
             const reader = new FileReader();
             reader.onload = () => resolve(reader.result as string);
             reader.onerror = (error) => reject(error);
             reader.readAsDataURL(file);
        } else {
             // For documents, we will also use data URL for now.
             // If they are large, this could also hit quota limits.
             const reader = new FileReader();
             reader.onload = () => resolve(reader.result as string);
             reader.onerror = (error) => reject(error);
             reader.readAsDataURL(file);
        }
    });
}

    