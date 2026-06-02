'use client';

import { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string; status?: number };
  reset: () => void;
}) {
  const isAuthError = (error as { status?: number }).status === 401 ||
    error.message?.includes('Bad credentials') ||
    error.message?.includes('credentials');

  useEffect(() => {
    console.error(error);
    if (isAuthError) {
      import('next-auth/react').then(({ signOut }) => signOut({ callbackUrl: '/signin' }));
    }
  }, [error, isAuthError]);

  if (isAuthError) return null;

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center">
      <p className="text-muted-foreground">Something went wrong loading this page.</p>
      <button
        onClick={reset}
        className="text-sm underline underline-offset-4 hover:text-primary"
      >
        Try again
      </button>
    </div>
  );
}