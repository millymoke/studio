"use client";

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Download, AlertCircle, Loader2, ZoomIn, ZoomOut, ExternalLink, ChevronUp, ChevronDown } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface PdfViewerProps {
  url: string;
  fileName?: string;
  className?: string;
}

export function PdfViewer({ url, fileName = 'document.pdf', className }: PdfViewerProps) {
  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pdfData, setPdfData] = useState<ArrayBuffer | null>(null);
  const [totalPages, setTotalPages] = useState(0);
  const [baseScale, setBaseScale] = useState(1.0); // fit-to-width baseline per container
  const [zoomMultiplier, setZoomMultiplier] = useState(1.0); // user-controlled zoom
  const [isMobile, setIsMobile] = useState(false);
  const [currentVisiblePage, setCurrentVisiblePage] = useState(1);

  const containerRef = useRef<HTMLDivElement>(null);
  const pdfRef = useRef<any>(null);
  const renderTasksRef = useRef<Map<number, any>>(new Map());
  const canvasRefs = useRef<Map<number, HTMLCanvasElement>>(new Map());
  const pageHeightsRef = useRef<Map<number, number>>(new Map());
  const [isToolbarVisible, setIsToolbarVisible] = useState(true);

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

        // Convert blob to ArrayBuffer for PDF.js
        const arrayBuffer = await blob.arrayBuffer();
        setPdfData(arrayBuffer);

        // Create object URL for download
        const objectUrl = URL.createObjectURL(blob);
        setPdfBlob(blob);
        setPdfUrl(objectUrl);

      } catch (err) {
        console.error('🚀 ~ PdfViewer ~ error fetching PDF:', err);
        setError(err instanceof Error ? err.message : 'Failed to load PDF');
      } finally {
        setLoading(false);
      }
    };

    if (url) {
      fetchPdf();
    }

    // Cleanup object URL and render tasks on unmount
    return () => {
      if (pdfUrl) {
        URL.revokeObjectURL(pdfUrl);
      }
      // cancel any ongoing render tasks
      renderTasksRef.current.forEach(task => {
        try { task?.cancel?.(); } catch { }
      });
      renderTasksRef.current.clear();
    };
  }, [url]);

  useEffect(() => {
    if (!pdfData) return;

    const loadPdf = async () => {
      try {
        // Dynamically import PDF.js
        const pdfjsLib = await import('pdfjs-dist');

        // Set worker source - try local worker first, then fallback to CDN
        try {
          // Try local worker first (same version as installed package)
          pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';
        } catch (error) {
          // Fallback to CDN with matching version
          pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/5.4.296/pdf.worker.min.js`;
        }

        // Load PDF
        const pdf = await pdfjsLib.getDocument({ data: pdfData }).promise;
        pdfRef.current = pdf;
        setTotalPages(pdf.numPages);

        // compute initial fit-to-width base scale using first page and container width
        await computeBaseScale();

      } catch (err) {
        setError('Failed to load PDF with PDF.js');
      }
    };

    loadPdf();
  }, [pdfData, isMobile]);

  const getEffectiveScale = useMemo(() => (baseScale * zoomMultiplier), [baseScale, zoomMultiplier]);

  const computeBaseScale = async () => {
    if (!pdfRef.current || !containerRef.current) return;
    try {
      const page = await pdfRef.current.getPage(1);
      const unscaled = page.getViewport({ scale: 1 });
      const containerWidth = containerRef.current.clientWidth;
      if (containerWidth > 0) {
        const padding = 0; // container padding handled by Tailwind classes
        const width = containerWidth - padding;
        const newBase = Math.max(Math.min(width / unscaled.width, 3), 0.5);
        setBaseScale(newBase);
      }
    } catch { }
  };

  const renderPageToCanvas = async (pageNum: number) => {
    if (!pdfRef.current) return;
    const canvas = canvasRefs.current.get(pageNum);
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    // cancel any ongoing task for this page
    const existingTask = renderTasksRef.current.get(pageNum);
    if (existingTask) {
      try { existingTask.cancel(); } catch { }
      renderTasksRef.current.delete(pageNum);
    }

    const page = await pdfRef.current.getPage(pageNum);
    const viewport = page.getViewport({ scale: getEffectiveScale });

    // Render at devicePixelRatio for crisp text, but keep CSS size matching viewport
    const devicePixelRatio = window.devicePixelRatio || 1;
    const outputScale = Math.max(devicePixelRatio, 1);
    const renderWidth = Math.floor(viewport.width * outputScale);
    const renderHeight = Math.floor(viewport.height * outputScale);

    // Set backing store size
    canvas.width = renderWidth;
    canvas.height = renderHeight;
    // Set displayed size
    (canvas.style as any).width = `${Math.floor(viewport.width)}px`;
    (canvas.style as any).height = `${Math.floor(viewport.height)}px`;
    pageHeightsRef.current.set(pageNum, viewport.height);

    const transform = outputScale !== 1 ? [outputScale, 0, 0, outputScale, 0, 0] : undefined;
    const task = page.render({ canvasContext: ctx, viewport, transform });
    renderTasksRef.current.set(pageNum, task);
    try {
      await task.promise;
    } catch (err: any) {
      // Ignore cancellation errors from PDF.js when a render is superseded
      // by a new render (e.g., due to zooming or scrolling). Log others.
      if (!err || err.name !== 'RenderingCancelledException') {
        // eslint-disable-next-line no-console
        console.error('PDF page render failed:', err);
      }
    } finally {
      renderTasksRef.current.delete(pageNum);
    }
  };

  // Re-render visible pages when zoom changes
  useEffect(() => {
    if (!pdfRef.current || totalPages === 0) return;
    const visible = getVisiblePages();
    visible.forEach(p => { void renderPageToCanvas(p); });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [getEffectiveScale]);

  const handleZoomIn = () => {
    setZoomMultiplier(prev => Math.min(prev + 0.25, 4.0));
  };

  const handleZoomOut = () => {
    setZoomMultiplier(prev => Math.max(prev - 0.25, 0.25));
  };

  const handleResetZoom = () => {
    setZoomMultiplier(1.0);
    void computeBaseScale();
  };

  // Observe pages to lazy render when entering viewport and update current visible page
  useEffect(() => {
    if (!containerRef.current || totalPages === 0) return;
    const container = containerRef.current;
    const options = { root: container, rootMargin: '100px', threshold: 0.01 };
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        const pageNumAttr = (entry.target as HTMLElement).dataset.page;
        const pageNum = pageNumAttr ? parseInt(pageNumAttr) : NaN;
        if (!pageNum || Number.isNaN(pageNum)) return;
        if (entry.isIntersecting) {
          void renderPageToCanvas(pageNum);
          // update current visible page (choose the smallest intersecting page)
          setCurrentVisiblePage(prev => Math.min(prev, pageNum) || pageNum);
        }
      });
    }, options);

    // observe all page containers
    const nodes = container.querySelectorAll('[data-page]');
    nodes.forEach(n => observer.observe(n));
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [totalPages, getEffectiveScale]);

  // Recompute base scale on resize to keep fit-to-width
  useEffect(() => {
    const onResize = () => { void computeBaseScale(); };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const toggleToolbar = () => {
    setIsToolbarVisible(v => !v);
  };

  // Helper to get visible pages within container viewport
  const getVisiblePages = (): number[] => {
    const container = containerRef.current;
    if (!container) return [];
    const rect = container.getBoundingClientRect();
    const candidates: number[] = [];
    for (let p = 1; p <= totalPages; p++) {
      const el = container.querySelector(`[data-page="${p}"]`) as HTMLElement | null;
      if (!el) continue;
      const r = el.getBoundingClientRect();
      if (r.bottom >= rect.top - 100 && r.top <= rect.bottom + 100) {
        candidates.push(p);
      }
    }
    return candidates;
  };

  if (loading) {
    return (
      <div className={className} style={{ width: '100%', height: '100%' }}>
        <div className="p-3 border-b flex items-center justify-between bg-card">
          <div className="text-sm truncate">{fileName}</div>
          <Button size="sm" variant="outline" disabled>
            <Download className="mr-2 h-4 w-4" /> Download
          </Button>
        </div>
        <div className="flex items-center justify-center h-full">
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="h-8 w-8 animate-spin" />
            <p className="text-sm text-muted-foreground">Loading PDF...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={className} style={{ width: '100%', height: '100%' }}>
        <div className="p-3 border-b flex items-center justify-between bg-card">
          <div className="text-sm truncate">{fileName}</div>
          <Button asChild size="sm" variant="outline">
            <a href={url} download={fileName}>
              <Download className="mr-2 h-4 w-4" /> Download
            </a>
          </Button>
        </div>
        <div className="flex items-center justify-center h-full p-4">
          <Alert className="max-w-md">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Failed to load PDF: {error}
              <br />
              <div className="flex gap-2 mt-2">
                <Button asChild variant="link" className="p-0 h-auto">
                  <a href={url} download={fileName} className="text-sm">
                    Download PDF
                  </a>
                </Button>
                <Button asChild variant="link" className="p-0 h-auto">
                  <a href={url} target="_blank" rel="noopener noreferrer" className="text-sm">
                    Open in new tab
                  </a>
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  if (!pdfData) {
    return (
      <div className={className} style={{ width: '100%', height: '100%' }}>
        <div className="p-3 border-b flex items-center justify-between bg-card">
          <div className="text-sm truncate">{fileName}</div>
          <Button asChild size="sm" variant="outline">
            <a href={url} download={fileName}>
              <Download className="mr-2 h-4 w-4" /> Download
            </a>
          </Button>
        </div>
        <div className="flex items-center justify-center h-full">
          <p className="text-sm text-muted-foreground">No PDF data available</p>
        </div>
      </div>
    );
  }

  // remove mobile tap-to-open behavior entirely per requirement

  return (
    <div
      className={className}
      style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}
    >
      {/* Toolbar: auto-hide on scroll with smooth transition */}
      <div
        className={
          `fixed sm:top-14 left-0 right-0 z-20 bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/70` +
          ` transition-all duration-300 will-change-transform` +
          (isToolbarVisible ? ` opacity-100 translate-y-0` : ` opacity-0 -translate-y-full pointer-events-none`)
        }
      >
        <div className="p-2 sm:p-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button asChild size="icon" variant="outline" className="sm:hidden h-8 w-8">
            <a href={pdfUrl || url} download={fileName} aria-label="Download">
              <Download className="h-4 w-4" />
            </a>
          </Button>
          <Button asChild size="sm" variant="outline" className="hidden sm:inline-flex">
            <a href={pdfUrl || url} download={fileName}>
              <Download className="mr-2 h-4 w-4" /> Download
            </a>
          </Button>
          <Button asChild size="sm" variant="outline" className="hidden sm:inline-flex">
            <a href={pdfUrl || url} target={"_blank"} rel={"noopener noreferrer"}>
              <ExternalLink className="mr-2 h-4 w-4" /> Open
            </a>
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            <Button size="icon" variant="outline" onClick={handleZoomOut} className="h-8 w-8">
              <ZoomOut className="h-4 w-4" />
            </Button>
            <span className="text-xs min-w-[46px] text-center">
              {Math.round(getEffectiveScale * 100)}%
            </span>
            <Button size="icon" variant="outline" onClick={handleZoomIn} className="h-8 w-8">
              <ZoomIn className="h-4 w-4" />
            </Button>
            <Button size="sm" variant="outline" onClick={handleResetZoom} className="h-8 px-2 text-xs">
              Reset
            </Button>
          </div>
        </div>
        </div>
      </div>

      {/* Toolbar toggle button */}
      <div className="fixed right-2 sm:right-4 top-2 sm:top-3 z-30">
        <Button size="icon" variant="default" className="h-8 w-8 rounded-full"
          onClick={toggleToolbar} aria-label="Toggle toolbar">
          {isToolbarVisible ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </Button>
      </div>

      {/* Pages container */}
      <div ref={containerRef} className="flex-1 overflow-auto bg-background px-2 sm:px-4 pb-4">
        <div className="inline-flex flex-col items-center gap-2 sm:gap-4" style={{ width: 'max-content' }}>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
            <div key={pageNum} data-page={pageNum} className="inline-flex justify-center">
              <canvas
                ref={(el) => {
                  if (el) canvasRefs.current.set(pageNum, el);
                  else canvasRefs.current.delete(pageNum);
                }}
                className="shadow-sm sm:shadow-lg border border-gray-300 bg-white block min-w-fit"
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}


