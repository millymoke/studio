
"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Header from '@/components/header';
import Footer from '@/components/footer';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Edit, MessageCircle, Send, MoreVertical, Bookmark, Link as LinkIcon, Loader2, PlayCircle, FileText, ChevronLeft, ChevronRight } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { EditPostForm } from '@/components/edit-post-form';
import type { Upload } from '@/lib/types';
import { UPLOADS_STORAGE_KEY } from '@/lib/constants';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';

const generateMockUploads = (count: number, offset = 0): Upload[] => {
  return Array.from({ length: count }).map((_, i) => {
    const id = (i + offset).toString();
    const type = i % 3 === 0 ? 'video' : (i % 3 === 1 ? 'article' : 'image');
    return {
      id,
      type: type,
      title: type === 'article' ? `My Awesome Article ${id}` : `Shared Content ${id}`,
      description: 'A captivating piece of content I wanted to share with the world.',
      link: 'example.com',
      tags: ['inspiration', 'design', 'art'],
      files: [{
        preview: `https://picsum.photos/400/500?random=${i + 1}`,
        altText: 'An example of beautiful content',
        file: new File([], `file${i}.jpg`),
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
    const [viewingUpload, setViewingUpload] = useState<Upload | null>(null);
    const [isClient, setIsClient] = useState(false);

    useEffect(() => {
        setIsClient(true);
    }, []);

    const loadUploadsFromStorage = useCallback(() => {
        if (typeof window === 'undefined') return [];
        const storedUploads = localStorage.getItem(UPLOADS_STORAGE_KEY);
        if (storedUploads) {
            try {
                const parsedUploads = JSON.parse(storedUploads);
                // Re-hydrate File objects as they don't serialize well
                return parsedUploads.map((upload: any) => ({
                    ...upload,
                    files: upload.files.map((f: any) => ({...f, file: new File([], f.file.name, {type: f.file.type})}))
                }));
            } catch (e) {
                console.error("Failed to parse uploads from localStorage", e);
                return [];
            }
        }
        return [];
    }, []);

    const loadMoreUploads = useCallback(async () => {
        if (isLoading) return;
        setIsLoading(true);
        
        // In a real app, this would be an API call.
        // Here we simulate it with a timeout and mock data generation if local storage is empty.
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const existingUploads = loadUploadsFromStorage();
        if (uploads.length === 0 && existingUploads.length === 0) {
            // First load and nothing in storage, use mock data
            const newUploads = generateMockUploads(8);
            setUploads(newUploads);
            setHasMore(newUploads.length > 0);
        } else if (uploads.length < existingUploads.length) {
            // Load from storage in chunks
            const nextUploads = existingUploads.slice(uploads.length, uploads.length + 8);
            setUploads(prev => [...prev, ...nextUploads]);
            setHasMore(uploads.length + nextUploads.length < existingUploads.length);
        } else if (uploads.length === 0 && existingUploads.length > 0) {
            const initialUploads = existingUploads.slice(0, 8);
            setUploads(initialUploads);
            setHasMore(initialUploads.length < existingUploads.length);
        }
        else {
            setHasMore(false);
        }
        
        setIsLoading(false);
    }, [isLoading, uploads, loadUploadsFromStorage]);
    
    useEffect(() => {
        if (isClient) {
            const allUploads = loadUploadsFromStorage();
            if (allUploads.length > 0) {
              const initialUploads = allUploads.slice(0, 8);
              setUploads(initialUploads);
              setHasMore(initialUploads.length < allUploads.length);
            } else {
                // If storage is empty, generate initial mock data
                const mockUploads = generateMockUploads(8);
                setUploads(mockUploads);
                setHasMore(true); // Assume there could be more mock data
            }
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
        const allUploads = loadUploadsFromStorage();
        const updatedUploads = allUploads.map(upload =>
            upload.id === updatedUpload.id ? updatedUpload : upload
        );
        localStorage.setItem(UPLOADS_STORAGE_KEY, JSON.stringify(updatedUploads));
        setUploads(prev => prev.map(u => u.id === updatedUpload.id ? updatedUpload : u));
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
                        src={previewSrc || "https://picsum.photos/400/500"}
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
                return <p>Video player placeholder for {upload.title}</p>;
            case 'document':
                 return (
                    <div className="prose dark:prose-invert">
                        <h2>{upload.title}</h2>
                        <p>This is where the document content for '{upload.title}' would be displayed in PDF format.</p>
                        <p>{upload.description}</p>
                    </div>
                );
            case 'article':
                return (
                    <div className="prose dark:prose-invert">
                        <h2>{upload.title}</h2>
                        <p>{upload.description}</p>
                    </div>
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
                                                        {renderEnlargedContent(viewingUpload)}
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

                                                    <Dialog onOpenChange={(open) => !open && setEditingUpload(null)}>
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
                                                            />
                                                          </DialogContent>
                                                        )}
                                                    </Dialog>

                                                </div>
                                            </div>
                                        </div>
                                    )
                                })}
                                {isLoading && Array.from({length: 4}).map((_, i) => (
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
            </main>
            <Footer />
        </div>
    );
}
