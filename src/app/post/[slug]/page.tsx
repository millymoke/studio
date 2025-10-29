"use client";

import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import Header from '@/components/header';
import Footer from '@/components/footer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getAllUploads } from '@/lib/firebase-utils';
import type { Upload } from '@/lib/types';
import { Loader2, FileText, Image as ImageIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export default function PostPage() {
  const params = useParams();
  const slug = params.slug as string;
  const [post, setPost] = useState<Upload | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPost = async () => {
      try {
        const uploads = await getAllUploads(100);
        const found = uploads.find(u => {
          const postSlug = u.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
          return postSlug === slug;
        });
        setPost(found || null);
      } catch (error) {
        console.error('Failed to fetch post:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchPost();
  }, [slug]);

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen bg-background">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin" />
        </main>
        <Footer />
      </div>
    );
  }

  if (!post) {
    return (
      <div className="flex flex-col min-h-screen bg-background">
        <Header />
        <main className="flex-1 py-12 px-4">
          <div className="container mx-auto max-w-4xl text-center">
            <FileText className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
            <h1 className="text-2xl font-bold mb-2">Post Not Found</h1>
            <p className="text-muted-foreground">The post you're looking for doesn't exist.</p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const firstFile = post.files?.[0];
  
  // Get the image URL - prioritize cover photo for documents, otherwise use file URL
  let imageUrl = null;
  if (firstFile) {
    // For documents/PDFs, use cover photo if available
    if (firstFile.coverPhoto?.preview) {
      imageUrl = firstFile.coverPhoto.preview;
    } 
    // For images, use the file URL or preview
    else if (post.type === 'image' && (firstFile.url || firstFile.preview)) {
      imageUrl = firstFile.url || firstFile.preview;
    }
    
    // Convert relative URLs to absolute
    if (imageUrl && imageUrl.startsWith('/')) {
      imageUrl = `${window.location.origin}${imageUrl}`;
    }
  }
  
  const isImageFile = post.type === 'image' || (imageUrl && (imageUrl.includes('.jpg') || imageUrl.includes('.jpeg') || imageUrl.includes('.png') || imageUrl.includes('.gif') || imageUrl.includes('.webp')));

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Header />
      <main className="flex-1 py-12 px-4">
        <div className="container mx-auto max-w-4xl">
          <Card>
            {imageUrl && isImageFile ? (
              <div className="w-full h-96 overflow-hidden rounded-t-lg">
                <img 
                  src={imageUrl} 
                  alt={post.title} 
                  className="w-full h-full object-cover"
                />
              </div>
            ) : (
              <div className="w-full h-96 bg-muted flex items-center justify-center rounded-t-lg">
                <FileText className="w-16 h-16 text-muted-foreground" />
              </div>
            )}
            <CardHeader>
              <CardTitle className="text-3xl">{post.title}</CardTitle>
              {post.tags && post.tags.length > 0 && (
                <div className="flex gap-2 mt-2">
                  {post.tags.map(tag => <Badge key={tag} variant="secondary">{tag}</Badge>)}
                </div>
              )}
            </CardHeader>
            <CardContent>
              <p className="text-lg">{post.description}</p>
              {post.link && (
                <a href={post.link} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline mt-4 inline-block">
                  Visit Link →
                </a>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
      <Footer />
    </div>
  );
}
