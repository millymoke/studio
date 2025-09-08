
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
import { UPLOADS_STORAGE_KEY } from "@/lib/constants";
import type { Upload, UploadedFile, SerializableFile } from "@/lib/types";
import { readFileAsDataURL } from "@/lib/utils";


const formSchema = z.object({
  title: z.string().min(1, "Title is required."),
  content: z.string().min(1, "Article content cannot be empty."),
  coverPhoto: z.any().optional(),
  tags: z.string().optional(),
  link: z.string().url({ message: "Please enter a valid URL." }).optional().or(z.literal('')),
});

type FormValues = z.infer<typeof formSchema>;

export function ArticleForm() {
  const { toast } = useToast();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      content: "",
      tags: "",
      link: "",
    },
  });
  
  const coverPhotoRef = form.register("coverPhoto");

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
      let coverPhotoData: UploadedFile['coverPhoto'] | undefined = undefined;
      if (values.coverPhoto) {
        const coverFile = values.coverPhoto as File;
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
      
      const articleFile = new File([values.content], `${values.title.replace(/\s+/g, '-')}.txt`, { type: 'text/plain;charset=utf-8' });
      const articlePreview = await readFileAsDataURL(articleFile);

      const serializableArticleFile: SerializableFile = {
        name: articleFile.name,
        type: articleFile.type,
        size: articleFile.size,
      }

      const newArticle: Upload = {
        id: Date.now().toString(),
        type: 'article',
        title: values.title,
        description: values.content.substring(0, 100), // Use snippet of content as description
        tags: values.tags ? values.tags.split(',').map(t => t.trim()) : [],
        link: values.link || "",
        displayOption: 'individual',
        files: [
            {
                file: serializableArticleFile,
                preview: articlePreview,
                coverPhoto: coverPhotoData,
            }
        ]
      }

      const existingUploads = JSON.parse(localStorage.getItem(UPLOADS_STORAGE_KEY) || '[]') as Upload[];
      localStorage.setItem(UPLOADS_STORAGE_KEY, JSON.stringify([newArticle, ...existingUploads]));

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
                <Input placeholder="My Awesome Article" {...field} />
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
                <Textarea placeholder="Write your article here..." {...field} rows={10} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormItem>
            <FormLabel>Cover Photo (Optional)</FormLabel>
            <FormControl>
                <Input type="file" accept="image/*" {...coverPhotoRef} onChange={handleCoverPhotoChange} className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"/>
            </FormControl>
            <FormDescription>Upload a cover photo for your article.</FormDescription>
            <FormMessage />
        </FormItem>


        {coverPreview && (
            <div className="w-full">
                <Image src={coverPreview} alt="Cover preview" width={200} height={120} className="rounded-md object-cover"/>
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
              <FormDescription>Comma-separated tags to help others find your article.</FormDescription>
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
               <FormDescription>Add an external link to your article.</FormDescription>
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
          ) : "Publish Article"}
        </Button>
      </form>
    </Form>
  );
}
    
    

    