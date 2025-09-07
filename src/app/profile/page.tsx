"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Header from '@/components/header';
import Footer from '@/components/footer';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Edit, MessageCircle, Send, MoreVertical, Bookmark, Link as LinkIcon, Loader2 } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { Skeleton } from '@/components/ui/skeleton';

interface Upload {
  id: number;
  type: 'video' | 'article' | 'image';
  src: string;
  title: string;
  description: string;
  link: string;
}

const generateMockUploads = (count: number, offset = 0): Upload[] => {
  return Array.from({ length: count }).map((_, i) => {
    const id = i + offset;
    return {
      id,
      type: id % 3 === 0 ? 'video' : (id % 3 === 1 ? 'article' : 'image'),
      src: `https://picsum.photos/400/500?random=${id + 1}`,
      title: `Shared Content ${id + 1}`,
      description: 'A captivating piece of content I wanted to share.',
      link: 'example.com',
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

    const loadMoreUploads = useCallback(async () => {
        if (isLoading || !hasMore) return;
        setIsLoading(true);
        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, 1000));
        const newUploads = generateMockUploads(8, uploads.length);
        setUploads(prev => [...prev, ...newUploads]);
        // In a real app, you'd check if the API returned more items
        // For this mock, we'll just stop after 40 items for demo purposes
        if (uploads.length >= 32) {
            setHasMore(false);
        }
        setIsLoading(false);
    }, [isLoading, hasMore, uploads.length]);

    useEffect(() => {
        loadMoreUploads();
    }, []);

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
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-6 gap-y-10">
                                {uploads.map((upload, index) => {
                                    const isLastElement = uploads.length === index + 1;
                                    return (
                                        <div key={upload.id} ref={isLastElement ? lastUploadElementRef : null} className="group">
                                            <div className="aspect-[4/5] w-full relative rounded-lg overflow-hidden shadow-lg mb-3">
                                                <Image 
                                                    src={upload.src} 
                                                    alt={upload.title} 
                                                    fill
                                                    className="object-cover transition-transform duration-300 group-hover:scale-105"
                                                    data-ai-hint="fashion outdoor"
                                                />
                                                {upload.type === 'video' && (
                                                    <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                                                        <p className="text-white font-bold">Video Preview</p>
                                                    </div>
                                                )}
                                                {upload.type === 'article' && (
                                                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                                                        <p className="text-white font-bold text-center p-4">{upload.title}</p>
                                                    </div>
                                                )}
                                            </div>
                                            
                                            <div className="px-1">
                                                <p className="text-sm text-muted-foreground truncate">{upload.description}</p>
                                                <a href={`https://${upload.link}`} className="text-xs text-primary hover:underline flex items-center gap-1 my-1">
                                                <LinkIcon className="w-3 h-3"/> {upload.link}
                                                </a>
                                                <div className="flex justify-between items-center mt-2">
                                                    <div className="flex gap-2">
                                                        <Button variant="ghost" size="icon" className="h-8 w-8">
                                                            <Bookmark className="w-4 h-4" />
                                                        </Button>
                                                        <Button variant="ghost" size="icon" className="h-8 w-8">
                                                            <Send className="w-4 h-4" />
                                                        </Button>
                                                    </div>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8">
                                                        <MoreVertical className="w-4 h-4" />
                                                    </Button>
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
                            {!isLoading && !hasMore && (
                                <p className="text-center text-muted-foreground mt-8">You've reached the end!</p>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </main>
            <Footer />
        </div>
    );
}
