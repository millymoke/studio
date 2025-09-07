
import Header from '@/components/header';
import Footer from '@/components/footer';
import { UploadForm } from '@/components/upload-form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { UploadCloud } from 'lucide-react';

export default function UploadPage() {
  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Header />
      <main className="flex-1 flex items-center justify-center py-12 px-4">
        <Card className="w-full max-w-lg">
          <CardHeader>
            <div className="flex items-center gap-3">
              <UploadCloud className="w-8 h-8 text-primary" />
              <div>
                <CardTitle className="text-2xl">Upload a File</CardTitle>
                <CardDescription>
                  Share your files with the world.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <UploadForm />
          </CardContent>
        </Card>
      </main>
      <Footer />
    </div>
  );
}
