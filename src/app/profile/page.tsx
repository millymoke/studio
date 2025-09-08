
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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle as AlertDialogTitleComponent } from '@/components/ui/alert-dialog';
import { EditPostForm } from '@/components/edit-post-form';
import type { Upload } from '@/lib/types';
import { UPLOADS_STORAGE_KEY } from '@/lib/constants';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';


const generateMockUploads = (count: number, offset = 0): Upload[] => {
  return Array.from({ length: count }).map((_, i) => {
    const id = `mock-${i + offset}`;
    const type = i % 3 === 0 ? 'video' : (i % 3 === 1 ? 'article' : 'image');
    return {
      id,
      type: type,
      title: type === 'article' ? `My Awesome Article ${id}` : `Shared Content ${id}`,
      description: 'A captivating piece of content I wanted to share with the world.',
      link: 'example.com',
      tags: ['inspiration', 'design', 'art'],
      files: [{
        file: { name: `file${i}.jpg`, type: 'image/jpeg', size: 1234 },
        preview: `https://picsum.photos/800/1000?random=${i + 1}`,
        altText: 'An example of beautiful content',
        objectPosition: 'center',
        ...( (type === 'article' || type === 'document') && { 
            coverPhoto: {
                file: { name: `cover${i}.jpg`, type: 'image/jpeg', size: 4321 },
                preview: `https://picsum.photos/1200/800?random=${i + 1}`
            }
        })
      }],
      displayOption: 'individual'
    };
  });
};


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

    useEffect(() => {
        setIsClient(true);
    }, []);

    const loadUploadsFromStorage = useCallback(() => {
        if (typeof window === 'undefined') return [];
        const storedUploads = localStorage.getItem(UPLOADS_STORAGE_KEY);
        if (storedUploads) {
            try {
                const parsed = JSON.parse(storedUploads);
                return Array.isArray(parsed) ? parsed : [];
            } catch (e) {
                console.error("Failed to parse uploads from localStorage", e);
                return [];
            }
        }
        return [];
    }, []);

    const loadInitialData = useCallback(() => {
        setIsLoading(true);
        // Load personal uploads
        const storedUploads = loadUploadsFromStorage();
        if (storedUploads.length > 0) {
            allUploadsRef.current = storedUploads;
        } else {
            const mockUploads = generateMockUploads(BATCH_SIZE);
            try {
                localStorage.setItem(UPLOADS_STORAGE_KEY, JSON.stringify(mockUploads));
                allUploadsRef.current = mockUploads;
            } catch (e) {
                console.error("Failed to save mock uploads to localStorage", e);
            }
        }

        const initialBatch = allUploadsRef.current.slice(0, BATCH_SIZE);
        setUploads(initialBatch);
        
        // Load saved uploads (mocked for now)
        const mockSavedUploads = generateMockUploads(BATCH_SIZE, 100);
        setSavedUploads(mockSavedUploads);

        setHasMore(initialBatch.length < allUploadsRef.current.length);
        setIsLoading(false);
    }, [loadUploadsFromStorage]);
    
    useEffect(() => {
        if (isClient) {
            loadInitialData();
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

        const updatedUploads = allUploadsRef.current.filter((upload: Upload) => upload.id !== deletingUploadId);
        localStorage.setItem(UPLOADS_STORAGE_KEY, JSON.stringify(updatedUploads));
        allUploadsRef.current = updatedUploads;
        setUploads(prev => prev.filter(u => u.id !== deletingUploadId));
        setDeletingUploadId(null);
        setEditingUpload(null);
    };
    
    const renderUploadContent = (upload: Upload) => {
        const firstFile = upload.files[0];
        if (!firstFile) return null;

        const coverPhotoSrc = firstFile.coverPhoto?.preview;
        const previewSrc = firstFile.preview;

        switch (upload.type) {
            case 'video':
                 return (
                    <div className="absolute inset-0 bg-black/30 flex flex-col items-center justify-center text-white">
                        {coverPhotoSrc ? 
                            <Image src={coverPhotoSrc} alt={upload.title} fill className="object-cover" /> :
                            <Image src={previewSrc || "https://picsum.photos/800/1000"} alt={upload.title} fill className="object-cover" />
                        }
                         <div className="absolute inset-0 bg-black/30 flex flex-col items-center justify-center text-white">
                            <PlayCircle className="w-12 h-12" />
                            <p className="font-bold mt-2">Video</p>
                        </div>
                    </div>
                );
            case 'article':
            case 'document':
                 return (
                     <div className="absolute inset-0 bg-card">
                        {coverPhotoSrc ? 
                            <Image src={coverPhotoSrc} alt={upload.title} fill className="object-cover" /> 
                            : <div className="w-full h-full bg-muted flex items-center justify-center"><FileText className="w-12 h-12 text-muted-foreground" /></div>
                        }
                        <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center text-white p-4 text-center">
                            <FileText className="w-12 h-12 opacity-80" />
                            <p className="font-bold mt-2 z-10">{upload.title}</p>
                        </div>
                    </div>
                );
            case 'image':
            default:
                return (
                     <Image 
                        src={previewSrc || "https://picsum.photos/800/1000"}
                        alt={firstFile?.altText || upload.title} 
                        fill
                        className="object-cover transition-transform duration-300 group-hover:scale-105"
                        style={{ objectPosition: firstFile?.objectPosition || 'center' }}
                        data-ai-hint="fashion outdoor"
                    />
                );
        }
    }
    
    const EnlargedContentView = ({ upload }: { upload: Upload }) => {
        const [textContent, setTextContent] = useState<string | null>(null);
        const [isLoadingText, setIsLoadingText] = useState(false);
        const firstFile = upload.files[0];
    
        useEffect(() => {
            const isTextBased = upload.type === 'article' || (upload.type === 'document' && firstFile?.file.type.startsWith('text/'));
            const filePreview = firstFile?.preview;
            const isTextDataUri = typeof filePreview === 'string' && filePreview.startsWith('data:text/');
            
            if (isTextBased && isTextDataUri) {
                setIsLoadingText(true);
                fetch(filePreview)
                    .then(res => res.text())
                    .then(text => {
                        setTextContent(text);
                        setIsLoadingText(false);
                    })
                    .catch(err => {
                        console.error("Failed to fetch text content", err);
                        setTextContent("Could not load content.");
                        setIsLoadingText(false);
                    });
            } else {
                setTextContent(null);
            }
        }, [upload.type, firstFile?.preview, firstFile?.file.type]);
    
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
    
        switch (upload.type) {
            case 'video':
                const videoFile = upload.files.find(f => f.file.type.startsWith('video/')) || firstFile;
                return (
                    <div className="w-full aspect-video bg-black rounded-md flex items-center justify-center">
                        {videoFile?.preview ? (
                             <video
                                src={videoFile.preview}
                                controls
                                autoPlay
                                poster={videoFile.coverPhoto?.preview}
                                className="w-full h-full object-contain"
                            />
                        ): <p className="text-white">Could not load video.</p>}
                    </div>
                );
    
            case 'article':
            case 'document': {
                const coverPhotoSrc = firstFile?.coverPhoto?.preview;
                const isPdf = firstFile?.file.type.includes('pdf');
                const isText = firstFile?.file.type.startsWith('text/');

                return (
                     <div className="flex flex-col h-full w-full bg-background rounded-md overflow-hidden max-w-4xl mx-auto">
                       {coverPhotoSrc && (
                           <div className="w-full aspect-video relative rounded-t-md overflow-hidden flex-shrink-0 bg-muted">
                               <Image src={coverPhotoSrc} alt={upload.title} fill className="object-cover" />
                           </div>
                       )}
                       <div className="flex-grow w-full border-t overflow-hidden flex flex-col">
                           <div className="p-4 border-b flex items-center justify-between flex-shrink-0 bg-card">
                               <h3 className="font-bold truncate">{upload.title}</h3>
                               {firstFile?.preview && (
                                   <Button asChild variant="outline" size="sm">
                                       <a href={firstFile.preview} download={firstFile.file.name}>
                                           <Download className="mr-2 h-4 w-4" />
                                           Download
                                       </a>
                                   </Button>
                               )}
                           </div>
                          
                           {isPdf && firstFile.preview ? (
                               <embed src={firstFile.preview} type={firstFile.file.type} width="100%" height="100%" className="flex-grow" />
                           ) : isText ? (
                                <ScrollArea className="h-full w-full flex-grow bg-white dark:bg-zinc-900">
                                    <div className="p-8 prose prose-zinc dark:prose-invert max-w-none">
                                       {isLoadingText ? <Loader2 className="animate-spin text-foreground" /> : <pre className="whitespace-pre-wrap font-sans text-sm text-zinc-800 dark:text-zinc-200">{textContent}</pre>}
                                   </div>
                               </ScrollArea>
                           ) : (
                               <div className="w-full flex-grow rounded-b-md flex flex-col items-center justify-center p-8 text-center bg-muted">
                                   <FileText className="w-20 h-20 mb-4 text-muted-foreground" />
                                   <h3 className="text-xl font-bold">{upload.title}</h3>
                                   <p className="text-muted-foreground">Preview not available for this file type. Please download to view.</p>
                               </div>
                           )}
                       </div>
                   </div>
               );
            }
            case 'image':
            default:
                 const previewSrcDefault = firstFile?.preview;
                return (
                    <div className="flex items-center justify-center h-full">
                        <Image
                            src={previewSrcDefault || "https://picsum.photos/800/1000"}
                            alt={firstFile?.altText || upload.title}
                            width={800}
                            height={1000}
                            className="max-w-full max-h-[85vh] w-auto h-auto object-contain rounded-md"
                        />
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
                                      : "max-w-6xl"
                                )}>
                                    <DialogHeader className="sr-only">
                                      <DialogTitle>{viewingUpload.title}</DialogTitle>
                                      <DialogDescription>Enlarged view of {viewingUpload.title}</DialogDescription>
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
                                    {renderGrid(uploads, true)}
                                </TabsContent>
                                <TabsContent value="saved">
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

    