
"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Alert, AlertDescription } from "@/components/ui/alert";
import Image from 'next/image';
import { useAuth } from '@/components/auth-provider';
import { auth, db } from '@/lib/firebase-config';
import { updateEmail, updatePassword, updateProfile, reauthenticateWithCredential, EmailAuthProvider } from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { uploadFileToVPS, createVPSUserPath } from '@/lib/vps-storage-utils';

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

export function AccountSettingsForm() {
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const { user } = useAuth();
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      username: '',
      email: '',
      bio: '',
    },
  });
  
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setAvatarPreview(URL.createObjectURL(file));
    }
  };

  // Initialize form with current user info
  useEffect(() => {
    let active = true;
    const load = async () => {
      if (!user) return;
      let bio = '';
      try {
        const snap = await getDoc(doc(db, 'users', user.uid));
        if (snap.exists()) {
          const data = snap.data() as any;
          bio = data?.bio || '';
        }
      } catch {
        // ignore offline errors here
      }
      if (!active) return;
      form.reset({
        username: user.displayName || '',
        email: user.email || '',
        bio,
      });
      setAvatarPreview(user.photoURL || null);
    };
    load();
    return () => { active = false };
  }, [user]);


  async function onSubmit(values: FormValues) {
    setIsLoading(true);

    try {
      setErrorMsg(null);
      if (!user) throw new Error('You must be signed in.');

      // Require current password when changing email or password
      const wantsEmailChange = !!values.email && values.email !== user.email;
      const wantsPasswordChange = !!values.newPassword;
      if ((wantsEmailChange || wantsPasswordChange) && !values.currentPassword) {
        form.setError('currentPassword', { message: 'Current password is required to change email or password.' });
        throw new Error('Current password is required to change email or password.');
      }
      if ((wantsEmailChange || wantsPasswordChange) && user.email && values.currentPassword) {
        const cred = EmailAuthProvider.credential(user.email, values.currentPassword);
        await reauthenticateWithCredential(user, cred);
      }

      // Avatar upload (optional)
      let photoURL = user.photoURL || null;
      if (selectedFile) {
        console.log('Uploading avatar:', selectedFile.name);
        const path = `${createVPSUserPath(user.uid, 'avatars')}/${Date.now()}-${selectedFile.name}`;
        console.log('Upload path:', path);
        const result = await uploadFileToVPS(selectedFile, path);
        console.log('Upload result:', result);
        if (!result.success || !result.file) {
          throw new Error(result.error || 'Avatar upload failed');
        }
        photoURL = result.file.url;
        console.log('New photo URL:', photoURL);
      }

      // Profile display name / photo
      await updateProfile(user, {
        displayName: values.username || user.displayName || undefined,
        photoURL: photoURL || undefined,
      });

      // Email change
      if (wantsEmailChange) {
        await updateEmail(user, values.email);
      }

      // Password change
      if (wantsPasswordChange && values.newPassword) {
        await updatePassword(user, values.newPassword);
      }

      // Persist bio and public fields in Firestore
      await setDoc(doc(db, 'users', user.uid), {
        uid: user.uid,
        displayName: values.username || user.displayName || null,
        email: values.email || user.email || null,
        photoURL: photoURL || null,
        bio: values.bio || '',
        updatedAt: new Date(),
      }, { merge: true });

      // Refresh local auth user state
      await auth.currentUser?.reload();
      
      // Clear selected file and reset form
      setSelectedFile(null);
      setAvatarPreview(photoURL);
      form.reset({
        username: auth.currentUser?.displayName || values.username,
        email: auth.currentUser?.email || values.email,
        bio: values.bio || '',
        currentPassword: undefined,
        newPassword: undefined,
        confirmPassword: undefined,
      });
      
      // Force page reload to refresh all components with new photo
      window.location.reload();

      // Indicate success inline by clearing error and leaving form reset
      setErrorMsg(null);

    } catch (error: any) {
      let message = error?.message || "There was a problem saving your settings.";
      if (error?.code === 'auth/requires-recent-login') {
        message = 'Please sign in again and retry this sensitive operation.';
      } else if (error?.code === 'auth/weak-password') {
        message = 'Password should be at least 6 characters.';
      }
      setErrorMsg(message);
    } finally {
        setIsLoading(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        {errorMsg && (
          <Alert variant="destructive">
            <AlertDescription>{errorMsg}</AlertDescription>
          </Alert>
        )}
        <div className="flex items-center gap-6">
            {avatarPreview && (
            <img src={avatarPreview} alt="Avatar preview" className="w-24 h-24 rounded-full object-cover" data-ai-hint="user avatar" />
            )}
            <FormItem className="flex-1">
                <FormLabel>Profile Picture</FormLabel>
                <FormControl>
                    <Input type="file" accept="image/*" onChange={handleAvatarChange} className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"/>
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
                <Input placeholder="your_username" value={field.value ?? ''} onChange={field.onChange} />
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
                <Input placeholder="name@example.com" value={field.value ?? ''} onChange={field.onChange} />
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
                <Textarea placeholder="Tell us a little bit about yourself" value={field.value ?? ''} onChange={field.onChange} />
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
                <Input type="password" value={field.value ?? ''} onChange={field.onChange} />
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
                <Input type="password" value={field.value ?? ''} onChange={field.onChange} />
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
                <Input type="password" value={field.value ?? ''} onChange={field.onChange} />
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
