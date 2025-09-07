
"use client"

import React, { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Lock, Upload, User } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function Header() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const user = { username: 'Maalai' };

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4 flex h-16 items-center">
        <Link href="/" className="mr-auto">
          <h1 className="text-2xl font-bold font-headline text-primary">ShareSpace</h1>
        </Link>
        <nav className="hidden md:flex items-center gap-4">
          <Button variant="ghost" asChild>
            <Link href="/">Home</Link>
          </Button>
          {isLoggedIn ? (
            <>
              <Button asChild>
                <Link href="/upload"><Upload className="mr-2"/>Upload</Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href="/one-time-link"><Lock className="mr-2"/>Secure Share</Link>
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback>{user.username.charAt(0).toUpperCase()}</AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" forceMount>
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">{user.username}</p>
                      <p className="text-xs leading-none text-muted-foreground">
                        {user.username.toLowerCase()}@example.com
                      </p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/profile">
                      <User className="mr-2 h-4 w-4" />
                      <span>Profile</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setIsLoggedIn(false)}>
                    <span>Log out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <Button onClick={() => setIsLoggedIn(true)}>Sign In</Button>
          )}
        </nav>
        <Button variant="ghost" className="md:hidden">Menu</Button>
      </div>
    </header>
  );
}
