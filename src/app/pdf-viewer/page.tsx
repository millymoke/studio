"use client";

import React, { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { PdfViewer } from '@/components/pdf-viewer';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

function PdfViewerInner() {
  const searchParams = useSearchParams();
  const url = searchParams.get('url');
  const fileName = searchParams.get('fileName') || 'document.pdf';

  if (!url) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">PDF Not Found</h1>
          <p className="text-muted-foreground mb-4">No PDF URL provided</p>
          <Button asChild>
            <Link href="/profile">
              <ArrowLeft className="ml-1 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 items-center">
          <Button asChild variant="ghost" size="sm">
            <Link href="/profile">
              <ArrowLeft className="ml-1 h-4 w-4" />
            </Link>
          </Button>
          <div className="text-sm font-medium truncate">
            {fileName}
          </div>
        </div>
      </div>

      {/* PDF Viewer */}
      <div className="h-[calc(100vh-3.5rem)]">
        <PdfViewer 
          url={url} 
          fileName={fileName} 
          className="w-full h-full" 
        />
      </div>
    </div>
  );
}

export default function PdfViewerPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading…</div>}>
      <PdfViewerInner />
    </Suspense>
  );
}
