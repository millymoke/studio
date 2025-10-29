
import Header from '@/components/header';
import Footer from '@/components/footer';
import { ChatLayout } from '@/components/chat-layout';
import { cookies } from 'next/headers';

export default async function ChatPage() {
  const cookieStore = await cookies();
  const layout = cookieStore.get?.("react-resizable-panels:layout");
  const defaultLayout = layout ? JSON.parse(layout.value) : undefined;

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Header />
      <main className="flex-1 flex items-center justify-center py-12 px-4">
        <div className="w-full max-w-6xl h-[calc(100vh-12rem)]">
          <ChatLayout defaultLayout={defaultLayout} />
        </div>
      </main>
      <Footer />
    </div>
  );
}
