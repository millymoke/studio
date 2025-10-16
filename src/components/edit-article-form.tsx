"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
// Toast handled by parent component
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
import { Trash2 } from "lucide-react";
import { ScrollArea, ScrollBar } from "./ui/scroll-area";

const formSchema = z.object({
  title: z.string().min(1, "Title cannot be empty."),
  content: z.string().min(1, "Content cannot be empty."),
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

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: article.title || "",
      content: article.files[0]?.url ? "" : "", // We'll need to fetch the content from storage
      link: article.link || "",
      tags: article.tags?.join(", ") || "",
    },
  });

  function onSubmit(values: FormValues) {
    const updatedArticle: Upload = {
        ...article,
        title: values.title,
        description: values.content.substring(0, 100),
        link: values.link || "",
        tags: values.tags ? values.tags.split(",").map(tag => tag.trim()) : [],
        files: article.files.map((file, index) => {
            // For articles, we need to update the content file
            if (index === 0) {
                return {
                    ...file,
                    // Note: The actual content file would need to be re-uploaded to storage
                    // This is a simplified version that updates metadata only
                }
            }
            return file;
        })
    };
    
    onSave(updatedArticle);
  }

  return (
    <Form {...form}>
      <ScrollArea className="h-[60vh] pr-6">
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
              <Button type="button" variant="outline" onClick={onDeleteRequest}>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete Article
              </Button>
              <Button type="submit">Save Changes</Button>
          </div>
        </form>
        <ScrollBar forceMount />
      </ScrollArea>
    </Form>
  );
}
