
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { MessageSquare } from "lucide-react";

export default function Footer() {
  return (
    <footer className="border-t">
      <div className="container mx-auto px-4 py-6 flex flex-col sm:flex-row justify-between items-center">
        <p className="text-sm text-muted-foreground mb-4 sm:mb-0">
          © {new Date().getFullYear()} All rights reserved
        </p>
        <div className="flex items-center gap-4">
          <Button variant="outline" asChild>
            <Link href="/chat">
              <MessageSquare className="mr-2" />
              Send us a message
            </Link>
          </Button>
        </div>
      </div>
    </footer>
  );
}
