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
import { CheckCircle, Copy, FileWarning, Loader2 } from "lucide-react";

const formSchema = z.object({
  file: z.any().refine(fileList => fileList.length === 1, "Please upload one file."),
  recipient: z.string().email({ message: "Please enter a valid recipient email." }),
  expirationMinutes: z.coerce.number().min(1, "Expiration must be at least 1 minute.").max(1440, "Expiration cannot exceed 1440 minutes (24 hours)."),
});

type FormValues = z.infer<typeof formSchema>;

export function OneTimeLinkForm() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);

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
      const file = values.file[0] as File;
      const fileDataUri = await readFileAsDataURI(file);

      const result = await generateOneTimeLink({
        fileDataUri,
        recipient: values.recipient,
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
      toast({
        variant: "destructive",
        title: "Error",
        description: "Could not generate the link. Please try again.",
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

  return (
    <>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <FormField
            control={form.control}
            name="file"
            render={({ field }) => (
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

          <FormField
            control={form.control}
            name="recipient"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Recipient Email</FormLabel>
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
