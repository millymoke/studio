
"use client";

import { useState, useRef } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useToast } from "@/hooks/use-toast";
import Image from 'next/image';
import { useRouter } from "next/navigation";

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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Trash2, PlayCircle, File as FileIcon, ImagePlus } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { UPLOADS_STORAGE_KEY } from "@/lib/constants";
import type { Upload, UploadedFile, FileWithPreview } from "@/lib/types";
import { readFileAsDataURL } from "@/lib/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { VideoThumbnailSelector } from "./video-thumbnail-selector";

const fileSchema = z.object({
  file: z.any(), // instance of File
  altText: z.string().optional(),
  coverPhoto: z.any().optional(), // instance of File
  preview: z.string().optional(), // object URL
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

const getFileType = (file: File): 'image' | 'video' | 'document' => {
    if (file.type.startsWith('image/')) return 'image';
    if (file.type.startsWith('video/')) return 'video';
    return 'document';
}


export function UploadForm() {
  const { toast } = useToast();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [thumbnailSelectorOpen, setThumbnailSelectorOpen] = useState(false);
  const [videoForThumbnail, setVideoForThumbnail] = useState<{file: File, index: number} | null>(null);
  
  // Use refs for each cover photo input to avoid conflicts
  const coverPhotoInputRefs = useRef<(HTMLInputElement | null)[]>([]);

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
  
  const { fields, append, remove, update } = useFieldArray({
    control: form.control,
    name: "files"
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files).map(file => {
          return {
              file: file,
              altText: '',
              preview: URL.createObjectURL(file),
          }
      });
      append(newFiles);
    }
  };
  
  const handleCoverPhotoChange = (file: File, index: number) => {
    update(index, { ...fields[index], coverPhoto: file });
  };
  
  const handleFrameSelect = async (dataUrl: string, index: number) => {
    const response = await fetch(dataUrl);
    const blob = await response.blob();
    const file = new File([blob], `frame-for-${fields[index].file.name}.jpg`, { type: 'image/jpeg' });
    
    update(index, { ...fields[index], coverPhoto: file });
    setThumbnailSelectorOpen(false);
    setVideoForThumbnail(null);
  }


  async function onSubmit(values: FormValues) {
    setIsLoading(true);

    try {
        const existingUploads = JSON.parse(localStorage.getItem(UPLOADS_STORAGE_KEY) || '[]');
        const newUploads: Upload[] = [];

        const processFile = async (fileWithValue: z.infer<typeof fileSchema>): Promise<UploadedFile> => {
            const originalFile = fileWithValue.file as File;
            const coverPhotoFile = fileWithValue.coverPhoto as File | undefined;
            
            // The main file's content (or its object URL for videos)
            const filePreview = fileWithValue.preview;

            let coverPhotoData: UploadedFile['coverPhoto'] | undefined = undefined;
            if (coverPhotoFile) {
                const coverPreview = await readFileAsDataURL(coverPhotoFile);
                coverPhotoData = {
                    file: { name: coverPhotoFile.name, type: coverPhotoFile.type, size: coverPhotoFile.size },
                    preview: coverPreview
                };
            }
            
            const fileData: UploadedFile = {
                file: { name: originalFile.name, type: originalFile.type, size: originalFile.size },
                altText: fileWithValue.altText,
                preview: filePreview, // Keep the object URL for videos
                coverPhoto: coverPhotoData,
            };
            
             // For text-based documents, we need the data URL, not object URL
            if (getFileType(originalFile) === 'document') {
                fileData.preview = await readFileAsDataURL(originalFile);
            }
            
            return fileData;
        };


        if (values.displayOption === 'individual') {
            for (const file of values.files) {
                const fileData = await processFile(file);
                const newUpload: Upload = {
                    id: `${Date.now()}-${file.file.name}`,
                    type: getFileType(file.file),
                    title: values.title,
                    description: values.description || '',
                    tags: values.tags ? values.tags.split(',').map(t => t.trim()) : [],
                    link: values.link || '',
                    displayOption: 'individual',
                    files: [fileData]
                };
                newUploads.push(newUpload);
            }
        } else {
            const processedFiles = await Promise.all(values.files.map(processFile));
            
            const newUpload: Upload = {
                id: Date.now().toString(),
                type: getFileType(values.files[0].file), // Base type on first file
                title: values.title,
                description: values.description || '',
                tags: values.tags ? values.tags.split(',').map(t => t.trim()) : [],
                link: values.link || '',
                displayOption: 'carousel',
                files: processedFiles
            };
            newUploads.push(newUpload);
        }

        localStorage.setItem(UPLOADS_STORAGE_KEY, JSON.stringify([...newUploads, ...existingUploads]));

        toast({
          title: "Files Uploaded!",
          description: "Your files have been successfully uploaded.",
        });

        // Clean up object URLs after submission
        fields.forEach(field => {
            if (field.preview) {
                URL.revokeObjectURL(field.preview);
            }
        });

        form.reset();
        remove();
        router.push('/profile');

    } catch (error) {
        console.error("Failed to submit files", error);
        toast({
            variant: "destructive",
            title: "Uh oh! Something went wrong.",
            description: "There was a problem saving your files.",
        });
    } finally {
        setIsLoading(false);
    }
  }

  const renderFilePreview = (field: (z.infer<typeof fileSchema> & {id: string})) => {
    const file = field.file as File;
    const coverPhotoFile = field.coverPhoto as File | undefined;
    let previewUrl = field.preview; // Object URL for image/video

    // If there's a cover photo, create a temporary object URL for it to show in the preview
    if (coverPhotoFile) {
        previewUrl = URL.createObjectURL(coverPhotoFile);
    }

    const fileType = getFileType(file);

    if (fileType === 'image' && previewUrl) {
      return <Image src={previewUrl} alt="Preview" width={80} height={80} className="w-20 h-20 object-cover rounded-md" />;
    }
    if (fileType === 'video') {
         if (previewUrl && coverPhotoFile) {
            return <Image src={previewUrl} alt="Cover preview" width={80} height={80} className="w-20 h-20 object-cover rounded-md" />;
        }
        return <div className="w-20 h-20 rounded-md bg-muted flex items-center justify-center"><PlayCircle className="w-8 h-8 text-muted-foreground" /></div>
    }
    if(fileType === 'document') {
        if (previewUrl && coverPhotoFile) {
            return <Image src={previewUrl} alt="Cover preview" width={80} height={80} className="w-20 h-20 object-cover rounded-md" />;
        }
        return <div className="w-20 h-20 rounded-md bg-muted flex items-center justify-center"><FileIcon className="w-8 h-8 text-muted-foreground" /></div>
    }
    return <div className="w-20 h-20 rounded-md bg-muted flex items-center justify-center"><FileIcon className="w-8 h-8 text-muted-foreground" /></div>
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="files"
          render={() => (
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
              {fields.map((field, index) => {
                  const fileType = getFileType(field.file);
                  return (
                      <Card key={field.id}>
                          <CardContent className="pt-4 flex items-start gap-4">
                              {renderFilePreview(field)}
                              <div className="flex-1 space-y-2">
                              <p className="text-sm font-medium truncate">{field.file.name}</p>
                              {fileType === 'image' ? (
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
                              ) : fileType === 'video' ? (
                                  <>
                                  <DropdownMenu>
                                      <DropdownMenuTrigger asChild>
                                          <Button type="button" variant="outline" size="sm">
                                              <ImagePlus className="mr-2 h-4 w-4"/>
                                              Set Cover Photo
                                          </Button>
                                      </DropdownMenuTrigger>
                                      <DropdownMenuContent>
                                          <DropdownMenuItem onSelect={() => coverPhotoInputRefs.current[index]?.click()}>
                                              Upload Image
                                          </DropdownMenuItem>
                                          <DropdownMenuItem onSelect={() => {
                                              setVideoForThumbnail({file: field.file, index});
                                              setThumbnailSelectorOpen(true);
                                          }}>
                                              Select Frame from Video
                                          </DropdownMenuItem>
                                      </DropdownMenuContent>
                                  </DropdownMenu>
                                  <Input 
                                      type="file" 
                                      accept="image/*" 
                                      className="hidden"
                                      ref={el => coverPhotoInputRefs.current[index] = el}
                                      onChange={(e) => {
                                          if(e.target.files?.[0]) {
                                              handleCoverPhotoChange(e.target.files[0], index)
                                          }
                                      }}
                                  />
                                  </>
                              ) : ( // document
                                  <FormItem className="flex-1">
                                      <FormLabel className="sr-only">Cover Photo</FormLabel>
                                      <FormControl>
                                          <Input 
                                          type="file" 
                                          accept="image/*" 
                                          onChange={(e) => {
                                              if(e.target.files?.[0]) {
                                                  handleCoverPhotoChange(e.target.files[0], index)
                                              }
                                          }}
                                          className="text-xs file:text-xs file:py-1 file:px-2"
                                          />
                                      </FormControl>
                                      <FormDescription className="text-xs">
                                          Upload an optional cover photo.
                                      </FormDescription>
                                      <FormMessage />
                                  </FormItem>
                              )}
                              </div>
                              <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)}>
                                  <Trash2 className="h-4 w-4"/>
                              </Button>
                          </CardContent>
                      </Card>
                  )
              })}
          </div>
        )}
        
        <Dialog open={thumbnailSelectorOpen} onOpenChange={(open) => {
            setThumbnailSelectorOpen(open);
            if (!open) {
                setVideoForThumbnail(null);
            }
        }}>
            {videoForThumbnail && (
                <DialogContent className="max-w-3xl">
                    <DialogHeader>
                        <DialogTitle>Select Video Cover Photo</DialogTitle>
                    </DialogHeader>
                    <VideoThumbnailSelector 
                        videoFile={videoForThumbnail.file} 
                        onFrameSelected={(dataUrl) => handleFrameSelect(dataUrl, videoForThumbnail.index)}
                    />
                </DialogContent>
            )}
        </Dialog>


        {fields.length > 0 && <Separator />}

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

        {fields.length > 1 && (
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
                          Individual posts for each file
                        </FormLabel>
                      </FormItem>
                      <FormItem className="flex items-center space-x-3 space-y-0">
                        <FormControl>
                          <RadioGroupItem value="carousel" />
                        </FormControl>
                        <FormLabel className="font-normal">
                          Single post with a carousel
                        </FormLabel>
                      </FormItem>
                    </RadioGroup>
                  </FormControl>
                  <FormDescription>Choose how multiple files should be displayed.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
        )}


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

    