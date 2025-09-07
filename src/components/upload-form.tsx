
"use client";

import { useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useToast } from "@/hooks/use-toast";
import Image from 'next/image';

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
import { Loader2, Trash2, Image as ImageIcon, File as FileIcon, PlayCircle, PlusCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

const fileSchema = z.object({
  file: z.any(),
  altText: z.string().optional(),
  coverPhoto: z.any().optional(),
  videoFrame: z.string().optional(),
  preview: z.string().optional(),
});

const formSchema = z.object({
  files: z.array(fileSchema).min(1, "Please upload at least one file."),
  title: z.string().min(1, "Title is required."),
  description: z.string().optional(),
  tags: z.string().optional(),
  displayOption: z.enum(["individual", "carousel"]).default("individual"),
  link: z.string().url({ message: "Please enter a valid URL." }).optional().or(z.literal('')),
});

type FormValues = z.infer<typeof formSchema>;

export function UploadForm() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      files: [],
      title: "",
      description: "",
      tags: "",
      displayOption: "individual",
      link: "",
    },
  });
  
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "files"
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files).map(file => {
          const isImage = file.type.startsWith('image/');
          return {
              file: file,
              altText: '',
              preview: isImage ? URL.createObjectURL(file) : undefined,
          }
      });
      append(newFiles);
    }
  };

  async function onSubmit(values: FormValues) {
    setIsLoading(true);

    console.log("Form values:", values);
    // Mock API call for upload
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    toast({
      title: "Files Uploaded!",
      description: "Your files have been successfully uploaded.",
    });

    form.reset();
    setIsLoading(false);
  }

  const renderFilePreview = (file: File, previewUrl?: string) => {
    if (previewUrl) {
      return <Image src={previewUrl} alt="Preview" width={80} height={80} className="w-20 h-20 object-cover rounded-md" />;
    }
    if (file.type.startsWith('video/')) {
        return <div className="w-20 h-20 rounded-md bg-muted flex items-center justify-center"><PlayCircle className="w-8 h-8 text-muted-foreground" /></div>
    }
    return <div className="w-20 h-20 rounded-md bg-muted flex items-center justify-center"><FileIcon className="w-8 h-8 text-muted-foreground" /></div>
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <FormField
          control={form.control}
          name="files"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Files</FormLabel>
              <FormControl>
                 <Input type="file" multiple onChange={handleFileChange} className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"/>
              </FormControl>
              <FormDescription>Select images, documents, or videos to upload.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        
        {fields.length > 0 && (
          <div className="space-y-4">
              <Label>Uploaded Files</Label>
              {fields.map((field, index) => (
                  <Card key={field.id}>
                    <CardContent className="pt-4 flex items-start gap-4">
                        {renderFilePreview(field.file, field.preview)}
                        <div className="flex-1 space-y-2">
                           <p className="text-sm font-medium truncate">{field.file.name}</p>
                           <FormField
                                control={form.control}
                                name={`files.${index}.altText`}
                                render={({ field }) => (
                                    <FormItem className="flex-1">
                                        <FormControl>
                                            <Input placeholder="Alt text" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            {(field.file.type.startsWith('video/') || !field.file.type.startsWith('image/')) && (
                                 <FormField
                                    control={form.control}
                                    name={`files.${index}.coverPhoto`}
                                    render={({ field: { onChange, value, ...rest }}) => (
                                        <FormItem className="flex-1">
                                            <FormControl>
                                                <Input type="file" accept="image/*" onChange={(e) => onChange(e.target.files ? e.target.files[0] : null)} {...rest} className="text-xs"/>
                                            </FormControl>
                                            <FormDescription className="text-xs">
                                                {field.file.type.startsWith('video/') ? 'Upload cover or select a frame' : 'Upload a cover photo'}
                                            </FormDescription>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            )}
                        </div>
                        <Button variant="ghost" size="icon" onClick={() => remove(index)}>
                            <Trash2 className="h-4 w-4"/>
                        </Button>
                    </CardContent>
                  </Card>
              ))}
          </div>
        )}

        <Separator />

        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Post Title</FormLabel>
              <FormControl>
                <Input placeholder="My Awesome Post" {...field} />
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
        
        <FormField
          control={form.control}
          name="tags"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Tags</FormLabel>
              <FormControl>
                <Input placeholder="art, design, code" {...field} />
              </FormControl>
              <FormDescription>Comma-separated tags to help others find your content.</FormDescription>
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
               <FormDescription>Add an external link to your post.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="displayOption"
          render={({ field }) => (
            <FormItem className="space-y-3">
              <FormLabel>Display Option</FormLabel>
              <FormControl>
                <RadioGroup
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                  className="flex flex-col space-y-1"
                >
                  <FormItem className="flex items-center space-x-3 space-y-0">
                    <FormControl>
                      <RadioGroupItem value="individual" />
                    </FormControl>
                    <FormLabel className="font-normal">
                      Individual Card Display
                    </FormLabel>
                  </FormItem>
                  <FormItem className="flex items-center space-x-3 space-y-0">
                    <FormControl>
                      <RadioGroupItem value="carousel" />
                    </FormControl>
                    <FormLabel className="font-normal">
                      Carousel Display
                    </FormLabel>
                  </FormItem>
                </RadioGroup>
              </FormControl>
              <FormDescription>Choose how multiple files should be displayed in a single post.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" className="w-full" disabled={isLoading || fields.length === 0}>
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Uploading...
            </>
          ) : "Upload Post"}
        </Button>
      </form>
    </Form>
  );
}
