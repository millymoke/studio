
"use client"

import * as React from 'react';
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { ChatSidebar } from './chat-sidebar';
import { ChatMessages } from './chat-messages';
import { Separator } from './ui/separator';

interface ChatLayoutProps {
  defaultLayout: number[] | undefined;
}

const mockUsers = [
    { id: 1, name: 'Alice', avatar: 'https://picsum.photos/id/101/50', phone: '123-456-7890', messages: [{ sender: 'other', text: 'Hey there!' }, { sender: 'me', text: 'Hi Alice!' }]},
    { id: 2, name: 'Bob', avatar: 'https://picsum.photos/id/102/50', phone: '234-567-8901', messages: [{ sender: 'other', text: 'What\'s up?' }] },
    { id: 3, name: 'Charlie', avatar: 'https://picsum.photos/id/103/50', phone: '345-678-9012', messages: [] },
    { id: 4, name: 'Diana', avatar: 'https://picsum.photos/id/104/50', phone: '456-789-0123', messages: [] },
];


export function ChatLayout({ defaultLayout = [265, 1000] }: ChatLayoutProps) {
  const [selectedUser, setSelectedUser] = React.useState(mockUsers[0]);

  return (
    <ResizablePanelGroup
      direction="horizontal"
      className="h-full w-full rounded-lg border"
      onLayout={(sizes: number[]) => {
        document.cookie = `react-resizable-panels:layout=${JSON.stringify(sizes)}`;
      }}
    >
      <ResizablePanel defaultSize={defaultLayout[0]} minSize={30}>
        <ChatSidebar users={mockUsers} selectedUser={selectedUser} onSelectUser={setSelectedUser} />
      </ResizablePanel>
      <ResizableHandle withHandle />
      <ResizablePanel defaultSize={defaultLayout[1]}>
         {selectedUser ? (
            <div className="flex flex-col h-full">
                <div className="p-4 flex items-center gap-3">
                    <h2 className="text-xl font-bold">{selectedUser.name}</h2>
                </div>
                <Separator />
                <ChatMessages user={selectedUser} />
            </div>
         ) : (
            <div className="flex flex-col h-full items-center justify-center text-muted-foreground">
                <p>Select a contact to start chatting</p>
                <p className="text-sm">or search for a new user.</p>
            </div>
         )}
      </ResizablePanel>
    </ResizablePanelGroup>
  );
}
