
import Header from '@/components/header';
import Footer from '@/components/footer';
import Protected from '@/components/protected';
import { AccountSettingsForm } from '@/components/account-settings-form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Settings } from 'lucide-react';

export default function AccountSettingsPage() {
  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Header />
      <main className="flex-1 flex items-center justify-center py-12 px-4">
        <Protected>
        <Card className="w-full max-w-2xl">
          <CardHeader>
            <div className="flex items-center gap-3">
              <Settings className="w-8 h-8 text-primary" />
              <div>
                <CardTitle className="text-2xl">Account Settings</CardTitle>
                <CardDescription>
                  Manage your account details and preferences.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <AccountSettingsForm />
          </CardContent>
        </Card>
        </Protected>
      </main>
      <Footer />
    </div>
  );
}
