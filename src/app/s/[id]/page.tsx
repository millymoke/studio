"use client";

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Download, FileWarning, Loader2 } from 'lucide-react';

export default function SecureLinkPage() {
  const params = useParams();
  const id = params.id as string;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>('file');

  useEffect(() => {
    const fetchFile = async () => {
      try {
        const res = await fetch(`/api/vps/secure-link?id=${id}`);
        if (!res.ok) {
          setError('Link not found or already used');
          return;
        }
        
        const data = await res.json();
        setFileUrl(data.fileDataUri);
        setFileName(data.fileName || 'file');
      } catch (e) {
        setError('Failed to load file');
      } finally {
        setLoading(false);
      }
    };

    fetchFile();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  if (error || !fileUrl) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md">
          <CardHeader>
            <FileWarning className="w-12 h-12 text-destructive mb-2" />
            <CardTitle>Link Expired</CardTitle>
            <CardDescription>{error || 'This link has already been used or is invalid.'}</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="max-w-md w-full">
        <CardHeader>
          <CardTitle>Secure File</CardTitle>
          <CardDescription>This file will be deleted after download</CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild className="w-full">
            <a href={fileUrl} download={fileName}>
              <Download className="mr-2 h-4 w-4" />
              Download File
            </a>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
