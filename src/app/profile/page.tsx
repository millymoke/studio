
"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Header from '@/components/header';
import Footer from '@/components/footer';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Edit, MessageCircle, Send, MoreVertical, Bookmark, Link as LinkIcon, Loader2, PlayCircle, FileText, Trash2 } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { EditPostForm } from '@/components/edit-post-form';
import type { Upload } from '@/lib/types';
import { UPLOADS_STORAGE_KEY } from '@/lib/constants';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';
import { ScrollArea } from '@/components/ui/scroll-area';

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
        file: { name: `file${i}.jpg`, type: 'image/jpeg' },
        preview: `https://picsum.photos/800/1000?random=${i + 1}`,
        altText: 'An example of beautiful content',
        objectPosition: 'center',
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
    const [isLoading, setIsLoading] = useState(false);
    const [hasMore, setHasMore] = useState(true);
    const observer = useRef<IntersectionObserver>();
    const [editingUpload, setEditingUpload] = useState<Upload | null>(null);
    const [deletingUploadId, setDeletingUploadId] = useState<string | null>(null);
    const [viewingUpload, setViewingUpload] = useState<Upload | null>(null);
    const [isClient, setIsClient] = useState(false);
    const allUploadsRef = useRef<Upload[]>([]);

    useEffect(() => {
        setIsClient(true);
    }, []);

    const loadUploadsFromStorage = useCallback(() => {
        if (typeof window === 'undefined') return [];
        const storedUploads = localStorage.getItem(UPLOADS_STORAGE_KEY);
        if (storedUploads) {
            try {
                return JSON.parse(storedUploads);
            } catch (e) {
                console.error("Failed to parse uploads from localStorage", e);
                return [];
            }
        }
        // If nothing in storage, generate and store mock data
        const mockUploads = generateMockUploads(8);
        try {
            localStorage.setItem(UPLOADS_STORAGE_KEY, JSON.stringify(mockUploads));
        } catch (e) {
            console.error("Failed to save mock uploads to localStorage", e);
        }
        return mockUploads;
    }, []);

    const loadMoreUploads = useCallback(async () => {
        if (isLoading) return;
        setIsLoading(true);
        
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const currentUploads = allUploadsRef.current;
        if (uploads.length < currentUploads.length) {
            const nextUploads = currentUploads.slice(uploads.length, uploads.length + 8);
            setUploads(prev => [...prev, ...nextUploads]);
            setHasMore(uploads.length + nextUploads.length < currentUploads.length);
        } else {
            setHasMore(false);
        }
        
        setIsLoading(false);
    }, [isLoading, uploads.length]);
    
    useEffect(() => {
        if (isClient) {
            allUploadsRef.current = loadUploadsFromStorage();
            const initialUploads = allUploadsRef.current.slice(0, 8);
            setUploads(initialUploads);
            setHasMore(initialUploads.length < allUploadsRef.current.length);
        }
    }, [isClient, loadUploadsFromStorage]);


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
        const previewSrc = firstFile?.coverPhoto?.preview || firstFile?.preview;

        switch (upload.type) {
            case 'video':
                return (
                    <div className="absolute inset-0 bg-black/30 flex flex-col items-center justify-center text-white">
                        {previewSrc ?
                            <Image src={previewSrc} alt={upload.title} fill className="object-cover" /> :
                            <PlayCircle className="w-12 h-12" />
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
                     <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center text-white p-4 text-center">
                        {firstFile.coverPhoto?.preview ? 
                            <Image src={firstFile.coverPhoto.preview} alt={upload.title} fill className="object-cover" /> 
                            : <FileText className="w-12 h-12" />
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

    const renderEnlargedContent = (upload: Upload) => {
        if (upload.displayOption === 'carousel' && upload.files.length > 1) {
            return (
                <Carousel className="w-full max-w-xl">
                    <CarouselContent>
                        {upload.files.map((file, index) => (
                            <CarouselItem key={index}>
                                <Image
                                    src={file.preview || "https://picsum.photos/800/1000"}
                                    alt={file.altText || upload.title}
                                    width={800}
                                    height={1000}
                                    className="w-full h-auto object-contain rounded-md"
                                    style={{ objectPosition: file.objectPosition || 'center' }}
                                />
                            </CarouselItem>
                        ))}
                    </CarouselContent>
                    <CarouselPrevious />
                    <CarouselNext />
                </Carousel>
            );
        }

        const firstFile = upload.files[0];
        const previewSrc = firstFile?.preview || "https://picsum.photos/800/1000";

        switch (upload.type) {
            case 'video':
                 return (
                    <div className="w-full aspect-video bg-black rounded-md flex flex-col items-center justify-center text-white">
                        <PlayCircle className="w-20 h-20 mb-4" />
                        <h3 className="text-xl font-bold">{upload.title}</h3>
                        <p>Video player placeholder</p>
                    </div>
                );
            case 'document':
                 return (
                    <div className="w-full h-[70vh]">
                      {firstFile.file.type === 'application/pdf' && firstFile.preview ? (
                        <embed src={firstFile.preview} type="application/pdf" width="100%" height="100%" />
                      ) : (
                        <div className="w-full h-full bg-muted rounded-md flex flex-col items-center justify-center p-8 text-center border">
                            <FileText className="w-20 h-20 mb-4 text-muted-foreground" />
                            <h3 className="text-xl font-bold">{upload.title}</h3>
                            <p className="text-muted-foreground">Could not display document. Preview may not be available.</p>
                            <p className="mt-4 text-sm">{upload.description}</p>
                        </div>
                      )}
                    </div>
                );
            case 'article':
                return (
                    <ScrollArea className="h-[70vh] w-full">
                        <div className="prose dark:prose-invert max-w-none p-1">
                            <h1>{upload.title}</h1>
                            <p>{upload.description}</p>
                            {/* In a real app, you would render the full article content here */}
                        </div>
                    </ScrollArea>
                );
            case 'image':
            default:
                return (
                    <Image
                        src={previewSrc}
                        alt={firstFile?.altText || upload.title}
                        width={800}
                        height={1000}
                        className="w-full h-auto object-contain rounded-md"
                        style={{ objectPosition: firstFile?.objectPosition || 'center' }}
                    />
                );
        }
    };
    
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
                                        <Button variant="outline" size="sm">
                                          <MessageCircle className="mr-2 h-4 w-4" /> Chat
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
                            <Button variant="outline" size="sm" className="absolute top-4 right-4 md:relative md:top-auto md:right-auto">
                                <Edit className="mr-2 h-4 w-4" />
                                Edit Profile
                            </Button>
                        </CardHeader>
                        <CardContent>
                            <h2 className="text-3xl font-bold mb-6 text-center md:text-left">My Uploads</h2>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-10">
                                {uploads.map((upload, index) => {
                                    const isLastElement = uploads.length === index + 1;
                                    return (
                                        <div key={upload.id} ref={isLastElement ? lastUploadElementRef : null} className="group">
                                            <Dialog onOpenChange={(open) => !open && setViewingUpload(null)}>
                                                <DialogTrigger asChild>
                                                    <div className="aspect-[4/5] w-full relative rounded-lg overflow-hidden shadow-lg mb-3 bg-muted cursor-pointer" onClick={() => setViewingUpload(upload)}>
                                                        {renderUploadContent(upload)}
                                                    </div>
                                                </DialogTrigger>
                                                {viewingUpload && viewingUpload.id === upload.id && (
                                                    <DialogContent className="max-w-3xl">
                                                        <DialogHeader>
                                                          <DialogTitle>{viewingUpload.title}</DialogTitle>
                                                        </DialogHeader>
                                                        <div className="flex-1 overflow-y-auto my-4">
                                                          {renderEnlargedContent(viewingUpload)}
                                                        </div>
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
                                                            <Send className="w-4 h-4" />
                                                        </Button>
                                                    </div>

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

                                                </div>
                                            </div>
                                        </div>
                                    )
                                })}
                                {isLoading && Array.from({length: 3}).map((_, i) => (
                                    <div key={`skeleton-${i}`}>
                                        <Skeleton className="aspect-[4/5] w-full rounded-lg" />
                                        <div className="space-y-2 mt-2">
                                            <Skeleton className="h-4 w-3/4" />
                                            <Skeleton className="h-4 w-1/2" />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </div>
                <AlertDialog open={!!deletingUploadId} onOpenChange={(open) => !open && setDeletingUploadId(null)}>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
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
