
import Header from '@/components/header';
import Footer from '@/components/footer';
import Protected from '@/components/protected';
import { UploadForm } from '@/components/upload-form';
import { ArticleForm } from '@/components/article-form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { UploadCloud, FileText } from 'lucide-react';

export default function UploadPage() {
  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Header />
      <main className="flex-1 flex items-center justify-center py-12 px-4">
        <Protected>
        <Card className="w-full max-w-2xl">
           <CardHeader>
            <div className="flex items-center gap-3">
              <UploadCloud className="w-8 h-8 text-primary" />
              <div>
                <CardTitle className="text-2xl">Create a Post</CardTitle>
                <CardDescription>
                  Share your images, documents, videos and articles.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="upload">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="upload">
                  <UploadCloud className="mr-2 h-4 w-4" />
                  Upload Files
                </TabsTrigger>
                <TabsTrigger value="article">
                  <FileText className="mr-2 h-4 w-4" />
                  Write Article
                </TabsTrigger>
              </TabsList>
              <TabsContent value="upload" className="pt-6">
                <UploadForm />
              </TabsContent>
              <TabsContent value="article" className="pt-6">
                <ArticleForm />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
        </Protected>
      </main>
      <Footer />
    </div>
  );
}
