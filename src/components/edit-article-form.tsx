"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useState, useEffect } from "react";
import type { Upload } from "@/lib/types";
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
import { Trash2, Loader2 } from "lucide-react";
import { ScrollArea, ScrollBar } from "./ui/scroll-area";
import { fetchFileContentFromStorage } from "@/lib/firebase-utils";

const formSchema = z.object({
  title: z.string().min(1, "Title cannot be empty."),
  content: z.string().min(1, "Content cannot be empty."),
  altText: z.string().optional(),
  link: z.string().url({ message: "Please enter a valid URL." }).optional().or(z.literal('')),
  tags: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface EditArticleFormProps {
    article: Upload;
    onSave: (updatedArticle: Upload) => void;
    onDeleteRequest: () => void;
}

export function EditArticleForm({ article, onSave, onDeleteRequest }: EditArticleFormProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: article.title || "",
      content: "",
      altText: article.files[0]?.altText || "",
      link: article.link || "",
      tags: article.tags?.join(", ") || "",
    },
  });

  useEffect(() => {
    const loadContent = async () => {
      if (article.files[0]?.url) {
        try {
          const content = await fetchFileContentFromStorage(article.files[0].url);
          form.setValue('content', content);
        } catch (error) {
          console.error('Failed to load article content:', error);
        }
      }
      setIsLoading(false);
    };
    loadContent();
  }, [article.files, form]);

  async function onSubmit(values: FormValues) {
    setIsSaving(true);
    try {
      // Create updated article with new content
      const updatedArticle: Upload = {
        ...article,
        title: values.title,
        description: values.content.substring(0, 100),
        link: values.link || "",
        tags: values.tags ? values.tags.split(",").map(tag => tag.trim()) : [],
        // Store the updated content in the article object
        // The parent component will handle re-uploading to storage if needed
        files: article.files.map((file, index) => {
          if (index === 0) {
            return {
              ...file,
              altText: values.altText || '',
              // Mark that content has been updated
              updatedContent: values.content,
            };
          }
          return file;
        }),
      };
      
      onSave(updatedArticle);
    } catch (error) {
      console.error('Failed to save article:', error);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Form {...form}>
      <ScrollArea className="h-[60vh] pr-6">
        {isLoading && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span className="ml-2">Loading article content...</span>
          </div>
        )}
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
          
          <FormField
            control={form.control}
            name="title"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Title</FormLabel>
                <FormControl>
                  <Input placeholder="Article title" {...field} />
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
                    placeholder="Write your article content here..." 
                    className="min-h-[200px]"
                    {...field} 
                  />
                </FormControl>
                <FormDescription>
                  Note: Content changes will require re-uploading the article file.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          {article.files[0]?.coverPhoto && (
            <FormField
              control={form.control}
              name="altText"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Cover Photo Alt Text</FormLabel>
                  <FormControl>
                    <Input placeholder="Describe the cover photo" {...field} />
                  </FormControl>
                  <FormDescription>
                    Accessibility description for the cover photo.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          <FormField
            control={form.control}
            name="tags"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tags</FormLabel>
                <FormControl>
                  <Input placeholder="writing, tutorial, tech" {...field} />
                </FormControl>
                <FormDescription>Comma-separated tags.</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="link"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Shareable Link</FormLabel>
                <FormControl>
                  <Input placeholder="https://example.com" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="flex justify-between items-center pt-4">
              <Button type="button" variant="outline" onClick={onDeleteRequest} disabled={isSaving}>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete Article
              </Button>
              <Button type="submit" disabled={isSaving}>
                  {isSaving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    'Save Changes'
                  )}
              </Button>
          </div>
        </form>
        <ScrollBar forceMount />
      </ScrollArea>
    </Form>
  );
}
