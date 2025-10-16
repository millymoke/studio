"use client";
import { SignupForm } from '@/components/auth-forms';
import Header from '@/components/header';
import Footer from '@/components/footer';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/components/auth-provider';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function SignupPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  useEffect(() => {
    if (!loading && user) {
      router.replace('/profile');
    }
  }, [loading, user, router]);
  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Header />
      <main className="flex-1 flex items-center justify-center py-12 px-4">
          <div className="w-full max-w-md space-y-6">
            <div className="text-center">
                <h1 className="text-3xl font-bold tracking-tight">Create your Share Space Account</h1>
                <p className="text-muted-foreground mt-2">
                    Already have an account?{' '}
                    <Button variant="link" asChild className="p-0">
                        <Link href="/login">Sign In</Link>
                    </Button>
                </p>
            </div>
            <SignupForm />
          </div>
      </main>
      <Footer />
    </div>
  );
}
