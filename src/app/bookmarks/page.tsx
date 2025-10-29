"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '@/components/auth-provider';
import { getBookmarkedPosts } from '@/lib/local-storage-utils';
import { getUploadById } from '@/lib/firebase-utils';
import type { Upload } from '@/lib/types';
import Header from '@/components/header';
import Footer from '@/components/footer';
import Protected from '@/components/protected';
import { Card, CardContent } from '@/components/ui/card';
import { Bookmark } from 'lucide-react';

export default function BookmarksPage() {
  const { user } = useAuth();
  const [bookmarks, setBookmarks] = useState<Upload[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadBookmarks = async () => {
      if (!user) return;
      
      const ids = await getBookmarkedPosts(user.uid);
      const posts: Upload[] = [];
      
      for (const id of ids) {
        const post = await getUploadById(id);
        if (post) posts.push(post);
      }
      
      setBookmarks(posts);
      setLoading(false);
    };

    loadBookmarks();
  }, [user]);

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Header />
      <main className="flex-1 py-12 px-4">
        <Protected>
          <div className="container mx-auto max-w-6xl">
            <div className="flex items-center gap-3 mb-8">
              <Bookmark className="w-8 h-8 text-primary" />
              <h1 className="text-3xl font-bold">Bookmarks</h1>
            </div>

            {loading && <p>Loading...</p>}
            
            {!loading && bookmarks.length === 0 && (
              <p className="text-muted-foreground">No bookmarks yet.</p>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
              {bookmarks.map(upload => (
                <Card key={upload.id}>
                  <CardContent className="p-0">
                    <div className="aspect-[4/5] w-full relative rounded-t-lg overflow-hidden bg-muted">
                      {upload.files[0]?.preview ? (
                        <img src={upload.files[0].preview} alt={upload.title} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                          {upload.type}
                        </div>
                      )}
                    </div>
                    <div className="p-3">
                      <p className="font-semibold truncate">{upload.title}</p>
                      <p className="text-sm text-muted-foreground truncate">{upload.description}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </Protected>
      </main>
      <Footer />
    </div>
  );
}
