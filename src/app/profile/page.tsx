
"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Header from '@/components/header';
import Footer from '@/components/footer';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Edit, MessageCircle, Send, MoreVertical, Bookmark, Link as LinkIcon, Loader2, PlayCircle, FileText, Trash2, Download, CheckSquare, LayoutGrid, Plus } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogClose, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle as AlertDialogTitleComponent } from '@/components/ui/alert-dialog';
import { EditPostForm } from '@/components/edit-post-form';
import { EditArticleForm } from '@/components/edit-article-form';
import type { Upload, UploadedFile } from '@/lib/types';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
// No IndexedDB needed - all files stored in Firebase Storage
import { useToast } from '@/hooks/use-toast';
import { PdfViewer } from '@/components/pdf-viewer';
import { PdfThumbnail } from '@/components/pdf-thumbnail';
import { OfficeDocsThumbnail } from '@/components/office-docs-thumbnail';
import { useAuth } from '@/components/auth-provider';
import { getUserUploads, updatePost, updateArticle, deleteUpload, fetchFileContentFromStorage, getSavedPostsWithData } from '@/lib/firebase-utils';
import { savePost, unsavePost, getBookmarkedPosts, bookmarkPost, unbookmarkPost } from '@/lib/local-storage-utils';
import { getAbsoluteFileUrl } from '@/lib/url-utils';

interface UploadWithLocalPreview extends Upload {
    files: Array<UploadedFile & { localPreviewUrl?: string }>;
}

import Protected from '@/components/protected';
import { log } from 'console';

