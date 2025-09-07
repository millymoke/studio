
"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useToast } from "@/hooks/use-toast";
import { generateOneTimeLink } from "@/ai/flows/secure-file-sharing";

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
import { CheckCircle, Copy, FileWarning, Loader2, Upload, Library, File as FileIcon, PlayCircle, Check } from "lucide-react";
import Image from "next/image";

const formSchema = z.object({
  file: z.any().optional(),
  selectedUpload: z.string().optional(),
  recipient: z.string().email({ message: "Please enter a valid recipient email." }).optional().or(z.literal('')),
  expirationMinutes: z.coerce.number().min(1, "Expiration must be at least 1 minute.").max(1440, "Expiration cannot exceed 1440 minutes (24 hours)."),
}).refine(data => data.file || data.selectedUpload, {
    message: "Please either upload a file or select an existing one.",
    path: ["file"],
});


type FormValues = z.infer<typeof formSchema>;

const userUploads = Array.from({ length: 8 }).map((_, i) => ({
  id: `upload-${i}`,
  type: i % 3 === 0 ? 'video' : (i % 3 === 1 ? 'article' : 'image'),
  src: `https://picsum.photos/400/500?random=${i+1}`,
  title: `Shared Content ${i+1}`,
  fileDataUri: `data:image/jpeg;base64,simulated_base64_for_${i+1}`, // Simulated for AI flow
}));


export function OneTimeLinkForm() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("upload");

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      recipient: "",
      expirationMinutes: 60,
    },
  });
  
  const fileRef = form.register("file");

  const readFileAsDataURI = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (error) => reject(error);
      reader.readAsDataURL(file);
    });
  };

  async function onSubmit(values: FormValues) {
    setIsLoading(true);
    setGeneratedLink(null);

    try {
      let fileDataUri: string;

      if (activeTab === "upload" && values.file && values.file.length > 0) {
        const file = values.file[0] as File;
        fileDataUri = await readFileAsDataURI(file);
      } else if (activeTab === "select" && values.selectedUpload) {
        const selected = userUploads.find(u => u.id === values.selectedUpload);
        if (!selected) throw new Error("Selected upload not found.");
        // In a real app, you might fetch the file or its data URI from your backend
        fileDataUri = selected.fileDataUri;
      } else {
        throw new Error("No file provided.");
      }

      const result = await generateOneTimeLink({
        fileDataUri,
        recipient: values.recipient || undefined,
        expirationMinutes: values.expirationMinutes,
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

  const renderUploadPreview = (upload: typeof userUploads[0]) => {
     switch (upload.type) {
        case 'image':
            return <Image src={upload.src} alt={upload.title} fill className="object-cover" data-ai-hint="fashion outdoor"/>;
        case 'video':
            return <div className="w-full h-full bg-muted flex items-center justify-center"><PlayCircle className="w-8 h-8 text-muted-foreground" /></div>
        case 'article':
             return <div className="w-full h-full bg-muted flex items-center justify-center"><FileIcon className="w-8 h-8 text-muted-foreground" /></div>
        default:
            return <div className="w-full h-full bg-muted flex items-center justify-center"><FileIcon className="w-8 h-8 text-muted-foreground" /></div>
     }
  }
  
  const selectedUploadId = form.watch('selectedUpload');

  return (
    <>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Tabs defaultValue="upload" className="w-full" onValueChange={(value) => {
              setActiveTab(value);
              form.resetField('file');
              form.resetField('selectedUpload');
              form.clearErrors('file');
          }}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="upload">
                <Upload className="mr-2 h-4 w-4" />
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
                        <FormMessage />
                         <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 max-h-64 overflow-y-auto pt-2 pr-2">
                            {userUploads.map(upload => (
                                <Card 
                                    key={upload.id} 
                                    className={`cursor-pointer transition-all ${selectedUploadId === upload.id ? 'ring-2 ring-primary' : 'hover:border-primary'}`}
                                    onClick={() => form.setValue('selectedUpload', upload.id, { shouldValidate: true })}
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
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="expirationMinutes"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Expiration (in minutes)</FormLabel>
                <FormControl>
                  <Input type="number" {...field} />
                </FormControl>
                 <FormDescription>The link will self-destruct after this many minutes.</FormDescription>
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
