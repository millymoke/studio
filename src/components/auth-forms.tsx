"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  GoogleAuthProvider,
  signInWithPopup,
  createUserWithEmailAndPassword,
  updateProfile,
} from "firebase/auth";
import { auth, db } from "@/lib/firebase-config";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
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
import { Separator } from "@/components/ui/separator";
import { Facebook, Apple, Chrome } from "lucide-react";
import { toast } from "@/hooks/use-toast";

//
// ================== LOGIN FORM ==================
//
const loginSchema = z.object({
  email: z.string().email({ message: "Invalid email address." }),
  password: z
    .string()
    .min(6, { message: "Password must be at least 6 characters." }),
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

  const handleForgotPassword = async () => {
    const email = form.getValues("email");

    if (!email) {
      toast({
        title: "Enter your email first",
        description:
          "Please provide your email address to reset your password.",
        variant: "destructive",
      });
      return;
    }

    try {
      await sendPasswordResetEmail(auth, email);
      toast({
        title: "Password reset email sent!",
        description: "Check your inbox for a reset link.",
      });
    } catch (e) {
      const message =
        e instanceof Error ? e.message : "Failed to send reset email.";
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
    }
  };

  const handleGoogle = async () => {
    try {
      setErrorMsg(null);
      await signInWithPopup(auth, new GoogleAuthProvider());
      router.replace("/profile");
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : "Google sign-in failed.");
    }
  };

  const handleApple = async () => {
    toast({
      title: "Apple sign-in not available",
      description: "Apple sign-in is not available for this platform.",
    });
  };

  const handleFacebook = async () => {
    toast({
      title: "Facebook sign-in not available",
      description: "Facebook sign-in is not available for this platform.",
    });
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
              <Button type="button" variant="outline" onClick={handleApple}>
                <Apple className="w-4 h-4" />
              </Button>
              <Button type="button" variant="outline" onClick={handleFacebook}>
                <Facebook className="w-4 h-4" />
              </Button>
              <Button type="button" variant="outline" onClick={handleGoogle}>
                <Chrome className="w-4 h-4" />
              </Button>
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

          <CardFooter className="flex flex-col gap-2">
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Signing In..." : "Sign In"}
            </Button>
            <Button
              type="button"
              variant="link"
              onClick={handleForgotPassword}
              className="p-0 text-sm text-muted-foreground hover:text-primary"
            >
              Forgot password?
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}

//
// ================== SIGNUP FORM ==================
//
const signupSchema = z.object({
  username: z
    .string()
    .min(3, { message: "Username must be at least 3 characters." }),
  email: z.string().email({ message: "Invalid email address." }),
  password: z
    .string()
    .min(6, { message: "Password must be at least 6 characters." }),
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
      const cred = await createUserWithEmailAndPassword(
        auth,
        values.email,
        values.password
      );
      if (cred.user) {
        await updateProfile(cred.user, { displayName: values.username });
        await setDoc(
          doc(db, "users", cred.user.uid),
          {
            uid: cred.user.uid,
            email: cred.user.email,
            displayName: values.username,
            createdAt: serverTimestamp(),
          },
          { merge: true }
        );
      }
      router.replace("/profile");
    } catch (e) {
      const message =
        e instanceof Error ? e.message : "Failed to create account.";
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
  );
}
