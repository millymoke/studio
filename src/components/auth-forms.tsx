"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { Separator } from '@/components/ui/separator';
import { Facebook, Apple, Chrome } from 'lucide-react';
import { useState } from "react";
import { auth, db } from "@/lib/firebase-config";
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { useRouter } from "next/navigation";
import { toast } from "@/hooks/use-toast";

const loginSchema = z.object({
  email: z.string().email({ message: "Invalid email address." }),
  password: z.string().min(6, { message: "Password must be at least 6 characters." }),
});

export function LoginForm() {
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const router = useRouter();

  const form = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  async function onSubmit(values: z.infer<typeof loginSchema>) {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      await signInWithEmailAndPassword(auth, values.email, values.password);
      router.replace("/profile");
    } catch (e) {
      const message = e instanceof Error ? e.message : "Failed to sign in.";
      setErrorMsg(message);
    } finally {
      setIsLoading(false);
    }
  }

  const handleGoogle = async () => {
    try {
      setErrorMsg(null);
      await signInWithPopup(auth, new GoogleAuthProvider());
      router.replace('/profile');
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : 'Google sign-in failed.');
    }
  };

  const handleApple = async () => {
    try {
      setErrorMsg(null);
      toast({
        title: 'Apple sign-in not available',
        description: 'Apple sign-in is not available for this platform.',
      });
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : 'Apple sign-in failed.');
    }
  };

  const handleFacebook = async () => {
    try {
      setErrorMsg(null);
      toast({
        title: 'Facebook sign-in not available',
        description: 'Facebook sign-in is not available for this platform.',
      });
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : 'Facebook sign-in failed.');
    }
  };

  return (
    <Card className="w-full">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <CardContent className="space-y-4 pt-6">
            {errorMsg && (
              <Alert variant="destructive">
                <AlertDescription>{errorMsg}</AlertDescription>
              </Alert>
            )}

            <div className="grid grid-cols-3 gap-2">
              <Button type="button" variant="outline" onClick={handleApple}><Apple className="w-4 h-4" /></Button>
              <Button type="button" variant="outline" onClick={handleFacebook}><Facebook className="w-4 h-4" /></Button>
              <Button type="button" variant="outline" onClick={handleGoogle}><Chrome className="w-4 h-4" /></Button>
            </div>
            <Separator />
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input placeholder="name@example.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="••••••••" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
            <CardFooter>
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? "Signing In..." : "Sign In"}
              </Button>
            </CardFooter>
          </form>
        </Form>
    </Card>
  );
}

const signupSchema = z.object({
    username: z.string().min(3, { message: "Username must be at least 3 characters."}),
    email: z.string().email({ message: "Invalid email address." }),
    password: z.string().min(6, { message: "Password must be at least 6 characters." }),
});

export function SignupForm() {
    const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const router = useRouter();

    const form = useForm<z.infer<typeof signupSchema>>({
        resolver: zodResolver(signupSchema),
        defaultValues: {
            username: "",
            email: "",
            password: "",
        },
    });

    async function onSubmit(values: z.infer<typeof signupSchema>) {
        setIsLoading(true);
      setErrorMsg(null);
      try {
        const cred = await createUserWithEmailAndPassword(auth, values.email, values.password);
        if (cred.user) {
          // Set displayName
          await updateProfile(cred.user, { displayName: values.username });
          // Ensure user doc exists immediately
          await setDoc(doc(db, 'users', cred.user.uid), {
            uid: cred.user.uid,
            email: cred.user.email,
            displayName: values.username,
            createdAt: serverTimestamp(),
          }, { merge: true });
        }
        router.replace("/profile");
      } catch (e) {
        const message = e instanceof Error ? e.message : "Failed to create account.";
        setErrorMsg(message);
      } finally {
        setIsLoading(false);
      }
    }

    return (
        <Card className="w-full">
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)}>
                    <CardContent className="space-y-4 pt-6">
                        {errorMsg && (
                            <Alert variant="destructive">
                                <AlertDescription>{errorMsg}</AlertDescription>
                            </Alert>
                        )}
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
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="password"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Password</FormLabel>
                                    <FormControl>
                                        <Input type="password" placeholder="••••••••" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </CardContent>
                    <CardFooter>
                        <Button type="submit" className="w-full" disabled={isLoading}>
                            {isLoading ? "Creating Account..." : "Create Account"}
                        </Button>
                    </CardFooter>
                </form>
            </Form>
        </Card>
    )
}
