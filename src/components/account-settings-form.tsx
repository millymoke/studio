
"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
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
import { Loader2 } from "lucide-react";
import { Separator } from "./ui/separator";


const formSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters."),
  email: z.string().email("Please enter a valid email address."),
  bio: z.string().max(160, "Bio cannot be longer than 160 characters.").optional(),
  avatar: z.any().optional(),
  currentPassword: z.string().optional(),
  newPassword: z.string().optional(),
  confirmPassword: z.string().optional(),
}).refine(data => {
    if (data.newPassword && !data.currentPassword) {
        return false;
    }
    return true;
}, {
    message: "Please enter your current password to set a new one.",
    path: ["currentPassword"],
}).refine(data => data.newPassword === data.confirmPassword, {
    message: "New passwords do not match.",
    path: ["confirmPassword"],
});

type FormValues = z.infer<typeof formSchema>;

const currentUser = { 
    username: 'Maalai', 
    email: 'maalai@example.com',
    bio: 'Sharing my world',
    avatar: 'https://picsum.photos/200'
};

export function AccountSettingsForm() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(currentUser.avatar);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      username: currentUser.username,
      email: currentUser.email,
      bio: currentUser.bio,
    },
  });
  
  const avatarRef = form.register("avatar");

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      form.setValue('avatar', file);
      setAvatarPreview(URL.createObjectURL(file));
    }
  };


  async function onSubmit(values: FormValues) {
    setIsLoading(true);

    try {
      // Mock API call to update user details
      await new Promise(resolve => setTimeout(resolve, 1500));
      console.log("Updated values:", values);
      
      toast({
        title: "Settings Saved!",
        description: "Your account details have been updated successfully.",
      });

    } catch (error) {
        console.error("Failed to update settings", error)
        toast({
            variant: "destructive",
            title: "Uh oh! Something went wrong.",
            description: "There was a problem saving your settings.",
        });
    } finally {
        setIsLoading(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <div className="flex items-center gap-6">
            {avatarPreview && (
                <Image src={avatarPreview} alt="Avatar preview" width={96} height={96} className="w-24 h-24 rounded-full object-cover" data-ai-hint="user avatar"/>
            )}
            <FormItem className="flex-1">
                <FormLabel>Profile Picture</FormLabel>
                <FormControl>
                    <Input type="file" accept="image/*" {...avatarRef} onChange={handleAvatarChange} className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"/>
                </FormControl>
                <FormDescription>Upload a new profile picture.</FormDescription>
                <FormMessage />
            </FormItem>
        </div>

        <FormField
          control={form.control}
          name="username"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Username</FormLabel>
              <FormControl>
                <Input placeholder="your_username" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input placeholder="name@example.com" {...field} />
              </FormControl>
               <FormDescription>We will not share your email with anyone.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="bio"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Bio</FormLabel>
              <FormControl>
                <Textarea placeholder="Tell us a little bit about yourself" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <Separator />
        
        <div>
            <h3 className="text-lg font-medium">Password</h3>
            <p className="text-sm text-muted-foreground">Update your password here. Leave blank to keep it unchanged.</p>
        </div>

        <FormField
          control={form.control}
          name="currentPassword"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Current Password</FormLabel>
              <FormControl>
                <Input type="password" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="newPassword"
          render={({ field }) => (
            <FormItem>
              <FormLabel>New Password</FormLabel>
              <FormControl>
                <Input type="password" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="confirmPassword"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Confirm New Password</FormLabel>
              <FormControl>
                <Input type="password" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" className="w-full sm:w-auto" disabled={isLoading}>
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : "Save Changes"}
        </Button>
      </form>
    </Form>
  );
}
