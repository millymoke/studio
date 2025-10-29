"use client";

import React, { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { searchContent } from '@/lib/firebase-utils';
import Image from 'next/image';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';

interface Hit {
  id: string;
  title: string;
  description: string;
  type: string;
  cover?: string;
  source: 'post' | 'article';
}

function SearchPageInner() {
  const params = useSearchParams();
  const q = (params.get('q') || '').toLowerCase();
  const [hits, setHits] = useState<Hit[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const run = async () => {
      if (!q) { setHits([]); return; }
      setLoading(true);
      try {
        const results = await searchContent(q, 25);
        setHits(results);
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [q]);

  return (
    <div className="container mx-auto px-4 py-10">
      <h1 className="text-2xl font-bold mb-6">Search results for "{q}"</h1>
      {loading && <p>Searching...</p>}
      {!loading && hits.length === 0 && <p className="text-muted-foreground">No results.</p>}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
        {hits.map(hit => (
          <Card key={hit.id}>
            <CardContent className="p-0">
              <div className="aspect-[4/5] w-full relative rounded-t-lg overflow-hidden bg-muted">
                {hit.cover ? (
                  <img src={hit.cover} alt={hit.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-sm text-muted-foreground">{hit.type}</div>
                )}
              </div>
              <div className="p-3">
                <p className="font-semibold truncate">{hit.title}</p>
                <p className="text-sm text-muted-foreground line-clamp-2">{hit.description}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="container mx-auto px-4 py-10">Loading search…</div>}>
      <SearchPageInner />
    </Suspense>
  );
}


