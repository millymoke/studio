"use client";

import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Check, Search, ArrowRight } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import Header from '@/components/header';
import Footer from '@/components/footer';

export default function Home() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      <Header />
      <main className="flex-1">
        <section className="py-20 md:py-32 text-center">
          <div className="container mx-auto px-4">
            <h1 className="text-4xl md:text-6xl font-bold font-headline tracking-tight mb-6">
              Share Without Limits
            </h1>
            <div className="max-w-3xl mx-auto mb-8">
                <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-muted-foreground">
                    <span className="flex items-center gap-2"><Check className="text-primary w-5 h-5" /> Unlimited Tagging</span>
                    <span className="flex items-center gap-2"><Check className="text-primary w-5 h-5" /> High-Resolution Storage</span>
                    <span className="flex items-center gap-2"><Check className="text-primary w-5 h-5" /> Documents & Articles</span>
                    <span className="flex items-center gap-2"><Check className="text-primary w-5 h-5" /> Create Shareable Links</span>
                    <span className="flex items-center gap-2"><Check className="text-primary w-5 h-5" /> Video Uploads</span>
                </div>
            </div>
            <div className="max-w-md mx-auto">
              <div className="relative">
                <Input value={query} onChange={(e) => setQuery(e.target.value)} type="search" placeholder="Search titles, tags..." className="w-full pl-10 pr-20 h-12 text-base" />
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Button type="button" onClick={() => router.push(`/search?q=${encodeURIComponent(query)}`)} className="absolute right-1 top-1/2 -translate-y-1/2 h-10">Search</Button>
              </div>
            </div>
          </div>
        </section>

        <section className="py-16 bg-card">
          <div className="container mx-auto px-4 grid md:grid-cols-2 gap-12 items-center">
            <div className="text-center md:text-left">
              <h2 className="text-3xl md:text-4xl font-bold font-headline mb-4">Endless Possibilities</h2>
              <p className="text-lg text-muted-foreground mb-6">
                Upload images, videos, documents, and articles with unlimited custom tags. No restrictions, maximum resolution.
              </p>
              <Button asChild variant="link" className="p-0 text-base">
                <Link href="/signup">Get Started <ArrowRight className="ml-2 w-4 h-4" /></Link>
              </Button>
            </div>
            <div className="w-full h-auto aspect-video relative rounded-lg overflow-hidden shadow-lg">
              <Image src="/photo1.jpg" alt="tree" data-ai-hint="tree" fill className="object-cover" />
            </div>
          </div>
        </section>

        <section className="py-16">
          <div className="container mx-auto px-4 grid md:grid-cols-2 gap-12 items-center">
            <div className="w-full h-auto aspect-video relative rounded-lg overflow-hidden shadow-lg order-last md:order-first">
              <Image src="/photo2.jpg" alt="Ocean waves" data-ai-hint="ocean waves" fill className="object-cover object-top" />
            </div>
             <div className="text-center md:text-left">
              <h2 className="text-3xl md:text-4xl font-bold font-headline mb-4">Discover Content</h2>
              <p className="text-lg text-muted-foreground mb-6">
                Search across titles, descriptions, user profiles, and tagged topics.
              </p>
              <Button asChild variant="link" className="p-0 text-base">
                <Link href="#">Explore Now <ArrowRight className="ml-2 w-4 h-4" /></Link>
              </Button>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
