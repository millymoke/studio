
"use client";

import * as React from 'react';
import { Input } from './ui/input';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { cn } from '@/lib/utils';
import { Button } from './ui/button';
import { Search } from 'lucide-react';

interface User {
  id: number;
  name: string;
  avatar: string;
  phone: string;
  messages: any[];
}

interface ChatSidebarProps {
  users: User[];
  selectedUser: User;
  onSelectUser: (user: User) => void;
}

export function ChatSidebar({ users, selectedUser, onSelectUser }: ChatSidebarProps) {
    const [searchTerm, setSearchTerm] = React.useState('');

    const filteredUsers = users.filter(user => 
        user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.phone.includes(searchTerm)
    );

    return (
        <div className="flex flex-col h-full">
            <div className="p-4">
                 <h2 className="text-xl font-bold mb-4">Contacts</h2>
                <div className="relative">
                    <Input 
                        placeholder="Search by name or phone..." 
                        className="w-full pl-9"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                </div>
            </div>
            <div className="flex-1 overflow-y-auto">
                <nav className="grid gap-1 px-2">
                    {filteredUsers.map((user) => (
                        <button
                            key={user.id}
                            onClick={() => onSelectUser(user)}
                            className={cn(
                                'flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary',
                                selectedUser.id === user.id && 'bg-muted text-primary'
                            )}
                        >
                            <Avatar className="w-8 h-8">
                                <AvatarImage src={user.avatar} alt={user.name} />
                                <AvatarFallback>{user.name[0]}</AvatarFallback>
                            </Avatar>
                            <div className="flex-1 text-left">
                                <p className="font-medium">{user.name}</p>
                            </div>
                        </button>
                    ))}
                </nav>
            </div>
        </div>
    );
}
