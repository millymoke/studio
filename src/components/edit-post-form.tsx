
"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useToast } from "@/hooks/use-toast";
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Trash2 } from "lucide-react";
import { ScrollArea, ScrollBar } from "./ui/scroll-area";

const formSchema = z.object({
  title: z.string().min(1, "Title cannot be empty."),
  description: z.string().optional(),
  altText: z.string().optional(),
  link: z.string().url({ message: "Please enter a valid URL." }).optional().or(z.literal('')),
  tags: z.string().optional(),
  objectPosition: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface EditPostFormProps {
    post: Upload;
    onSave: (updatedPost: Upload) => void;
    onDeleteRequest: () => void;
}

export function EditPostForm({ post, onSave, onDeleteRequest }: EditPostFormProps) {
  const { toast } = useToast();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: post.title || "",
      description: post.description || "",
      // NOTE: This only handles alt text and positioning for the FIRST image.
      // A more robust solution would handle this per-image.
      altText: post.files[0]?.altText || "",
      link: post.link || "",
      tags: post.tags?.join(", ") || "",
      objectPosition: post.files[0]?.objectPosition || "center",
    },
  });

  function onSubmit(values: FormValues) {
    const updatedPost: Upload = {
        ...post,
        title: values.title,
        description: values.description || "",
        link: values.link || "",
        tags: values.tags ? values.tags.split(",").map(tag => tag.trim()) : [],
        files: post.files.map((file, index) => {
            // Only update alt text and object position for the first file for simplicity
            if (index === 0) {
                return {
                    ...file, 
                    altText: values.altText || "",
                    objectPosition: values.objectPosition || "center",
                }
            }
            return file;
        })
    };
    
    onSave(updatedPost);

    toast({
      title: "Post Updated!",
      description: "Your post has been successfully updated.",
    });
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
                  <Input placeholder="Post title" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
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
              <>
                  <FormField
                    control={form.control}
                    name="altText"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Alt Text</FormLabel>
                        <FormControl>
                          <Input placeholder="Descriptive alt text for the image" {...field} />
                        </FormControl>
                        <FormDescription>Describe the first image for accessibility.</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                      control={form.control}
                      name="objectPosition"
                      render={({ field }) => (
                          <FormItem className="space-y-3">
                              <FormLabel>Image Position</FormLabel>
                              <FormDescription>Choose how the image is positioned within its frame.</FormDescription>
                              <FormControl>
                                  <RadioGroup
                                      onValueChange={field.onChange}
                                      defaultValue={field.value}
                                      className="flex items-center space-x-4"
                                  >
                                      <FormItem className="flex items-center space-x-2 space-y-0">
                                          <FormControl>
                                              <RadioGroupItem value="top" />
                                          </FormControl>
                                          <FormLabel className="font-normal">Top</FormLabel>
                                      </FormItem>
                                      <FormItem className="flex items-center space-x-2 space-y-0">
                                          <FormControl>
                                              <RadioGroupItem value="center" />
                                          </FormControl>
                                          <FormLabel className="font-normal">Center</FormLabel>
                                      </FormItem>
                                      <FormItem className="flex items-center space-x-2 space-y-0">
                                          <FormControl>
                                              <RadioGroupItem value="bottom" />
                                          </FormControl>
                                          <FormLabel className="font-normal">Bottom</FormLabel>
                                      </FormItem>
                                  </RadioGroup>
                              </FormControl>
                              <FormMessage />
                          </FormItem>
                      )}
                  />
              </>
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

          <div className="flex justify-between items-center pt-4">
              <Button type="button" variant="outline" onClick={onDeleteRequest}>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete Post
              </Button>
              <Button type="submit">Save Changes</Button>
          </div>
        </form>
        <ScrollBar forceMount />
      </ScrollArea>
    </Form>
  );
}
