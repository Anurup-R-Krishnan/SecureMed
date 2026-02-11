import Link from 'next/link';

export default function NotFound() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-background p-6">
            <div className="max-w-md w-full text-center space-y-6">
                <h1 className="text-6xl font-black text-primary">404</h1>
                <h2 className="text-2xl font-bold text-foreground">Page Not Found</h2>
                <p className="text-muted-foreground">
                    The page you&apos;re looking for doesn&apos;t exist or has been moved.
                </p>
                <div className="flex gap-4 justify-center">
                    <Link
                        href="/"
                        className="px-6 py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors"
                    >
                        Go Home
                    </Link>
                    <Link
                        href="/login"
                        className="px-6 py-3 border border-border rounded-lg font-medium hover:bg-muted transition-colors"
                    >
                        Log In
                    </Link>
                </div>
            </div>
        </div>
    );
}