export default function ProfilePage() {
    const { toast } = useToast();
    const { user } = useAuth();

    const [uploads, setUploads] = useState<UploadWithLocalPreview[]>([]);
    const [savedUploads, setSavedUploads] = useState<UploadWithLocalPreview[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [hasMore, setHasMore] = useState(true);
    const observer = useRef<IntersectionObserver>();
    const [editingUpload, setEditingUpload] = useState<Upload | null>(null);
    const [deletingUploadId, setDeletingUploadId] = useState<string | null>(null);
    const [viewingUpload, setViewingUpload] = useState<UploadWithLocalPreview | null>(null);
    const [isClient, setIsClient] = useState(false);
    const [bookmarkedIds, setBookmarkedIds] = useState<Set<string>>(new Set());
    
    // Load bookmarks from Firebase
    useEffect(() => {
        const loadBookmarks = async () => {
            if (isClient && user) {
                try {
                    const ids = await getBookmarkedPosts(user.uid);
                    setBookmarkedIds(new Set(ids));
                } catch (e) {
                    console.error('Failed to load bookmarks', e);
                }
            }
        };
        loadBookmarks();
    }, [isClient, user]);

    // Load saved uploads from Firebase
    useEffect(() => {
        const loadSavedPosts = async () => {
            if (isClient && user) {
                try {
                    const saved = await getSavedPostsWithData(user.uid);
                    const savedWithPreviews = await processUploadsWithLocalPreviews(saved);
                    setSavedUploads(savedWithPreviews);
                } catch (e) {
                    console.error('Failed to load saved uploads', e);
                }
            }
        };
        loadSavedPosts();
    }, [isClient, user]);
    const allUploadsRef = useRef<Upload[]>([]);
    const BATCH_SIZE = 8;
    const [activeTab, setActiveTab] = useState('uploads');
    
    // Handle URL tab parameter
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const params = new URLSearchParams(window.location.search);
            const tab = params.get('tab');
            if (tab && ['uploads', 'bookmarked', 'saved'].includes(tab)) {
                setActiveTab(tab);
            }
        }
    }, []);
    const [lastDoc, setLastDoc] = useState<any>(null);

    const pageBlobUrls = useRef<Set<string>>(new Set());

    useEffect(() => {
        setIsClient(true);
        return () => {
            pageBlobUrls.current.forEach(url => {
                if (url.startsWith('blob:')) {
                    URL.revokeObjectURL(url);
                }
            });
        };
    }, []);
    
    // No local storage - all data comes from Firebase

    const processUploadsWithLocalPreviews = async (uploadsToProcess: Upload[]): Promise<UploadWithLocalPreview[]> => {
        const processed = await Promise.all(uploadsToProcess.map(async (upload) => {
            const filesWithLocalPreviews = await Promise.all(upload.files.map(async (file) => {
                if (file.preview) {
                     return { ...file, localPreviewUrl: file.preview };
                }
                return { ...file, localPreviewUrl: undefined };
            }));
            return { ...upload, files: filesWithLocalPreviews };
        }));
        return processed;
    };


    const loadInitialData = useCallback(async () => {
        setIsLoading(true);
        if (user) {
            const result = await getUserUploads(user.uid, BATCH_SIZE);
            allUploadsRef.current = result.uploads;
            setLastDoc(result.lastDoc);
            setHasMore(result.uploads.length === BATCH_SIZE);
            const initialBatchWithPreviews = await processUploadsWithLocalPreviews(result.uploads);
            // Sort by ID (timestamp) descending - latest first
            const sortedUploads = initialBatchWithPreviews.sort((a, b) => {
                const aTime = parseInt(a.id.split('-')[0]) || 0;
                const bTime = parseInt(b.id.split('-')[0]) || 0;
                return bTime - aTime;
            });
            setUploads(sortedUploads);
        } else {
            // No user - show empty state
            allUploadsRef.current = [];
            setUploads([]);
            setLastDoc(null);
            setHasMore(false);
        }
        setIsLoading(false);
    }, [user]);


    useEffect(() => {
        if (isClient) {
            loadInitialData();
            // No local storage events to listen for
        }
    }, [isClient, loadInitialData]);

    const loadMoreUploads = useCallback(async () => {
        if (isLoading || !hasMore || activeTab !== 'uploads') return;
        setIsLoading(true);
        if (user && lastDoc) {
            // Fetch more uploads using pagination
            const result = await getUserUploads(user.uid, BATCH_SIZE, lastDoc);

            const nextBatchWithPreviews = await processUploadsWithLocalPreviews(result.uploads);
            // Sort new batch by ID (timestamp) descending
            const sortedBatch = nextBatchWithPreviews.sort((a, b) => {
                const aTime = parseInt(a.id.split('-')[0]) || 0;
                const bTime = parseInt(b.id.split('-')[0]) || 0;
                return bTime - aTime;
            });
            setUploads(prev => [...prev, ...sortedBatch]);
            setLastDoc(result.lastDoc);
            setHasMore(result.uploads.length === BATCH_SIZE);
        }

        setIsLoading(false);
    }, [isLoading, hasMore, activeTab, user, lastDoc]);

    const lastUploadElementRef = useCallback((node: HTMLDivElement) => {
        if (isLoading) return;
        if (observer.current) observer.current.disconnect();
        observer.current = new IntersectionObserver(entries => {
            if (entries[0].isIntersecting && hasMore) {
                loadMoreUploads();
            }
        });
        if (node) observer.current.observe(node);
    }, [isLoading, hasMore, loadMoreUploads]);
    
    const handleUpdatePost = async (updatedUpload: Upload) => {
        if (!user) return;

        try {
            // Check if article content was updated
            if (updatedUpload.type === 'article' && (updatedUpload.files[0] as any)?.updatedContent) {
                const updatedContent = (updatedUpload.files[0] as any).updatedContent;
                
                // Re-upload the article content to storage
                const { uploadFileToVPS, createVPSUserPath } = await import('@/lib/vps-storage-utils');
                const articleBlob = new Blob([updatedContent], { type: 'text/plain;charset=utf-8' });
                const articleFile = new File([articleBlob], `${updatedUpload.title.replace(/\s+/g, '-')}.txt`, { type: 'text/plain;charset=utf-8' });
                
                const filePath = `${createVPSUserPath(user.uid, 'uploads')}/${Date.now()}-${articleFile.name}`;
                const result = await uploadFileToVPS(articleFile, filePath);
                
                if (result.success && result.file) {
                    // Update the file URL with new content
                    updatedUpload.files[0].url = result.file.url;
                    delete (updatedUpload.files[0] as any).updatedContent;
                }
            }
            
            // Update in Firebase
            if (updatedUpload.type === 'article') {
                await updateArticle(updatedUpload.id, updatedUpload, user.uid);
            } else {
                await updatePost(updatedUpload.id, updatedUpload, user.uid);
            }

            // Update local state
        const updatedUploads = allUploadsRef.current.map((upload: Upload) =>
            upload.id === updatedUpload.id ? updatedUpload : upload
        );
        allUploadsRef.current = updatedUploads;

        setUploads(prev => prev.map(u => {
            if (u.id === updatedUpload.id) {
                const newFiles = updatedUpload.files.map((updatedFile, index) => {
                    const originalFile = u.files[index];
                    return {
                        ...updatedFile,
                        localPreviewUrl: originalFile?.localPreviewUrl || updatedFile.preview,
                    };
                });
                return { ...updatedUpload, files: newFiles };
            }
            return u;
        }));

        setEditingUpload(null);

            toast({
                title: "Post Updated!",
                description: "Your post has been successfully updated.",
            });
        } catch (error) {
            console.error('Failed to update post:', error);
            toast({
                variant: "destructive",
                title: "Update Failed",
                description: "Failed to update your post. Please try again.",
            });
        }
    };

    const handleDeletePost = async () => {
        if (!deletingUploadId || !user) return;
        
        try {
            // Delete from Firebase (this also deletes files from storage)
            await deleteUpload(deletingUploadId, user.uid);

            // Update local state
        const updatedUploads = allUploadsRef.current.filter((upload: Upload) => upload.id !== deletingUploadId);
        allUploadsRef.current = updatedUploads;

        setUploads(prev => prev.filter(u => u.id !== deletingUploadId));
        setDeletingUploadId(null);
        setEditingUpload(null);

            toast({
                title: "Post Deleted!",
                description: "Your post has been successfully deleted.",
            });
        } catch (error) {
            console.error('Failed to delete post:', error);
            toast({
                variant: "destructive",
                title: "Delete Failed",
                description: "Failed to delete your post. Please try again.",
            });
        }
    };
    
    const handleAddToList = () => {
        // This is a mock implementation. In a real app, this would be an API call.
        toast({
            title: `${user?.displayName} added to your list!`,
        });
    }

    // Helper function to detect Office documents
    const isOfficeDocument = (mimeType?: string, fileName?: string): boolean => {
        if (!mimeType && !fileName) return false;

        const type = mimeType?.toLowerCase() || '';
        const name = fileName?.toLowerCase() || '';

        // Excel files
        if (type.includes('spreadsheet') || type.includes('excel') ||
            name.endsWith('.xlsx') || name.endsWith('.xls')) {
            return true;
        }

        // Word files
        if (type.includes('document') || type.includes('word') ||
            name.endsWith('.docx') || name.endsWith('.doc')) {
            return true;
        }

        return false;
    };

    const renderUploadContent = (upload: UploadWithLocalPreview) => {
        const firstFile = upload.files?.[0];
        if (!firstFile) {
            return (
                <div className="w-full h-full flex items-center justify-center bg-muted">
                    <FileText className="w-8 h-8 text-muted-foreground" />
                </div>
            );
        }

        // Check if this is a PDF file
        const isPdf = firstFile.file?.type === 'application/pdf' || firstFile.file?.name?.toLowerCase().endsWith('.pdf');

        // Check if this is an Office document (Excel, Word, PowerPoint)
        const isOfficeDoc = isOfficeDocument(firstFile.file?.type, firstFile.file?.name);

        // For PDFs, use the PDF thumbnail component
        if (isPdf) {
            const pdfUrl = getAbsoluteFileUrl(firstFile.preview || firstFile.url || '');
            return (
                <PdfThumbnail
                    url={pdfUrl}
                    fileName={firstFile.file?.name || upload.title}
                    className="w-full h-full"
                />
            );
        }

        // For Office documents, use the Office docs thumbnail component
        if (isOfficeDoc) {
            const docUrl = getAbsoluteFileUrl(firstFile.preview || firstFile.url || '');
            return (
                <OfficeDocsThumbnail
                    url={docUrl}
                    fileName={firstFile.file?.name || upload.title}
                    fileType={firstFile.file?.type}
                    className="w-full h-full"
                />
            );
        }

        // For articles, prioritize cover photo, for other types use file preview
        let previewSrc: string | null = null;
        if (upload.type === 'article') {
            // Articles: use cover photo if available, otherwise no preview (will show icon)
            const rawUrl = firstFile.coverPhoto?.preview || null;
            previewSrc = rawUrl ? getAbsoluteFileUrl(rawUrl) : null;
        } else {
            // Posts: use file preview or cover photo
            const rawUrl = firstFile.coverPhoto?.preview || firstFile.preview || firstFile.localPreviewUrl || firstFile.url || null;
            previewSrc = rawUrl ? getAbsoluteFileUrl(rawUrl) : null;
        }

        return (
            <div className="absolute inset-0 bg-muted">
                {previewSrc ? (
                    <img 
                        src={previewSrc}
                        alt={firstFile.altText || upload.title}
                        className="w-full h-full object-cover"
                        style={{ objectPosition: firstFile.objectPosition || 'center' }}
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center">
                        {upload.type === 'video' && <PlayCircle className="w-12 h-12 text-muted-foreground" />}
                        {(upload.type === 'document' || upload.type === 'article') && <FileText className="w-12 h-12 text-muted-foreground" />}
                    </div>
                )}
                 {(upload.type === 'document' || upload.type === 'article') && !previewSrc && (
                     <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center text-white p-4 text-center">
                        <FileText className="w-12 h-12 opacity-80" />
                        <p className="font-bold mt-2 z-10">{upload.title}</p>
                    </div>
                )}
            </div>
        );
    }
    
    const EnlargedContentView = ({ upload }: { upload: UploadWithLocalPreview }) => {
        const [dynamicUrl, setDynamicUrl] = useState<string | null>(null);
        const [textContent, setTextContent] = useState<string | null>(null);
        const [isLoading, setIsLoading] = useState(true);
        const [error, setError] = useState<string | null>(null);
    
        const firstFile = upload.files?.[0];
        
        const isImage = upload.type === 'image';
        const isVideo = upload.type === 'video';
        const isPdf = firstFile?.file.type === 'application/pdf';
        const isText = upload.type === 'article' || firstFile?.file.type?.startsWith('text/');
        const isViewableDocument = isPdf || isText;
        const isDownloadOnly = upload.type === 'document' && !isViewableDocument;
        const isArticle = upload.type === 'article';

        useEffect(() => {
            let active = true;
            let objectUrl: string | null = null;
    
            const loadContent = async () => {
                if (!firstFile || !isClient) {
                    setIsLoading(false);
                    return;
                }

                // For images, we can use the local preview URL directly if available.
                if (isImage && firstFile.localPreviewUrl) {
                    setDynamicUrl(firstFile.localPreviewUrl);
                    setIsLoading(false);
                    return;
                }
                
                setIsLoading(true);
                setError(null);
    
                try {
                    // Files are now stored in Firebase Storage
                    if (!active) return;
    
                    if (isArticle) {
                        // For articles, show cover photo if available, otherwise show text content
                        if (firstFile.coverPhoto?.preview) {
                            setDynamicUrl(firstFile.coverPhoto.preview);
                        } else if (firstFile.url) {
                            // For articles without cover photo, we'll show a placeholder
                            // The text content will be fetched separately if needed
                            setDynamicUrl(''); // No image to show
                        }
                    } else if (firstFile.url) {
                        // For other types, use Firebase Storage URL directly
                        setDynamicUrl(firstFile.url);
                    } else if (firstFile.preview && firstFile.preview.startsWith('data:')) {
                        // Fallback to data URL if available
                            setDynamicUrl(firstFile.preview);
                        } else {
                        throw new Error("File URL not available.");
                    }
                } catch (e) {
                    console.error("Failed to load file for enlarged view", e);
                    if (active) {
                        setError(e instanceof Error ? e.message : "An unknown error occurred.");
                    }
                } finally {
                    if (active) setIsLoading(false);
                }
            };
    
            loadContent();
    
            return () => {
                active = false;
                if (objectUrl) {
                    URL.revokeObjectURL(objectUrl);
                    pageBlobUrls.current.delete(objectUrl);
                }
            };
        }, [upload.id, firstFile, isImage, isText, isClient]);

        // Separate effect to fetch article text content
        useEffect(() => {
            if (!isArticle || !firstFile?.url) return;

            let active = true;

            const fetchArticleContent = async () => {
                try {
                    if (!firstFile.url) return;
                    const text = await fetchFileContentFromStorage(firstFile.url);
                    if (active) {
                        setTextContent(text);
                    }
                } catch (error) {
                    console.error('Failed to fetch article content:', error);
                    if (active) {
                        setTextContent('Failed to load article content.');
                    }
                }
            };

            fetchArticleContent();

            return () => {
                active = false;
            };
        }, [isArticle, firstFile?.url]);

        // Separate effect to fetch text content for non-article text files
        useEffect(() => {
            if (isArticle || !isText || !firstFile?.url) return;

            let active = true;

            const fetchTextContent = async () => {
                try {
                    if (!firstFile.url) return;
                    const text = await fetchFileContentFromStorage(firstFile.url);
                    if (active) {
                        setTextContent(text);
                    }
                } catch (error) {
                    console.error('Failed to fetch text content:', error);
                    if (active) {
                        setTextContent('Failed to load text content.');
                    }
                }
            };

            fetchTextContent();

            return () => {
                active = false;
            };
        }, [isArticle, isText, firstFile?.url]);
    
        if (isLoading) {
            return (
                <div className="w-full h-full flex items-center justify-center">
                    <Loader2 className="w-12 h-12 animate-spin text-foreground" />
                </div>
            );
        }
    
        if (error) {
             return (
                 <div className="w-full max-w-xl rounded-md flex flex-col items-center justify-center p-8 text-center bg-muted text-destructive-foreground">
                    <FileText className="w-20 h-20 mb-4" />
                    <h3 className="text-xl font-bold">Error Loading File</h3>
                    <p className="mt-2">{error}</p>
                </div>
            );
        }

        if (!dynamicUrl) {
             return (
                 <div className="w-full max-w-xl rounded-md flex flex-col items-center justify-center p-8 text-center bg-muted">
                    <FileText className="w-20 h-20 mb-4 text-muted-foreground" />
                    <h3 className="text-xl font-bold">{upload.title}</h3>
                    <p className="text-muted-foreground mt-2">Preview not available for this file type. Please download to view.</p>
                    <Button asChild variant="default" size="lg" className="mt-6">
                        <a href="#">
                           <Download className="mr-2 h-4 w-4" />
                           Download Unavailable
                        </a>
                    </Button>
                </div>
            );
        }
        
        if (isImage) {
            if (upload.displayOption === 'carousel' && upload.files.length > 1) {
                return (
                    <Carousel id='secnkjsvkjvnksdjnvjksd' className="w-full mx-auto" opts={{ loop: true }}>
                        <CarouselContent>
                            {upload.files.map((file, index) => (
                                <CarouselItem key={index} className="flex items-center justify-center">
                                    <img
                                        src={file.localPreviewUrl || "https://picsum.photos/800/1000"}
                                        alt={file.altText || upload.title}
                                        className="w-full h-[100vh] object-contain rounded-md"
                                        style={{ objectPosition: file.objectPosition || 'center' }}
                                    />
                                </CarouselItem>
                            ))}
                        </CarouselContent>
                        <CarouselPrevious className="-left-12" />
                        <CarouselNext className="-right-12" />
                    </Carousel>
                );
            }
            return (
              <div className="flex items-center justify-center h-full">
                <img
                  src={dynamicUrl}
                  alt={firstFile?.altText || upload.title}
                  className="w-full h-[80vh] object-contain rounded-md"
                />
              </div>
            );
        }

        if (isVideo) {
            return (
                <div className="w-full max-w-4xl aspect-video bg-black rounded-md flex items-center justify-center">
                    <video
                        src={dynamicUrl}
                        controls
                        autoPlay
                        poster={firstFile.coverPhoto?.preview}
                        className="w-full h-full object-contain"
                    />
                </div>
            );
        }
        
        if (isPdf) {
            return (
                <div className="w-full h-full rounded-md overflow-hidden">
                    <PdfViewer url={dynamicUrl} fileName={firstFile.file.name} className="w-full h-full" />
                </div>
            );
        }

        if (isArticle) {
            // Show article with cover photo at top and content below
            return (
                <div className="w-full h-full flex flex-col bg-background rounded-md overflow-hidden">
                    {firstFile.coverPhoto?.preview && (
                        <div className="w-full h-48 flex-shrink-0">
                            <img
                                src={firstFile.coverPhoto.preview}
                                alt={upload.title}
                                className="w-full h-full object-cover"
                            />
                        </div>
                    )}
                    <div className="p-4 border-b flex items-center justify-between flex-shrink-0 bg-card">
                        <h3 className="font-bold truncate">{upload.title}</h3>
                        <Button asChild variant="outline" size="sm">
                            <a href={firstFile.url} download={firstFile.file.name}>
                                <Download className="mr-2 h-4 w-4" />
                                Download
                            </a>
                        </Button>
                    </div>
                    <ScrollArea className="h-full w-full flex-grow bg-white dark:bg-zinc-900">
                        <div className="p-8 prose prose-lg prose-zinc dark:prose-invert max-w-none prose-pre:bg-transparent prose-pre:p-0">
                            <pre className="whitespace-pre-wrap font-sans text-base text-zinc-800 dark:text-zinc-200">{textContent || 'Loading content...'}</pre>
                        </div>
                    </ScrollArea>
                </div>
            );
        }

        if (isText && !isArticle) {
            return (
                <div className="w-full h-full flex flex-col bg-background rounded-md overflow-hidden">
                    <div className="p-4 border-b flex items-center justify-between flex-shrink-0 bg-card">
                        <h3 className="font-bold truncate">{upload.title}</h3>
                        <Button asChild variant="outline" size="sm">
                            <a href={dynamicUrl} download={firstFile.file.name}>
                                <Download className="mr-2 h-4 w-4" />
                                Download
                            </a>
                        </Button>
                    </div>
                    {/* <ScrollArea className="h-full w-full flex-grow bg-white dark:bg-zinc-900">
                        <div className="p-8 prose prose-lg prose-zinc dark:prose-invert max-w-none prose-pre:bg-transparent prose-pre:p-0">
                            <pre className="whitespace-pre-wrap font-sans text-base text-zinc-800 dark:text-zinc-200">{textContent || 'Loading content...'}</pre>
                        </div>
                    </ScrollArea> */}
                </div>
            );
        }
        
        // Fallback for non-viewable types like .docx, etc.
        if (isDownloadOnly) {
           return (
               <div className="w-full max-w-xl rounded-md flex flex-col items-center justify-center p-8 text-center bg-muted">
                   <FileText className="w-20 h-20 mb-4 text-muted-foreground" />
                   <h3 className="text-xl font-bold">{upload.title}</h3>
                   <p className="text-muted-foreground mt-2">Preview not available for this file type. Please download to view.</p>
                   <Button asChild variant="default" size="lg" className="mt-6">
                       <a href={dynamicUrl} download={firstFile.file.name}>
                           <Download className="mr-2 h-4 w-4" />
                           Download File
                       </a>
                   </Button>
               </div>
           );
        }

        // Generic fallback should not be reached if logic is correct
        return (
            <div className="w-full max-w-xl rounded-md flex flex-col items-center justify-center p-8 text-center bg-muted">
                <FileText className="w-20 h-20 mb-4 text-muted-foreground" />
                <h3 className="text-xl font-bold">{upload.title}</h3>
                <p className="text-muted-foreground mt-2">An unexpected error occurred. Unable to display this file.</p>
            </div>
        );
    };


    const renderGrid = (posts: UploadWithLocalPreview[], isMyUploads: boolean) => (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-10">
            {posts.map((upload, index) => {
                const isLastElement = posts.length === index + 1 && isMyUploads;
                return (
                    <div key={upload.id} ref={isLastElement ? lastUploadElementRef : null} className="group">
                        <Dialog onOpenChange={(open) => !open && setViewingUpload(null)} >
                            <DialogTrigger asChild>
                                <div className="aspect-[4/5] w-full relative rounded-lg overflow-hidden shadow-lg mb-3 bg-muted cursor-pointer" onClick={() => setViewingUpload(upload)}>
                                    {renderUploadContent(upload)}
                                </div>
                            </DialogTrigger>
                            {viewingUpload && viewingUpload.id === upload.id && (
                                <DialogContent className={cn(
                                    "px-4 border-0 bg-transparent shadow-none w-auto",
                                     (viewingUpload.type === 'document' || viewingUpload.type === 'article')
                                      ? "w-full h-[100vh]"
                                      : "w-full flex items-center justify-center"
                                )}>
                                    <DialogHeader>
                                      <DialogTitle className="sr-only">{viewingUpload.title}</DialogTitle>
                                      <DialogDescription className="sr-only">Enlarged view of {viewingUpload.title}</DialogDescription>
                                    </DialogHeader>
                                    <EnlargedContentView upload={viewingUpload} />
                                </DialogContent>
                            )}
                        </Dialog>
                        
                        <div className="px-1">
                            <p className="font-semibold text-sm truncate">{upload.title}</p>
                            <p className="text-sm text-muted-foreground truncate">{upload.description}</p>
                            {upload.link && (
                            <a href={upload.link.startsWith('http') ? upload.link : `https://${upload.link}`} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline flex items-center gap-1 my-1">
                              <LinkIcon className="w-3 h-3"/> {upload.link}
                            </a>
                            )}
                            <div className="flex justify-between items-center mt-2">
                                <div className="flex gap-2">
                                    <Button 
                                        variant="ghost" 
                                        size="icon" 
                                        className="h-8 w-8"
                                        onClick={async (e) => {
                                            e.stopPropagation();
                                            if (!user) return;
                                            
                                            const isBookmarked = bookmarkedIds.has(upload.id);
                                            if (isBookmarked) {
                                                try {
                                                    await unbookmarkPost(user.uid, upload.id);
                                                    setBookmarkedIds(prev => {
                                                        const newSet = new Set(prev);
                                                        newSet.delete(upload.id);
                                                        return newSet;
                                                    });
                                                    toast({ title: "Bookmark removed" });
                                                } catch (error) {
                                                    console.error('Failed to unbookmark:', error);
                                                    toast({ variant: "destructive", title: "Failed to remove bookmark" });
                                                }
                                            } else {
                                                try {
                                                    await bookmarkPost(user.uid, upload.id);
                                                    setBookmarkedIds(prev => {
                                                        const newSet = new Set(prev);
                                                        newSet.add(upload.id);
                                                        return newSet;
                                                    });
                                                    toast({ title: "Bookmarked!" });
                                                } catch (error) {
                                                    console.error('Failed to bookmark:', error);
                                                    toast({ variant: "destructive", title: "Failed to bookmark" });
                                                }
                                            }
                                        }}
                                    >
                                        <Bookmark className={`w-4 h-4 ${bookmarkedIds.has(upload.id) ? 'fill-current' : ''}`} />
                                    </Button>
                                    <Button 
                                        variant="ghost" 
                                        size="icon" 
                                        className="h-8 w-8"
                                        onClick={async (e) => {
                                            e.stopPropagation();
                                            if (!user) return;
                                            
                                            const exists = savedUploads.find(u => u.id === upload.id);
                                            if (exists) {
                                                try {
                                                    await unsavePost(user.uid, upload.id);
                                                    setSavedUploads(prev => prev.filter(u => u.id !== upload.id));
                                                    toast({ title: "Removed from saved" });
                                                } catch (error) {
                                                    console.error('Failed to unsave:', error);
                                                    toast({ variant: "destructive", title: "Failed to remove" });
                                                }
                                            } else {
                                                try {
                                                    await savePost(user.uid, upload.id);
                                                    setSavedUploads(prev => [...prev, upload]);
                                                    toast({ title: "Saved!" });
                                                } catch (error) {
                                                    console.error('Failed to save:', error);
                                                    toast({ variant: "destructive", title: "Failed to save" });
                                                }
                                            }
                                        }}
                                    >
                                        <CheckSquare className={`w-4 h-4 ${savedUploads.find(u => u.id === upload.id) ? 'fill-current' : ''}`} />
                                    </Button>
                                    <Button 
                                        variant="ghost" 
                                        size="icon" 
                                        className="h-8 w-8"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            const slug = upload.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
                                            const url = `${window.location.origin}/post/${slug}`;
                                            if (navigator.share) {
                                                navigator.share({
                                                    title: upload.title,
                                                    text: upload.description,
                                                    url: url,
                                                }).catch(() => {
                                                    navigator.clipboard.writeText(url);
                                                    toast({ title: "Link copied to clipboard!" });
                                                });
                                            } else {
                                                navigator.clipboard.writeText(url);
                                                toast({ title: "Link copied to clipboard!" });
                                            }
                                        }}
                                    >
                                        <Send className="w-4 h-4" />
                                    </Button>
                                </div>

                                {isMyUploads && (
                                     <Dialog onOpenChange={(open) => {if (!open) {setEditingUpload(null); setDeletingUploadId(null);}}}>
                                     <DialogTrigger asChild>
                                         <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditingUpload(upload)}>
                                             <MoreVertical className="w-4 h-4" />
                                         </Button>
                                     </DialogTrigger>
                                     {editingUpload && editingUpload.id === upload.id && (
                                       <DialogContent>
                                         <DialogHeader>
                                                    <DialogTitle>
                                                        Edit {editingUpload.type === 'article' ? 'Article' : 'Post'}
                                                    </DialogTitle>
                                         </DialogHeader>
                                                {editingUpload.type === 'article' ? (
                                                    <EditArticleForm
                                                        article={editingUpload}
                                                        onSave={handleUpdatePost}
                                                        onDeleteRequest={() => setDeletingUploadId(editingUpload.id)}
                                                    />
                                                ) : (
                                         <EditPostForm 
                                             post={editingUpload}
                                             onSave={handleUpdatePost} 
                                             onDeleteRequest={() => setDeletingUploadId(editingUpload.id)}
                                         />
                                                )}
                                       </DialogContent>
                                     )}
                                 </Dialog>
                                )}
                               
                            </div>
                        </div>
                    </div>
                )
            })}
            {isLoading && posts.length === 0 && Array.from({length: BATCH_SIZE}).map((_, i) => (
                <div key={`skeleton-initial-${i}`}>
                    <Skeleton className="aspect-[4/5] w-full rounded-lg" />
                    <div className="space-y-2 mt-2">
                        <Skeleton className="h-4 w-3/4" />
                        <Skeleton className="h-4 w-1/2" />
                    </div>
                </div>
            ))}
            {isLoading && posts.length > 0 && Array.from({length: 3}).map((_, i) => (
                 <div key={`skeleton-load-more-${i}`}>
                    <Skeleton className="aspect-[4/5] w-full rounded-lg" />
                    <div className="space-y-2 mt-2">
                        <Skeleton className="h-4 w-3/4" />
                        <Skeleton className="h-4 w-1/2" />
                    </div>
                </div>
            ))}
        </div>
    );
    
    return (
        <div className="flex flex-col min-h-screen bg-background">
            <Header />
            <main className="flex-1 py-12 px-4">
                <Protected>
                <div className="container mx-auto max-w-6xl">
                    <Card>
                        <CardHeader className="flex flex-col md:flex-row items-center gap-6 space-y-0 pb-8">
                            <Avatar className="h-28 w-28">
                                    <AvatarImage src={user?.photoURL || ''} alt={user?.displayName || ''} data-ai-hint="user avatar" />
                                    <AvatarFallback>{user?.displayName?.charAt(0).toUpperCase()}</AvatarFallback>
                            </Avatar>
                            <div className="flex-1 text-center md:text-left">
                                <div className="flex flex-col md:flex-row items-center justify-center md:justify-start gap-4 mb-2">
                                        <h1 className="text-4xl font-bold">{user?.displayName}</h1>
                                    <div className="flex items-center gap-2">
                                        <Button variant="outline" size="sm" onClick={handleAddToList}>
                                          <Plus className="mr-2 h-4 w-4" /> Add to List
                                        </Button>
                                        <Button variant="outline" size="sm" asChild>
                                          <Link href="/chat">
                                            <MessageCircle className="mr-2 h-4 w-4" /> Chat
                                          </Link>
                                        </Button>
                                        <Button variant="outline" size="sm" asChild>
                                          <Link href="/one-time-link">
                                            <Send className="mr-2 h-4 w-4" /> Secure Share
                                          </Link>
                                        </Button>
                                    </div>
                                </div>
                                    {/* <p className="text-muted-foreground">{user?.email}</p> */}
                                    <p className="text-sm mt-3 max-w-xl mx-auto md:mx-0">{user?.metadata?.creationTime?.toString() || ''}</p>
                            </div>
                             <Button variant="outline" size="sm" asChild>
                                <Link href="/account-settings">
                                    <Edit className="mr-2 h-4 w-4" />
                                    Edit Profile
                                </Link>
                            </Button>
                        </CardHeader>
                        <CardContent>
                           <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                                <TabsList className="grid w-full grid-cols-2 mb-6">
                                    <TabsTrigger value="uploads">
                                        <LayoutGrid className="mr-2 h-4 w-4" />
                                        My Uploads
                                    </TabsTrigger>
                                    <TabsTrigger value="saved">
                                        <CheckSquare className="mr-2 h-4 w-4" />
                                        Saved
                                    </TabsTrigger>
                                </TabsList>
                                <TabsContent value="uploads">
                                    {isClient && !isLoading && uploads.length === 0 && (
                                        <div className="text-center py-10">
                                            <p className="text-muted-foreground">You haven't uploaded anything yet.</p>
                                            <Button asChild className="mt-4">
                                                <Link href="/upload">Create your first post</Link>
                                            </Button>
                                        </div>
                                    )}
                                    {isClient && renderGrid(uploads, true)}
                                </TabsContent>

                                <TabsContent value="saved">
                                    {isClient && !isLoading && savedUploads.length === 0 && (
                                        <p className="text-center text-muted-foreground py-10">You haven't saved anything yet.</p>
                                    )}
                                    {isClient && renderGrid(savedUploads, false)}
                                </TabsContent>
                            </Tabs>
                        </CardContent>
                    </Card>
                </div>
                <AlertDialog open={!!deletingUploadId} onOpenChange={(open) => !open && setDeletingUploadId(null)}>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitleComponent>Are you absolutely sure?</AlertDialogTitleComponent>
                            <AlertDialogDescription>
                                    This action cannot be undone. This will permanently delete your post and its associated files from Firebase Storage.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={handleDeletePost}>Delete</AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
                </Protected>
            </main>
            <Footer />
        </div>
    );
}
