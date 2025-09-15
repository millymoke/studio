
"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Header from '@/components/header';
import Footer from '@/components/footer';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Edit, MessageCircle, Send, MoreVertical, Bookmark, Link as LinkIcon, Loader2, PlayCircle, FileText, Trash2, Download, CheckSquare, LayoutGrid } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogClose, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle as AlertDialogTitleComponent } from '@/components/ui/alert-dialog';
import { EditPostForm } from '@/components/edit-post-form';
import type { Upload, UploadedFile } from '@/lib/types';
import { UPLOADS_STORAGE_KEY } from '@/lib/constants';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { getTemporaryFile } from '@/components/upload-form'; // Import the helper

export default function ProfilePage() {
    const user = { 
        username: 'Maalai', 
        email: 'maalai@example.com',
        bio: 'Sharing my world',
        avatar: 'https://picsum.photos/200'
    };

    const [uploads, setUploads] = useState<Upload[]>([]);
    const [savedUploads, setSavedUploads] = useState<Upload[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [hasMore, setHasMore] = useState(true);
    const observer = useRef<IntersectionObserver>();
    const [editingUpload, setEditingUpload] = useState<Upload | null>(null);
    const [deletingUploadId, setDeletingUploadId] = useState<string | null>(null);
    const [viewingUpload, setViewingUpload] = useState<Upload | null>(null);
    const [isClient, setIsClient] = useState(false);
    const allUploadsRef = useRef<Upload[]>([]);
    const BATCH_SIZE = 8;
    const [activeTab, setActiveTab] = useState('uploads');
    const blobUrls = useRef<Map<string, string>>(new Map());

    // This map will hold temporary blob URLs created on this page
    const pageBlobUrls = useRef<Set<string>>(new Set());

    useEffect(() => {
        setIsClient(true);
        // Clean up blob URLs created on this page when the component unmounts
        return () => {
            pageBlobUrls.current.forEach(url => {
                if (url.startsWith('blob:')) {
                    URL.revokeObjectURL(url);
                }
            });
        };
    }, []);
    
    const loadUploadsFromStorage = useCallback(() => {
        if (typeof window === 'undefined') return [];
        const storedUploads = localStorage.getItem(UPLOADS_STORAGE_KEY);
        if (storedUploads) {
            try {
                const parsed = JSON.parse(storedUploads) as Upload[];
                if (Array.isArray(parsed)) {
                    // This sorting ensures newest uploads appear first
                    return parsed.sort((a, b) => parseInt(b.id) - parseInt(a.id));
                }
                return [];
            } catch (e) {
                console.error("Failed to parse uploads from localStorage", e);
                return [];
            }
        }
        return [];
    }, []);

    const loadInitialData = useCallback(() => {
        setIsLoading(true);
        const storedUploads = loadUploadsFromStorage();
        allUploadsRef.current = storedUploads;
        
        const initialBatch = allUploadsRef.current.slice(0, BATCH_SIZE);
        setUploads(initialBatch);

        // Generate mock saved uploads only if there are no real uploads
        if (storedUploads.length === 0) {
            const mockSavedUploads = Array.from({ length: BATCH_SIZE }).map((_, i) => ({
                id: `mock-saved-${i}`,
                type: 'image' as const,
                title: `Saved Content ${i}`,
                description: 'A captivating piece of content I saved.',
                link: '',
                tags: ['saved', 'inspiration'],
                files: [{
                    file: { name: `file${i}.jpg`, type: 'image/jpeg', size: 1234 },
                    preview: `https://picsum.photos/800/1000?random=${i + 200}`, // Using picsum for mock data
                    altText: 'A saved piece of beautiful content',
                    objectPosition: 'center',
                }],
                displayOption: 'individual' as const,
            }));
            setSavedUploads(mockSavedUploads);
        } else {
            setSavedUploads([]);
        }

        setHasMore(allUploadsRef.current.length > BATCH_SIZE);
        setIsLoading(false);
    }, [loadUploadsFromStorage]);

    useEffect(() => {
        if (isClient) {
            loadInitialData();
            const handleStorageChange = (e: StorageEvent) => {
                if (e.key === UPLOADS_STORAGE_KEY) {
                    loadInitialData();
                }
            };
            window.addEventListener('storage', handleStorageChange);
            return () => window.removeEventListener('storage', handleStorageChange);
        }
    }, [isClient, loadInitialData]);

    const loadMoreUploads = useCallback(() => {
        if (isLoading || !hasMore || activeTab !== 'uploads') return;
        setIsLoading(true);

        setTimeout(() => {
            const currentLength = uploads.length;
            const nextBatch = allUploadsRef.current.slice(currentLength, currentLength + BATCH_SIZE);
            setUploads(prev => [...prev, ...nextBatch]);
            setHasMore(currentLength + nextBatch.length < allUploadsRef.current.length);
            setIsLoading(false);
        }, 500);
    }, [isLoading, hasMore, uploads.length, activeTab]);

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
    
    const handleUpdatePost = (updatedUpload: Upload) => {
        const updatedUploads = allUploadsRef.current.map((upload: Upload) =>
            upload.id === updatedUpload.id ? updatedUpload : upload
        );
        localStorage.setItem(UPLOADS_STORAGE_KEY, JSON.stringify(updatedUploads));
        allUploadsRef.current = updatedUploads;
        setUploads(prev => prev.map(u => u.id === updatedUpload.id ? updatedUpload : u));
        setEditingUpload(null);
    };

    const handleDeletePost = () => {
        if (!deletingUploadId) return;
        
        // Find the upload to be deleted to revoke its blob URLs
        const uploadToDelete = allUploadsRef.current.find(u => u.id === deletingUploadId);
        if (uploadToDelete) {
            uploadToDelete.files.forEach(file => {
                // The file might be held in the temporary global storage.
                // We don't need to do anything with that, just revoke the URL if it's a blob url
                if(file.preview.startsWith('blob:')) {
                    URL.revokeObjectURL(file.preview);
                }
            });
        }
        
        const updatedUploads = allUploadsRef.current.filter((upload: Upload) => upload.id !== deletingUploadId);
        localStorage.setItem(UPLOADS_STORAGE_KEY, JSON.stringify(updatedUploads));
        allUploadsRef.current = updatedUploads;
        setUploads(prev => prev.filter(u => u.id !== deletingUploadId));
        setDeletingUploadId(null);
        setEditingUpload(null);
    };
    
    const renderUploadContent = (upload: Upload) => {
        const firstFile = upload.files?.[0];
        if (!firstFile) return null;

        // Cover photos are always data URLs, so they are safe to use directly
        const previewSrc = firstFile.coverPhoto?.preview || (upload.type === 'image' ? firstFile.preview : undefined);

        return (
            <div className="absolute inset-0 bg-muted">
                {previewSrc ? (
                    <Image 
                        src={previewSrc}
                        alt={upload.title}
                        fill
                        className="object-cover"
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
    
    const EnlargedContentView = ({ upload }: { upload: Upload }) => {
        const [dynamicUrl, setDynamicUrl] = useState<string | null>(null);
        const [textContent, setTextContent] = useState<string | null>(null);
        const [isLoading, setIsLoading] = useState(true);

        const firstFile = upload.files?.[0];

        useEffect(() => {
            let active = true;
            let objectUrl: string | null = null;

            const loadContent = async () => {
                if (!firstFile) {
                    setIsLoading(false);
                    return;
                }

                setIsLoading(true);

                // Check if the URL is a data URL (persisted) or a blob URL (temporary)
                if (firstFile.preview.startsWith('data:')) {
                     setDynamicUrl(firstFile.preview);
                } else if (firstFile.preview.startsWith('blob:')) {
                    // Try to get the file from our session's temporary storage
                    const tempFile = getTemporaryFile(firstFile.preview);

                    if (tempFile) {
                        objectUrl = URL.createObjectURL(tempFile);
                        if (active) {
                            setDynamicUrl(objectUrl);
                            pageBlobUrls.current.add(objectUrl); // Track for cleanup
                        }
                    }
                }
                
                // For text-based content, fetch and set it
                const isTextBased = firstFile.file.type.startsWith('text/');
                if (isTextBased) {
                    try {
                        const urlToFetch = objectUrl || firstFile.preview;
                         const response = await fetch(urlToFetch);
                         const text = await response.text();
                         if (active) setTextContent(text);
                    } catch (e) {
                         console.error("Failed to fetch content from URL", e);
                         if (active) setTextContent("Could not load content.");
                    }
                }

                if (active) setIsLoading(false);
            };

            loadContent();

            return () => {
                active = false;
                if (objectUrl) {
                    URL.revokeObjectURL(objectUrl);
                    pageBlobUrls.current.delete(objectUrl);
                }
            };
        }, [firstFile]);

        if (isLoading) {
            return (
                <div className="w-full h-full flex items-center justify-center">
                    <Loader2 className="w-12 h-12 animate-spin text-foreground" />
                </div>
            )
        }
        
        if (!firstFile || !dynamicUrl) return (
             <div className="w-full max-w-xl rounded-md flex flex-col items-center justify-center p-8 text-center bg-muted">
               <FileText className="w-20 h-20 mb-4 text-muted-foreground" />
               <h3 className="text-xl font-bold">{upload.title}</h3>
               <p className="text-muted-foreground mt-2">Could not load preview for this file.</p>
           </div>
        );
        
        const isPdf = firstFile.file.type === 'application/pdf';
        const isText = firstFile.file.type.startsWith('text/');
        
        // This is the main view logic.
        switch (upload.type) {
            case 'image':
                if (upload.displayOption === 'carousel' && upload.files.length > 1) {
                     return (
                        <Carousel className="w-full max-w-4xl mx-auto" opts={{ loop: true }}>
                            <CarouselContent>
                                {upload.files.map((file, index) => (
                                    <CarouselItem key={index} className="flex items-center justify-center">
                                        <Image
                                            src={file.preview || "https://picsum.photos/800/1000"}
                                            alt={file.altText || upload.title}
                                            width={800}
                                            height={1000}
                                            className="max-w-full max-h-[80vh] w-auto h-auto object-contain rounded-md"
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
                        <Image
                            src={dynamicUrl}
                            alt={firstFile.altText || upload.title}
                            width={800}
                            height={1000}
                            className="max-w-full max-h-[85vh] w-auto h-auto object-contain rounded-md"
                        />
                    </div>
                );

            case 'video':
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
            
            case 'document':
            case 'article':
                if (isPdf) {
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
                           <div className="flex-grow w-full h-full">
                               <embed src={dynamicUrl} type={firstFile.file.type} width="100%" height="100%" />
                           </div>
                       </div>
                    );
                }

                if (isText) {
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
                           <ScrollArea className="h-full w-full flex-grow bg-white dark:bg-zinc-900">
                               <div className="p-8 prose prose-lg prose-zinc dark:prose-invert max-w-none prose-pre:bg-transparent prose-pre:p-0">
                                   <pre className="whitespace-pre-wrap font-sans text-base text-zinc-800 dark:text-zinc-200">{textContent || 'Loading content...'}</pre>
                               </div>
                           </ScrollArea>
                       </div>
                    );
                }
                
                // Fallback for non-previewable documents
                return (
                   <div className="w-full max-w-xl rounded-md flex flex-col items-center justify-center p-8 text-center bg-muted">
                       <FileText className="w-20 h-20 mb-4 text-muted-foreground" />
                       <h3 className="text-xl font-bold">{upload.title}</h3>
                       <p className="text-muted-foreground mt-2">Preview not available for this file type. Please download to view.</p>
                       <Button asChild variant="outline" size="sm" className="mt-4">
                           <a href={dynamicUrl} download={firstFile.file.name}>
                               <Download className="mr-2 h-4 w-4" />
                               Download
                           </a>
                       </Button>
                   </div>
                );

            default:
                return (
                     <div className="w-full max-w-xl rounded-md flex flex-col items-center justify-center p-8 text-center bg-muted">
                       <FileText className="w-20 h-20 mb-4 text-muted-foreground" />
                       <h3 className="text-xl font-bold">{upload.title}</h3>
                       <p className="text-muted-foreground mt-2">Cannot display this file type.</p>
                   </div>
                );
        }
    };


    const renderGrid = (posts: Upload[], isMyUploads: boolean) => (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-10">
            {posts.map((upload, index) => {
                const isLastElement = posts.length === index + 1 && isMyUploads;
                return (
                    <div key={upload.id} ref={isLastElement ? lastUploadElementRef : null} className="group">
                        <Dialog onOpenChange={(open) => !open && setViewingUpload(null)}>
                            <DialogTrigger asChild>
                                <div className="aspect-[4/5] w-full relative rounded-lg overflow-hidden shadow-lg mb-3 bg-muted cursor-pointer" onClick={() => setViewingUpload(upload)}>
                                    {renderUploadContent(upload)}
                                </div>
                            </DialogTrigger>
                            {viewingUpload && viewingUpload.id === upload.id && (
                                <DialogContent className={cn(
                                    "p-0 border-0 bg-transparent shadow-none w-auto",
                                    (viewingUpload.type === 'article' || viewingUpload.type === 'document') 
                                      ? "max-w-4xl h-[90vh]" 
                                      : "max-w-6xl flex items-center justify-center"
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
                                    <Button variant="ghost" size="icon" className="h-8 w-8">
                                        <Bookmark className="w-4 h-4" />
                                    </Button>
                                    <Button variant="ghost" size="icon" className="h-8 w-8">
                                        <CheckSquare className="w-4 h-4" />
                                    </Button>
                                    <Button variant="ghost" size="icon" className="h-8 w-8">
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
                                           <DialogTitle>Edit Post</DialogTitle>
                                         </DialogHeader>
                                         <EditPostForm 
                                             post={editingUpload}
                                             onSave={handleUpdatePost} 
                                             onDeleteRequest={() => setDeletingUploadId(editingUpload.id)}
                                         />
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
                <div className="container mx-auto max-w-6xl">
                    <Card>
                        <CardHeader className="flex flex-col md:flex-row items-center gap-6 space-y-0 pb-8">
                            <Avatar className="h-28 w-28">
                                <AvatarImage src={user.avatar} alt={user.username} data-ai-hint="user avatar" />
                                <AvatarFallback>{user.username.charAt(0).toUpperCase()}</AvatarFallback>
                            </Avatar>
                            <div className="flex-1 text-center md:text-left">
                                <div className="flex flex-col md:flex-row items-center justify-center md:justify-start gap-4 mb-2">
                                    <h1 className="text-4xl font-bold">{user.username}</h1>
                                    <div className="flex items-center gap-2">
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
                                <p className="text-muted-foreground">{user.email}</p>
                                <p className="text-sm mt-3 max-w-xl mx-auto md:mx-0">{user.bio}</p>
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
                                    {renderGrid(uploads, true)}
                                </TabsContent>
                                <TabsContent value="saved">
                                    {isClient && !isLoading && savedUploads.length === 0 && (
                                        <p className="text-center text-muted-foreground py-10">You haven't saved anything yet.</p>
                                    )}
                                    {renderGrid(savedUploads, false)}
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
                                This action cannot be undone. This will permanently delete your post.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={handleDeletePost} variant="destructive">Delete</AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </main>
            <Footer />
        </div>
    );
}
    