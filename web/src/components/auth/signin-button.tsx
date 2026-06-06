'use client';

import { Button } from "@/components/ui/button";
import { GitHub } from "@/components/icons";

import { useState } from "react";
import { Loader } from "lucide-react";
import { signIn } from "next-auth/react";

export default function SignInButton() {
  const [isLoading, setIsLoading] = useState(false);
  const [isDevLoading, setIsDevLoading] = useState(false);
  const isDev = process.env.NODE_ENV !== "production";

  return (
    <div className="flex flex-col gap-3">
      <Button
        onClick={() => {
          setIsLoading(true);
          void signIn("github", { callbackUrl: "/" }).catch(error => {
            console.error("GitHub sign-in failed", error);
            setIsLoading(false);
          });
        }}>
        {isLoading ? <Loader className="animate-spin" /> : <GitHub />}
        Continue with GitHub
      </Button>
      {isDev && (
        <Button
          variant="outline"
          onClick={() => {
            setIsDevLoading(true);
            void signIn("dev-login", { callbackUrl: "/" }).catch(error => {
              console.error("Dev sign-in failed", error);
              setIsDevLoading(false);
            });
          }}>
          {isDevLoading ? <Loader className="animate-spin" /> : null}
          Dev Login (local only)
        </Button>
      )}
    </div>
  );
}
