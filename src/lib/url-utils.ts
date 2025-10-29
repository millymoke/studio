export function getAbsoluteFileUrl(relativeUrl: string): string {
  if (!relativeUrl) return '';
  
  // If already absolute URL, return as is
  if (relativeUrl.startsWith('http://') || relativeUrl.startsWith('https://')) {
    return relativeUrl;
  }
  
  // If relative URL, prepend backend URL or current origin
  if (relativeUrl.startsWith('/')) {
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || process.env.BACKEND_URL;
    if (backendUrl) {
      return `${backendUrl}${relativeUrl}`;
    }
    // Fallback to current origin for client-side
    if (typeof window !== 'undefined') {
      return `${window.location.origin}${relativeUrl}`;
    }
  }
  
  return relativeUrl;
}
