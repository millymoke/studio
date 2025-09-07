
import Header from '@/components/header';
import Footer from '@/components/footer';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Edit } from 'lucide-react';

export default function ProfilePage() {
    const user = { 
        username: 'Maalai', 
        email: 'maalai@example.com',
        bio: 'Sharing my world, one file at a time. Content creator and tech enthusiast.',
        avatar: 'https://picsum.photos/200'
    };
    
    return (
        <div className="flex flex-col min-h-screen bg-background">
            <Header />
            <main className="flex-1 py-12 px-4">
                <div className="container mx-auto max-w-4xl">
                    <Card>
                        <CardHeader className="flex flex-row items-center gap-6 space-y-0 pb-6">
                            <Avatar className="h-24 w-24">
                                <AvatarImage src={user.avatar} alt={user.username} data-ai-hint="user avatar" />
                                <AvatarFallback>{user.username.charAt(0).toUpperCase()}</AvatarFallback>
                            </Avatar>
                            <div className="flex-1">
                                <div className="flex items-center justify-between">
                                    <h1 className="text-3xl font-bold">{user.username}</h1>
                                    <Button variant="outline" size="sm">
                                        <Edit className="mr-2 h-4 w-4" />
                                        Edit Profile
                                    </Button>
                                </div>
                                <p className="text-muted-foreground">{user.email}</p>
                                <p className="text-sm mt-2">{user.bio}</p>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <h2 className="text-2xl font-bold mb-4">My Uploads</h2>
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                {/* Placeholder for user's uploaded content */}
                                {Array.from({ length: 8 }).map((_, i) => (
                                    <div key={i} className="aspect-square bg-muted rounded-lg flex items-center justify-center">
                                        <p className="text-muted-foreground text-sm">Content {i + 1}</p>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </main>
            <Footer />
        </div>
    );
}
