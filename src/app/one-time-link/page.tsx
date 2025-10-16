
import Header from '@/components/header';
import Footer from '@/components/footer';
import Protected from '@/components/protected';
import { OneTimeLinkForm } from '@/components/one-time-link-form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Lock } from 'lucide-react';

export default function OneTimeLinkPage() {
  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Header />
      <main className="flex-1 flex items-center justify-center py-12 px-4">
        <Protected>
        <Card className="w-full max-w-lg">
          <CardHeader>
            <div className="flex items-center gap-3">
              <Lock className="w-8 h-8 text-primary" />
              <div>
                <CardTitle className="text-2xl">Secure One-Time Link</CardTitle>
                <CardDescription>
                  Share a file with a secure, self-destructing link.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <OneTimeLinkForm />
          </CardContent>
        </Card>
        </Protected>
      </main>
      <Footer />
    </div>
  );
}
