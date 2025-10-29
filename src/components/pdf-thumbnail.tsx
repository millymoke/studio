"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { FileText, Download, ExternalLink, Play } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PdfThumbnailProps {
  url: string;
  fileName?: string;
  className?: string;
  onClick?: () => void;
}

export function PdfThumbnail({ url, fileName = 'document.pdf', className, onClick }: PdfThumbnailProps) {
  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pdfRef = useRef<any>(null);

  // Detect mobile device
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768 || /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent));
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    const fetchPdf = async () => {
      try {
        setLoading(true);
        setError(null);
        
        
        // Use the utility function to fetch blob from Firebase Storage
        const { fetchFileBlobFromStorage } = await import('@/lib/firebase-utils');
        const blob = await fetchFileBlobFromStorage(url);
        
        // Create object URL for download
        const objectUrl = URL.createObjectURL(blob);
        setPdfBlob(blob);
        setPdfUrl(objectUrl);
        
        // Generate thumbnail
        await generateThumbnail(blob);
        
        
      } catch (err) {
        console.error('🚀 ~ PdfThumbnail ~ error fetching PDF:', err);
        // Silently fail and show fallback UI
        setError(null);
      } finally {
        setLoading(false);
      }
    };

    if (url) {
      fetchPdf();
    }

    // Cleanup object URL on unmount
    return () => {
      if (pdfUrl) {
        URL.revokeObjectURL(pdfUrl);
      }
      if (thumbnailUrl) {
        URL.revokeObjectURL(thumbnailUrl);
      }
    };
  }, [url]);

  const generateThumbnail = async (blob: Blob) => {
    try {
      // Convert blob to ArrayBuffer for PDF.js
      const arrayBuffer = await blob.arrayBuffer();
      
      // Dynamically import PDF.js
      const pdfjsLib = await import('pdfjs-dist');
      
      // Set worker source
      try {
        pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';
      } catch (error) {
        pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/5.4.296/pdf.worker.min.js`;
      }
      
      // Load PDF
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      pdfRef.current = pdf;
      
      // Render first page as thumbnail
      const page = await pdf.getPage(1);
      const canvas = canvasRef.current;
      
      if (!canvas) return;
      
      const context = canvas.getContext('2d');
      if (!context) return;

      // Set thumbnail size (smaller for card display)
      const thumbnailScale = 0.5; // Smaller scale for thumbnail
      const viewport = page.getViewport({ scale: thumbnailScale });
      
      canvas.height = viewport.height;
      canvas.width = viewport.width;

      const renderContext = {
        canvas: canvas,
        canvasContext: context,
        viewport: viewport
      };

      await page.render(renderContext).promise;
      
      // Convert canvas to data URL for thumbnail
      const thumbnailDataUrl = canvas.toDataURL('image/jpeg', 0.8);
      setThumbnailUrl(thumbnailDataUrl);
      
    } catch (err) {
      console.error('🚀 ~ PdfThumbnail ~ error generating thumbnail:', err);
      setError('Failed to generate PDF thumbnail');
    }
  };

  if (loading) {
    return (
      <div className={cn("relative w-full h-48 bg-muted rounded-lg flex items-center justify-center", className)}>
        <div className="flex flex-col items-center gap-2">
          <FileText className="h-8 w-8 text-muted-foreground animate-pulse" />
          <p className="text-sm text-muted-foreground">Loading PDF...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={cn("relative w-full h-48 bg-muted rounded-lg flex items-center justify-center", className)}>
        <div className="flex flex-col items-center gap-2">
          <FileText className="h-8 w-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">PDF Preview</p>
          <p className="text-xs text-muted-foreground">{fileName}</p>
        </div>
      </div>
    );
  }

  const handleClick = () => {
    // Always open the dedicated viewer page for a full-width/height experience
    const viewerUrl = `/pdf-viewer?url=${encodeURIComponent(url)}&fileName=${encodeURIComponent(fileName)}`;
    const target = isMobile ? '_parent' : '_parent';
    window.open(viewerUrl, target);
  };

  return (
    <div 
      className={cn("relative w-full h-48 bg-muted rounded-lg overflow-hidden cursor-pointer group", className)}
      onClick={handleClick}
    >
      {/* PDF Thumbnail */}
      {thumbnailUrl ? (
        <div className="relative w-full h-full">
          <img
            src={thumbnailUrl}
            alt={`PDF preview: ${fileName}`}
            className="w-full h-full object-cover"
          />
          
          {/* Overlay with PDF icon and filename */}
          <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
            <div className="text-center text-white">
              <FileText className="h-8 w-8 mx-auto mb-2" />
              <p className="text-sm font-medium truncate px-2">{fileName}</p>
            </div>
          </div>
          
          {/* PDF Badge */}
          <div className="absolute top-2 left-2 bg-red-500 text-white text-xs px-2 py-1 rounded">
            PDF
          </div>

          {/* Mobile Full Page Hint */}
          {isMobile && (
            <div className="absolute bottom-2 left-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
              Tap for full page
            </div>
          )}
        </div>
      ) : (
        /* Fallback when thumbnail generation fails */
        <div className="w-full h-full flex items-center justify-center">
          <div className="text-center">
            <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm font-medium text-foreground">{fileName}</p>
            <p className="text-xs text-muted-foreground">PDF Document</p>
          </div>
        </div>
      )}
      
      {/* Hidden canvas for thumbnail generation */}
      <canvas ref={canvasRef} style={{ display: 'none' }} />
      
      {/* Action buttons on hover */}
      <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex gap-1">
        <Button
          size="sm"
          variant="secondary"
          className="h-8 w-8 p-0"
          onClick={(e) => {
            e.stopPropagation();
            if (pdfUrl) {
              window.open(pdfUrl, '_blank');
            }
          }}
        >
          <ExternalLink className="h-4 w-4" />
        </Button>
        <Button
          size="sm"
          variant="secondary"
          className="h-8 w-8 p-0"
          onClick={(e) => {
            e.stopPropagation();
            if (pdfUrl) {
              const a = document.createElement('a');
              a.href = pdfUrl;
              a.download = fileName;
              a.click();
            }
          }}
        >
          <Download className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
