
"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useToast } from "@/hooks/use-toast";
import { Upload } from "@/app/profile/page";
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

const formSchema = z.object({
  description: z.string().optional(),
  altText: z.string().optional(),
  link: z.string().url({ message: "Please enter a valid URL." }).optional().or(z.literal('')),
  tags: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface EditPostFormProps {
    post: Upload;
    onSave: (updatedPost: Upload) => void;
}

export function EditPostForm({ post, onSave }: EditPostFormProps) {
  const { toast } = useToast();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      description: post.description || "",
      altText: post.altText || "",
      link: post.link || "",
      tags: post.tags?.join(", ") || "",
    },
  });

  function onSubmit(values: FormValues) {
    const updatedPost: Upload = {
        ...post,
        description: values.description || "",
        altText: values.altText || "",
        link: values.link || "",
        tags: values.tags ? values.tags.split(",").map(tag => tag.trim()) : [],
    };
    
    // In a real app, you would make an API call here.
    console.log("Updated Post Data:", updatedPost);
    
    onSave(updatedPost);

    toast({
      title: "Post Updated!",
      description: "Your post has been successfully updated.",
    });
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
        
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea placeholder="A short description for the post..." {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        {post.type === 'image' && (
            <FormField
              control={form.control}
              name="altText"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Alt Text</FormLabel>
                  <FormControl>
                    <Input placeholder="Descriptive alt text for the image" {...field} />
                  </FormControl>
                  <FormDescription>Describe the image for accessibility.</FormDescription>
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
                <Input placeholder="art, design, code" {...field} />
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

        <div className="flex justify-end">
            <Button type="submit">Save Changes</Button>
        </div>
      </form>
    </Form>
  );
}
