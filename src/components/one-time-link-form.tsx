
"use client";

import { useState, useEffect, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useToast } from "@/hooks/use-toast";
import { generateOneTimeLink } from "@/ai/flows/secure-file-sharing";
import type { Upload } from "@/lib/types";
import { UPLOADS_STORAGE_KEY } from "@/lib/constants";
import { getFilesFromDb } from "@/lib/db";


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
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle, Copy, FileWarning, Loader2, Upload as UploadIcon, Library, File as FileIcon, PlayCircle, Check } from "lucide-react";
import Image from "next/image";
import { readFileAsDataURL } from "@/lib/utils";

const formSchema = z.object({
  file: z.any().optional(),
  selectedUpload: z.string().optional(),
  recipient: z.string().email({ message: "Please enter a valid recipient email." }).optional().or(z.literal('')),
}).refine(data => {
  const hasFile = data.file && (data.file instanceof FileList ? data.file.length > 0 : true);
  return hasFile || data.selectedUpload;
}, {
    message: "Please either upload a file or select an existing one.",
    path: ["file"],
});


type FormValues = z.infer<typeof formSchema>;

export function OneTimeLinkForm() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("upload");
  const [userUploads, setUserUploads] = useState<Upload[]>([]);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    const storedUploads = localStorage.getItem(UPLOADS_STORAGE_KEY);
    if (storedUploads) {
      try {
        const parsed = JSON.parse(storedUploads);
        if (Array.isArray(parsed)) {
          setUserUploads(parsed);
        }
      } catch (e) {
        console.error("Failed to parse uploads from localStorage", e);
      }
    }
  }, []);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      recipient: "",
    },
  });
  
  const fileRef = form.register("file");

  async function onSubmit(values: FormValues) {
    if (!isClient) return;
    setIsLoading(true);
    setGeneratedLink(null);

    try {
      let fileDataUri: string;
      let file: File | undefined;

      if (activeTab === "upload" && values.file && values.file.length > 0) {
        file = values.file[0] as File;
        fileDataUri = await readFileAsDataURL(file);
      } else if (activeTab === "select" && values.selectedUpload) {
        const selected = userUploads.find(u => u.id === values.selectedUpload);
        if (!selected || !selected.files[0]) {
             throw new Error("Selected upload not found or is invalid.");
        }
        
        const dbFiles = await getFilesFromDb(selected.id);
        if (!dbFiles || dbFiles.length === 0) {
            throw new Error("Could not find the file data for the selected upload.");
        }

        fileDataUri = await readFileAsDataURL(dbFiles[0]);

      } else {
        toast({
          variant: "destructive",
          title: "No file provided",
          description: "Please upload a file or select one from your profile.",
        });
        return;
      }

      const result = await generateOneTimeLink({
        fileDataUri,
        recipient: values.recipient || undefined,
      });

      if (result.oneTimeLink) {
        setGeneratedLink(result.oneTimeLink);
        toast({
          title: "Link Generated!",
          description: "Your secure link is ready to be shared.",
          action: <CheckCircle className="text-green-500"/>
        });
      } else {
        throw new Error("Failed to generate link.");
      }
    } catch (error) {
      console.error(error);
      let message = "Could not generate the link. Please try again.";
      if (error instanceof Error) {
        message = error.message;
      }
      toast({
        variant: "destructive",
        title: "Error",
        description: message,
      });
    } finally {
      setIsLoading(false);
    }
  }

  const copyToClipboard = () => {
    if (generatedLink) {
      navigator.clipboard.writeText(generatedLink);
      toast({
        title: "Copied to clipboard!",
      });
    }
  };

  const renderUploadPreview = (upload: Upload) => {
     const firstFile = upload.files?.[0];
     const previewSrc = firstFile?.coverPhoto?.preview || firstFile?.preview;
     switch (upload.type) {
        case 'image':
         return previewSrc ? <img src={previewSrc} alt={upload.title} className="w-full h-full object-cover" data-ai-hint="fashion outdoor" /> : <div className="w-full h-full bg-muted flex items-center justify-center"><FileIcon className="w-8 h-8 text-muted-foreground" /></div>;
        case 'video':
         return previewSrc ? <img src={previewSrc} alt={upload.title} className="w-full h-full object-cover" /> : <div className="w-full h-full bg-muted flex items-center justify-center"><PlayCircle className="w-8 h-8 text-muted-foreground" /></div>
        case 'article':
        case 'document':
         return previewSrc ? <img src={previewSrc} alt={upload.title} className="w-full h-full object-cover" /> : <div className="w-full h-full bg-muted flex items-center justify-center"><FileIcon className="w-8 h-8 text-muted-foreground" /></div>
        default:
            return <div className="w-full h-full bg-muted flex items-center justify-center"><FileIcon className="w-8 h-8 text-muted-foreground" /></div>
     }
  }
  
  const selectedUploadId = form.watch('selectedUpload');

  if (!isClient) {
    return null;
  }

  return (
    <>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Tabs defaultValue="upload" className="w-full" onValueChange={(value) => {
              setActiveTab(value);
              form.setValue('file', undefined);
              form.setValue('selectedUpload', undefined);
              form.clearErrors('file');
          }}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="upload">
                <UploadIcon className="mr-2 h-4 w-4" />
                Upload New File
              </TabsTrigger>
              <TabsTrigger value="select">
                 <Library className="mr-2 h-4 w-4" />
                Select from Profile
              </TabsTrigger>
            </TabsList>
            <TabsContent value="upload" className="pt-6">
               <FormField
                  control={form.control}
                  name="file"
                  render={() => (
                    <FormItem>
                      <FormLabel>File</FormLabel>
                      <FormControl>
                         <Input type="file" {...fileRef} />
                      </FormControl>
                      <FormDescription>Select the file you want to share securely.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
            </TabsContent>
            <TabsContent value="select" className="pt-6">
                <FormField
                  control={form.control}
                  name="selectedUpload"
                  render={({ field }) => (
                    <FormItem>
                        <FormLabel>Your Uploads</FormLabel>
                        <FormDescription>Select an existing file from your profile to share.</FormDescription>
                        {userUploads.length > 0 ? (
                         <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 max-h-64 overflow-y-auto pt-2 pr-2">
                            {userUploads.map(upload => (
                                <Card 
                                    key={upload.id} 
                                    className={`cursor-pointer transition-all ${selectedUploadId === upload.id ? 'ring-2 ring-primary' : 'hover:border-primary'}`}
                                    onClick={() => field.onChange(upload.id)}
                                >
                                    <CardContent className="p-0 aspect-[4/5] relative">
                                        {renderUploadPreview(upload)}
                                        {selectedUploadId === upload.id && (
                                            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                                                <Check className="w-8 h-8 text-white"/>
                                            </div>
                                        )}
                                        <div className="absolute bottom-0 left-0 right-0 bg-black/60 p-1.5">
                                            <p className="text-xs text-white truncate">{upload.title}</p>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                        ) : (
                            <p className="text-sm text-muted-foreground pt-2">You have no uploads to select from.</p>
                        )}
                         <FormMessage />
                    </FormItem>
                  )}
                />
            </TabsContent>
          </Tabs>

          <FormField
            control={form.control}
            name="recipient"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Recipient Email (Optional)</FormLabel>
                <FormControl>
                  <Input placeholder="recipient@example.com" {...field} />
                </FormControl>
                <FormDescription>The link will be associated with this recipient.</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : "Generate Secure Link"}
          </Button>
        </form>
      </Form>

      {generatedLink && (
        <div className="mt-6 space-y-4">
            <Alert>
                <FileWarning className="h-4 w-4" />
                <AlertTitle>Link Generated Successfully!</AlertTitle>
                <AlertDescription>
                    Share this link with your recipient. It is valid for one-time use only and will self-destruct upon access.
                </AlertDescription>
            </Alert>
            <div className="relative">
                <Input type="text" readOnly value={generatedLink} className="pr-10" />
                <Button variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8" onClick={copyToClipboard}>
                    <Copy className="h-4 w-4" />
                </Button>
            </div>
        </div>
      )}
    </>
  );
}
