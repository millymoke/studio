
"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useToast } from "@/hooks/use-toast";
import Image from 'next/image';
import { useRouter } from 'next/navigation';

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";
// No local storage needed - all data stored in Firebase
import type { Upload, UploadedFile, SerializableFile } from "@/lib/types";
import { readFileAsDataURL } from "@/lib/utils";
// No IndexedDB needed - all files stored in Firebase Storage
import { useAuth } from '@/components/auth-provider';
import { createArticle } from "@/lib/firebase-utils";
import { saveFilesToDb } from "@/lib/db";
import { UPLOADS_STORAGE_KEY } from "@/lib/constants";

const formSchema = z.object({
  title: z.string().min(1, "Title is required."),
  content: z.string().min(1, "Article content cannot be empty."),
  coverPhoto: z.any().optional(),
  altText: z.string().optional(),
  tags: z.string().optional(),
  link: z.string().url({ message: "Please enter a valid URL." }).optional().or(z.literal('')),
});

type FormValues = z.infer<typeof formSchema>;

export function ArticleForm() {
  const { toast } = useToast();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const { user } = useAuth();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      content: "",
      altText: "",
      tags: "",
      link: "",
    },
  });
  
  // const coverPhotoRef = form.register("coverPhoto");

  const handleCoverPhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const preview = await readFileAsDataURL(file);
      form.setValue('coverPhoto', file); // Store the file object
      setCoverPreview(preview);
    } else {
      form.setValue('coverPhoto', undefined);
      setCoverPreview(null);
    }
  };


  async function onSubmit(values: FormValues) {
    setIsLoading(true);

    try {
      if (!user) {
      let coverPhotoData: UploadedFile['coverPhoto'] | undefined = undefined;
        const coverFile = values.coverPhoto as File | undefined;
    
        
      
      if (coverFile instanceof File) {
         const serializableCoverFile: SerializableFile = {
            name: coverFile.name,
            type: coverFile.type,
            size: coverFile.size,
         };
         coverPhotoData = {
            file: serializableCoverFile,
            preview: await readFileAsDataURL(coverFile),
         };
      }
      
      const articleBlob = new Blob([values.content], { type: 'text/plain;charset=utf-8' });
      const articleFile = new File([articleBlob], `${values.title.replace(/\s+/g, '-')}.txt`, { type: 'text/plain;charset=utf-8' });

      const serializableArticleFile: SerializableFile = {
        name: articleFile.name,
        type: articleFile.type,
        size: articleFile.size,
      }
      
      const newArticleId = Date.now().toString();

      const newArticle: Upload = {
        id: newArticleId,
        uid: "",
        type: 'article',
        title: values.title,
        description: values.content.substring(0, 100), // Use snippet of content as description
        tags: values.tags ? values.tags.split(',').map(t => t.trim()) : [],
        link: values.link || "",
        displayOption: 'individual',
        files: [
            {
                file: serializableArticleFile,
                preview: '', // Preview for text article isn't stored in metadata
                coverPhoto: coverPhotoData,
                objectPosition: 'center',
            }
        ]
      }
      
      // Save the actual article File object to IndexedDB
      await saveFilesToDb(newArticleId, [articleFile]);

      // Save the metadata to localStorage
      const existingUploads = JSON.parse(localStorage.getItem(UPLOADS_STORAGE_KEY) || '[]') as Upload[];
      localStorage.setItem(UPLOADS_STORAGE_KEY, JSON.stringify([newArticle, ...existingUploads]));

        toast({ variant: "destructive", title: "Sign in required", description: "Please log in to publish an article." });
        router.push('/login');
        return;
      } else {
        // Handle both File and FileList cases
        let coverFile: File | undefined;
        if (values.coverPhoto instanceof FileList) {
          coverFile = values.coverPhoto[0] || undefined;
        } else if (values.coverPhoto instanceof File) {
          coverFile = values.coverPhoto;
        } else {
          coverFile = undefined;
        }
        
        
        const article = await createArticle({
          uid: user.uid,
          title: values.title,
          content: values.content,
          tags: values.tags ? values.tags.split(',').map(t => t.trim()) : [],
          link: values.link || '',
          coverPhoto: coverFile ? {
            file: coverFile,
            preview: coverPreview || '',
          } : undefined,
          altText: values.altText,
        });
      }

      toast({
        title: "Article Published!",
        description: "Your article has been successfully published.",
      });

      form.reset();
      setCoverPreview(null);
      router.push('/profile');

    } catch (error) {
        console.error("Failed to submit article", error)
        toast({
            variant: "destructive",
            title: "Uh oh! Something went wrong.",
            description: "There was a problem saving your article.",
        });
    } finally {
        setIsLoading(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Article Title</FormLabel>
              <FormControl>
                <Input placeholder="My Article" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="content"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Content</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Write your article here..."
                  {...field}
                  rows={10}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="coverPhoto"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Cover Photo (Optional)</FormLabel>
              <FormControl>
                <Input
                  type="file"
                  accept="image/*"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const preview = await readFileAsDataURL(file);
                      setCoverPreview(preview);
                      field.onChange(file); // ✅ update React Hook Form state
                    } else {
                      setCoverPreview(null);
                      field.onChange(undefined);
                    }
                  }}
                  className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
                />
              </FormControl>
              <FormDescription>
                Upload a cover photo for your article.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {coverPreview && (
          <div className="w-full space-y-2">
            <img
              src={coverPreview}
              alt="Cover preview"
              className="w-[200px] h-[120px] rounded-md object-cover"
            />
            <FormField
              control={form.control}
              name="altText"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Input placeholder="Alt text for cover photo" {...field} />
                  </FormControl>
                  <FormDescription className="text-xs">
                    Describe the cover photo for accessibility.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        )}

        <FormField
          control={form.control}
          name="tags"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Tags</FormLabel>
              <FormControl>
                <Input placeholder="writing, travel, tech" {...field} />
              </FormControl>
              <FormDescription>
                Comma-separated tags to help others find your article.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="link"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Shareable Link (Optional)</FormLabel>
              <FormControl>
                <Input placeholder="https://example.com" {...field} />
              </FormControl>
              <FormDescription>
                Add an external link to your article.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Publishing...
            </>
          ) : (
            "Publish Article"
          )}
        </Button>
      </form>
    </Form>
  );
}
