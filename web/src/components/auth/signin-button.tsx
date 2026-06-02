'use client';

import { Button } from "@/components/ui/button";
import { GitHub } from "@/components/icons";
import { signin } from "@/actions/auth";

import { useState } from "react";
import { Loader } from "lucide-react";

export default function SignInButton() {
  const [isLoading, setIsLoading] = useState(false);
  const [isDevLoading, setIsDevLoading] = useState(false);
  const isDev = process.env.NODE_ENV !== "production";

  return (
    <div className="flex flex-col gap-3">
      <Button
        onClick={() => {
          setIsLoading(true);
          signin();
        }}>
        {isLoading ? <Loader className="animate-spin" /> : <GitHub />}
        Continue with GitHub
      </Button>
      {isDev && (
        <Button
          variant="outline"
          onClick={async () => {
            setIsDevLoading(true);
            // Fetch CSRF token then submit a real form POST so the browser
            // sends the __Host-next-auth.csrf-token cookie correctly.
            const { csrfToken } = await fetch('/api/auth/csrf').then(r => r.json());
            const form = document.createElement('form');
            form.method = 'POST';
            form.action = '/api/auth/signin/dev-login';
            for (const [name, value] of Object.entries({ csrfToken, callbackUrl: '/' })) {
              const input = document.createElement('input');
              input.type = 'hidden';
              input.name = name;
              input.value = value as string;
              form.appendChild(input);
            }
            document.body.appendChild(form);
            form.submit();
          }}>
          {isDevLoading ? <Loader className="animate-spin" /> : null}
          Dev Login (local only)
        </Button>
      )}
    </div>
  );
}
