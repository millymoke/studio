"use client";

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { FileText, Download, ExternalLink, FileSpreadsheet, FileType } from 'lucide-react';
import { cn } from '@/lib/utils';

interface OfficeDocsThumbnailProps {
  url: string;
  fileName?: string;
  fileType?: string;
  className?: string;
  onClick?: () => void;
}

export function OfficeDocsThumbnail({ url, fileName = 'document', fileType, className, onClick }: OfficeDocsThumbnailProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);

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
    const generateThumbnail = async () => {
      try {
        setLoading(true);
        setError(null);

        // For now, we'll create a visual representation since we can't easily generate thumbnails
        // from Office documents without server-side processing
        await new Promise(resolve => setTimeout(resolve, 500)); // Simulate loading
        
        // Create a data URL for a document preview
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        if (!ctx) {
          throw new Error('Could not get canvas context');
        }
        
        // Set canvas size
        canvas.width = 300;
        canvas.height = 400;
        
        // Create gradient background
        const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
        gradient.addColorStop(0, '#f8fafc');
        gradient.addColorStop(1, '#e2e8f0');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Add document border
        ctx.strokeStyle = '#cbd5e1';
        ctx.lineWidth = 2;
        ctx.strokeRect(10, 10, canvas.width - 20, canvas.height - 20);
        
        // Add document content lines
        ctx.strokeStyle = '#94a3b8';
        ctx.lineWidth = 1;
        
        // Title line
        ctx.beginPath();
        ctx.moveTo(30, 60);
        ctx.lineTo(canvas.width - 30, 60);
        ctx.stroke();
        
        // Content lines
        for (let i = 0; i < 8; i++) {
          const y = 80 + (i * 25);
          ctx.beginPath();
          ctx.moveTo(30, y);
          ctx.lineTo(canvas.width - 30, y);
          ctx.stroke();
        }
        
        // Add file type specific styling
        const docType = getDocumentType(fileName, fileType);
        const colors = getDocumentColors(docType);
        
        // Add colored header
        ctx.fillStyle = colors.primary;
        ctx.fillRect(10, 10, canvas.width - 20, 40);
        
        // Add file icon
        ctx.fillStyle = 'white';
        ctx.font = 'bold 16px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(getDocumentIcon(docType), canvas.width / 2, 35);
        
        // Add filename
        ctx.fillStyle = '#1e293b';
        ctx.font = '12px Arial';
        ctx.textAlign = 'left';
        const displayName = fileName.length > 20 ? fileName.substring(0, 17) + '...' : fileName;
        ctx.fillText(displayName, 30, canvas.height - 20);
        
        // Convert to data URL
        const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
        setThumbnailUrl(dataUrl);

      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to generate thumbnail');
      } finally {
        setLoading(false);
      }
    };

    if (url && fileName) {
      generateThumbnail();
    }
  }, [url, fileName, fileType]);

  const getDocumentType = (fileName: string, fileType?: string): string => {
    const name = fileName.toLowerCase();
    const type = fileType?.toLowerCase() || '';
    
    if (name.includes('.xlsx') || name.includes('.xls') || type.includes('spreadsheet') || type.includes('excel')) {
      return 'excel';
    } else if (name.includes('.docx') || name.includes('.doc') || type.includes('document') || type.includes('word')) {
      return 'word';
    } else if (name.includes('.pptx') || name.includes('.ppt') || type.includes('presentation') || type.includes('powerpoint')) {
      return 'powerpoint';
    }
    return 'document';
  };

  const getDocumentColors = (docType: string) => {
    switch (docType) {
      case 'excel':
        return { primary: '#217346', secondary: '#1e5f3a' };
      case 'word':
        return { primary: '#2b579a', secondary: '#1e3a8a' };
      case 'powerpoint':
        return { primary: '#d24726', secondary: '#b91c1c' };
      default:
        return { primary: '#6b7280', secondary: '#4b5563' };
    }
  };

  const getDocumentIcon = (docType: string): string => {
    switch (docType) {
      case 'excel':
        return '📊';
      case 'word':
        return '📝';
      default:
        return '📄';
    }
  };

  const getDocumentIconComponent = (docType: string) => {
    switch (docType) {
      case 'excel':
        return <FileSpreadsheet className="h-8 w-8" />;
      case 'word':
        return <FileType className="h-8 w-8" />;
      default:
        return <FileText className="h-8 w-8" />;
    }
  };

  const docType = getDocumentType(fileName, fileType);
  const colors = getDocumentColors(docType);

  if (loading) {
    return (
      <div className={cn("relative w-full h-48 bg-muted rounded-lg flex items-center justify-center", className)}>
        <div className="flex flex-col items-center gap-2">
          {getDocumentIconComponent(docType)}
          <p className="text-sm text-muted-foreground">Loading document...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={cn("relative w-full h-48 bg-muted rounded-lg flex items-center justify-center", className)}>
        <div className="flex flex-col items-center gap-2">
          {getDocumentIconComponent(docType)}
          <p className="text-sm text-muted-foreground">Document Preview</p>
          <p className="text-xs text-muted-foreground">{fileName}</p>
        </div>
      </div>
    );
  }

  return (
    <div 
      className={cn("relative w-full h-48 bg-muted rounded-lg overflow-hidden cursor-pointer group", className)}
      onClick={onClick}
    >
      {/* Document Thumbnail */}
      {thumbnailUrl ? (
        <div className="relative w-full h-full">
          <img
            src={thumbnailUrl}
            alt={`Document preview: ${fileName}`}
            className="w-full h-full object-cover"
          />
          
          {/* Overlay with document icon and filename */}
          <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
            <div className="text-center text-white flex flex-col items-center">
              {getDocumentIconComponent(docType)}
              <p className="text-sm font-medium truncate px-2 mt-2">{fileName}</p>
            </div>
          </div>
          
          {/* Document Type Badge */}
          <div 
            className="absolute top-2 left-2 text-white text-xs px-2 py-1 rounded font-medium"
            style={{ backgroundColor: colors.primary }}
          >
            {docType.toUpperCase()}
          </div>
        </div>
      ) : (
        /* Fallback when thumbnail generation fails */
        <div className="w-full h-full flex items-center justify-center">
          <div className="text-center">
            {getDocumentIconComponent(docType)}
            <p className="text-sm font-medium text-foreground mt-2">{fileName}</p>
            <p className="text-xs text-muted-foreground">{docType.toUpperCase()} Document</p>
          </div>
        </div>
      )}
      
      {/* Action buttons on hover */}
      <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex gap-1">
        <Button
          size="sm"
          variant="secondary"
          className="h-8 w-8 p-0"
          onClick={(e) => {
            e.stopPropagation();
            window.open(url, '_blank');
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
            const a = document.createElement('a');
            a.href = url;
            a.download = fileName;
            a.click();
          }}
        >
          <Download className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
