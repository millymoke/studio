
"use client"

import React, { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Lock, Upload, User, LogOut, Settings, Bookmark, Menu } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTrigger } from './ui/sheet';
import { useIsMobile } from '@/hooks/use-mobile';

export default function Header() {
  const [isLoggedIn, setIsLoggedIn] = useState(true); // Default to logged in for demo
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const isMobile = useIsMobile();
  const user = { 
      username: 'Maalai',
      avatar: 'https://picsum.photos/200'
  };

  const navLinks = (
    <>
      <Button variant="ghost" asChild>
        <Link href="/">Home</Link>
      </Button>
      <Button asChild>
        <Link href="/upload">
            <Upload className="mr-2"/>Upload
        </Link>
      </Button>
      <Button variant="outline" asChild>
        <Link href="/one-time-link"><Lock className="mr-2"/>Secure Share</Link>
      </Button>
    </>
  );

  const userMenu = (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
            <Avatar className="h-10 w-10 cursor-pointer">
              <AvatarImage src={user.avatar} alt={user.username} data-ai-hint="user avatar" />
              <AvatarFallback>{user.username.charAt(0).toUpperCase()}</AvatarFallback>
            </Avatar>
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
           <DropdownMenuItem asChild>
            <Link href="/account-settings">
              <Settings className="mr-2 h-4 w-4" />
              <span>Account Settings</span>
            </Link>
          </DropdownMenuItem>
           <DropdownMenuItem>
              <Bookmark className="mr-2 h-4 w-4" />
              <span>Bookmarks</span>
           </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setIsLoggedIn(false)}>
            <LogOut className="mr-2 h-4 w-4" />
            <span>Log out</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
  );

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4 flex h-16 items-center">
        <Link href="/" className="mr-auto flex items-center gap-2">
          <h1 className="text-2xl font-bold font-headline text-primary">ShareSpace</h1>
        </Link>
        
        {isMobile ? (
          <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
            <SheetTrigger asChild>
               <Button variant="ghost" size="icon">
                  <Menu />
                  <span className="sr-only">Open menu</span>
                </Button>
            </SheetTrigger>
            <SheetContent side="right">
                <nav className="flex flex-col items-start gap-4 mt-8">
                  {isLoggedIn ? (
                    <>
                      <div className="flex items-center gap-3 mb-4">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={user.avatar} alt={user.username} data-ai-hint="user avatar" />
                          <AvatarFallback>{user.username.charAt(0).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{user.username}</p>
                          <p className="text-sm text-muted-foreground">{user.username.toLowerCase()}@example.com</p>
                        </div>
                      </div>
                      <Link href="/profile" passHref legacyBehavior><Button variant="ghost" className="w-full justify-start" asChild><a className="w-full justify-start" onClick={() => setIsSheetOpen(false)}><User className="mr-2"/>Profile</a></Button></Link>
                      <Link href="/account-settings" passHref legacyBehavior><Button variant="ghost" className="w-full justify-start" asChild><a className="w-full justify-start" onClick={() => setIsSheetOpen(false)}><Settings className="mr-2"/>Settings</a></Button></Link>
                      <Link href="/upload" passHref legacyBehavior><Button variant="ghost" className="w-full justify-start" asChild><a className="w-full justify-start" onClick={() => setIsSheetOpen(false)}><Upload className="mr-2"/>Upload</a></Button></Link>
                      <Link href="/one-time-link" passHref legacyBehavior><Button variant="ghost" className="w-full justify-start" asChild><a className="w-full justify-start" onClick={() => setIsSheetOpen(false)}><Lock className="mr-2"/>Secure Share</a></Button></Link>
                      <Button variant="ghost" className="w-full justify-start" onClick={() => { setIsLoggedIn(false); setIsSheetOpen(false); }}><LogOut className="mr-2"/>Log Out</Button>
                    </>
                  ) : (
                    <Button onClick={() => { setIsLoggedIn(true); setIsSheetOpen(false); }} className="w-full">Sign In</Button>
                  )}
                </nav>
            </SheetContent>
          </Sheet>
        ) : (
          <nav className="flex items-center gap-2">
            {isLoggedIn ? (
              <>
                {navLinks}
                {userMenu}
              </>
            ) : (
              <Button asChild><Link href="/login">Sign In</Link></Button>
            )}
          </nav>
        )}
      </div>
    </header>
  );
}
