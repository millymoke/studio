
"use client";

import { useState, useRef, useEffect } from "react";
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
import { Loader2, Trash2, PlayCircle, File as FileIcon, ImagePlus, Copy } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
// No local storage needed - all data stored in Firebase
import type { Upload, UploadedFile, SerializableFile } from "@/lib/types";
import { readFileAsDataURL } from "@/lib/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "./ui/dialog";
import { VideoThumbnailSelector } from "./video-thumbnail-selector";
// No IndexedDB needed - all files stored in Firebase Storage
import { useAuth } from "@/components/auth-provider";
import { createPost } from "@/lib/firebase-utils";
import { saveFilesToDb } from "@/lib/db";
import { UPLOADS_STORAGE_KEY } from "@/lib/constants";


const fileSchema = z.object({
  file: z.any(), // instance of File
  altText: z.string().optional(),
  coverPhoto: z.object({ file: z.any(), preview: z.string() }).optional(),
  preview: z.string(), // data: or blob: URL for immediate preview
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

const getFileType = (file: File | SerializableFile): 'image' | 'video' | 'document' | 'article' => {
    if (file.type.startsWith('image/')) return 'image';
    if (file.type.startsWith('video/')) return 'video';
    if (file.type.startsWith('text/') || file.type === 'application/pdf') return 'document';
    return 'document';
}


export function UploadForm() {
  const { toast } = useToast();
  const router = useRouter();
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [thumbnailSelectorOpen, setThumbnailSelectorOpen] = useState(false);
  const [videoForThumbnail, setVideoForThumbnail] = useState<{file: File, index: number} | null>(null);
  
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

  const title = form.watch("title");

  useEffect(() => {
    if (title) {
      const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
      const generatedLink = `${window.location.origin}/post/${slug}`;
      form.setValue("link", generatedLink);
    }
  }, [title]);
  
  const { fields, append, remove, update } = useFieldArray({
    control: form.control,
    name: "files"
  });

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFilesPromises = Array.from(e.target.files).map(async file => {
          // For images, we can use a data URL for the preview.
          // For other types, a blob URL is better to avoid holding large data in memory here.
          const preview = file.type.startsWith('image/') ? await readFileAsDataURL(file) : URL.createObjectURL(file);
          return {
              file: file,
              altText: '',
              preview: preview,
          }
      });
      const newFiles = await Promise.all(newFilesPromises);
      append(newFiles);
    }
  };
  
  const handleCoverPhotoChange = async (file: File, index: number) => {
    const preview = await readFileAsDataURL(file); // cover photos are images, so dataURL is fine
    update(index, { ...fields[index], coverPhoto: { file, preview } });
  };
  
  const handleFrameSelect = async (dataUrl: string, index: number) => {
    const response = await fetch(dataUrl);
    const blob = await response.blob();
    const file = new File([blob], `frame-for-${fields[index].file.name}.jpg`, { type: 'image/jpeg' });
    
    update(index, { ...fields[index], coverPhoto: { file, preview: dataUrl }});

    setThumbnailSelectorOpen(false);
    setVideoForThumbnail(null);
  }

 const processFileForStorage = async (fileWithValue: z.infer<typeof fileSchema>): Promise<UploadedFile> => {
    const originalFile = fileWithValue.file as File;

    const serializableFile: SerializableFile = {
      name: originalFile.name,
      type: originalFile.type,
      size: originalFile.size
    };

    let coverPhotoData: UploadedFile['coverPhoto'] | undefined = undefined;
    if (fileWithValue.coverPhoto?.file) {
      const coverFile = fileWithValue.coverPhoto.file as File;
      coverPhotoData = {
        file: { name: coverFile.name, type: coverFile.type, size: coverFile.size },
        // Convert cover photo to dataURL to be stored in localStorage metadata.
        preview: await readFileAsDataURL(coverFile),
      };
    }
    
    return {
      file: serializableFile,
      preview: originalFile.type.startsWith('image/') ? await readFileAsDataURL(originalFile) : '', // Only store image previews in metadata
      altText: fileWithValue.altText,
      coverPhoto: coverPhotoData,
      objectPosition: 'center',
    };
  };

  async function onSubmit(values: FormValues) {
    setIsLoading(true);

    try {
      if (!user) {
        const existingUploads = JSON.parse(localStorage.getItem(UPLOADS_STORAGE_KEY) || '[]') as Upload[];
        const newUploads: Upload[] = [];
        const filesToSave: {id: string, files: File[]}[] = [];

        if (values.displayOption === 'individual') {
            for (const fileWithValue of values.files) {
                 const fileData = await processFileForStorage(fileWithValue);
                 const originalFile = fileWithValue.file as File;
                 const newUpload: Upload = {
                    id: `${Date.now()}-${originalFile.name}`,
                    uid: "",
                    type: getFileType(originalFile),
                    title: values.title,
                    description: values.description || '',
                    tags: values.tags ? values.tags.split(',').map(t => t.trim()) : [],
                    link: values.link || '',
                    displayOption: 'individual',
                    files: [fileData]
                };
                newUploads.push(newUpload);
                filesToSave.push({ id: newUpload.id, files: [originalFile] });
            }
        } else {
            const processedFiles = await Promise.all(values.files.map(processFileForStorage));
            const firstFile = values.files[0].file as File;
            
            const newUpload: Upload = {
                id: Date.now().toString(),
                uid: "",
                type: getFileType(firstFile),
                title: values.title,
                description: values.description || '',
                tags: values.tags ? values.tags.split(',').map(t => t.trim()) : [],
                link: values.link || '',
                displayOption: 'carousel',
                files: processedFiles
            };
            newUploads.push(newUpload);
            const originalFiles = values.files.map(f => f.file as File);
            filesToSave.push({ id: newUpload.id, files: originalFiles });
        }

        // Save file content to IndexedDB
        for (const item of filesToSave) {
          await saveFilesToDb(item.id, item.files);
        }

        // Save METADATA to localStorage
        localStorage.setItem(UPLOADS_STORAGE_KEY, JSON.stringify([...newUploads, ...existingUploads]));

        toast({ variant: "destructive", title: "Sign in required", description: "Please log in to upload." });
        router.push('/login');
        return;
      } else {
        await createPost({
          uid: user.uid,
          title: values.title,
          description: values.description || '',
          tags: values.tags ? values.tags.split(',').map(t => t.trim()) : [],
          link: values.link || '',
          displayOption: values.displayOption,
          files: values.files.map(f => ({
            file: f.file as File,
            altText: f.altText,
            coverPhoto: f.coverPhoto ? { file: f.coverPhoto.file as File, preview: f.coverPhoto.preview } : undefined,
            preview: f.preview,
          })),
        });
      }

        toast({
          title: "Files Uploaded!",
          description: "Your files have been successfully uploaded.",
        });
        form.reset();
        remove();
        router.push('/profile');

    } catch (error) {
        console.error("Failed to submit files", error);
        toast({
            variant: "destructive",
            title: "Uh oh! Something went wrong.",
            description: error instanceof Error ? error.message : "There was a problem saving your files. Please try again.",
        });
    } finally {
        setIsLoading(false);
    }
  }

  const renderFilePreview = (field: (z.infer<typeof fileSchema> & {id: string})) => {
    const file = field.file as File;
    const coverPhotoData = field.coverPhoto;
    const fileType = getFileType(file);
    
    // The field.preview can be a blob: or data: URL which is fine for previews here.
    const previewSrc = coverPhotoData?.preview || field.preview;

    if (fileType === 'image') {
      return <img src={previewSrc} alt="Preview" className="w-20 h-20 object-cover rounded-md" />;
    }
    
    if (fileType === 'video') {
       if (coverPhotoData?.preview) {
         return <img src={coverPhotoData.preview} alt="Video cover" className="w-20 h-20 object-cover rounded-md" />;
       }
       return <div className="w-20 h-20 rounded-md bg-muted flex items-center justify-center"><PlayCircle className="w-8 h-8 text-muted-foreground" /></div>
    }

    if (fileType === 'document' || fileType === 'article') {
       if (coverPhotoData?.preview) {
         return <img src={coverPhotoData.preview} alt="Document cover" className="w-20 h-20 object-cover rounded-md" />;
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
          render={({ field }) => (
            <FormItem>
              <FormLabel>Files</FormLabel>
              <FormControl>
                 <Input type="file" multiple onChange={handleFileChange} className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"/>
              </FormControl>
              <FormDescription>Select images, documents, or videos to upload. For optimal viewing please upload word documents in PDF format.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        
        {fields.length > 0 && (
          <div className="space-y-4">
              <FormLabel>Uploaded Files</FormLabel>
              {fields.map((field, index) => {
                  const fileType = getFileType(field.file);
                  return (
                    <Card key={field.id}>
                      <CardContent className="pt-4 flex items-start gap-4">
                        {renderFilePreview(field)}
                        <div className="flex-1 space-y-2">
                          <p className="text-sm font-medium truncate">
                            {field.file.name}
                          </p>
                          {fileType === "image" ? (
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
                          ) : fileType === "video" ? (
                            <>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                  >
                                    <ImagePlus className="mr-2 h-4 w-4" />
                                    Set Cover Photo
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent>
                                  <DropdownMenuItem
                                    onSelect={() =>
                                      coverPhotoInputRefs.current[
                                        index
                                      ]?.click()
                                    }
                                  >
                                    Upload Image
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onSelect={() => {
                                      setVideoForThumbnail({
                                        file: field.file,
                                        index,
                                      });
                                      setThumbnailSelectorOpen(true);
                                    }}
                                  >
                                    Select Frame from Video
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                              {/* ✅ Fixed alt text field */}
                              <FormField
                                control={form.control}
                                name={`files.${index}.altText`}
                                render={({ field }) => (
                                  <FormItem className="flex-1">
                                    <FormControl>
                                      <Input
                                        placeholder="Alt text"
                                        {...field}
                                      />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              <Input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                placeholder="Alt text"
                                ref={(el) => {
                                  coverPhotoInputRefs.current[index] = el;
                                }}
                                onChange={(e) => {
                                  if (e.target.files?.[0]) {
                                    handleCoverPhotoChange(
                                      e.target.files[0],
                                      index
                                    );
                                  }
                                }}
                              />
                            </>
                          ) : (
                            // document or article
                            <>
                              {/* ✅ Cover Photo Upload Field */}
                              <FormItem className="flex-1">
                                <FormLabel className="sr-only">
                                  Cover Photo
                                </FormLabel>
                                <FormControl>
                                  <Input
                                    type="file"
                                    accept="image/*"
                                    onChange={(e) => {
                                      if (e.target.files?.[0]) {
                                        handleCoverPhotoChange(
                                          e.target.files[0],
                                          index
                                        );
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

                              {/* ✅ Alt Text Input (properly connected to react-hook-form) */}
                              <FormField
                                control={form.control}
                                name={`files.${index}.altText`}
                                render={({ field }) => (
                                  <FormItem className="flex-1">
                                    <FormLabel className="sr-only">
                                      Alt Text
                                    </FormLabel>
                                    <FormControl>
                                      <Input
                                        placeholder="Alt text"
                                        {...field}
                                      />
                                    </FormControl>
                                    <FormDescription className="text-xs">
                                      Provide a short description of the
                                      document for accessibility and SEO.
                                    </FormDescription>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            </>
                          )}
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => remove(index)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </CardContent>
                    </Card>
                  );
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
                        <DialogDescription>Move the slider to find a frame and set it as the cover photo for your video.</DialogDescription>
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
                <Input placeholder="My Post" {...field} />
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
              <FormLabel>Shareable Link</FormLabel>
              <div className="flex gap-2">
                <FormControl>
                  <Input placeholder="https://example.com" {...field} readOnly className="flex-1" />
                </FormControl>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => {
                    if (field.value) {
                      navigator.clipboard.writeText(field.value);
                      toast({ title: "Link copied to clipboard!" });
                    }
                  }}
                  disabled={!field.value}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              <FormDescription>Auto-generated from your post title.</FormDescription>
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
