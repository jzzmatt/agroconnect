"use client";

import { SignUp } from "@clerk/nextjs";
import Link from "next/link";
import { Sprout } from "lucide-react";
import { useAuthRedirectUrl } from "@/hooks/useAuthRedirectUrl";

export default function SignUpPage() {
  const redirectUrl = useAuthRedirectUrl("/dashboard");

  return (
    <div className="min-h-screen bg-background flex flex-col justify-center items-center p-4 sm:p-6 transition-colors">
      <div className="mb-6 flex flex-col items-center text-center">
        <Link href="/" className="flex items-center gap-2.5 mb-2 group">
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center text-primary-foreground shadow-md group-hover:bg-primary-hover transition-colors">
            <Sprout className="w-6 h-6 text-emerald-200" />
          </div>
          <span className="text-2xl font-black tracking-tight text-foreground font-sans">
            AGROCONNECT
          </span>
        </Link>
        <p className="text-xs text-muted-foreground font-medium">
          Crie a sua conta no maior ecossistema agropecuário de Angola
        </p>
      </div>

      <div className="w-full max-w-md flex justify-center">
        <SignUp
          routing="path"
          path="/sign-up"
          signInUrl="/sign-in"
          fallbackRedirectUrl={redirectUrl}
          forceRedirectUrl={redirectUrl}
          appearance={{
            elements: {
              card: "shadow-xl border border-border bg-surface-card rounded-3xl p-6 sm:p-8",
              headerTitle: "text-foreground font-black text-xl text-center",
              headerSubtitle: "text-muted-foreground text-xs text-center",
              socialButtonsBlockButton:
                "border border-border bg-surface text-foreground hover:bg-muted font-bold text-xs rounded-xl h-11 transition-all",
              formButtonPrimary:
                "bg-primary hover:bg-primary-hover text-primary-foreground font-extrabold text-sm rounded-xl h-11 shadow-md transition-all",
              formFieldInput:
                "bg-input border-input-border text-foreground rounded-xl text-sm focus:ring-2 focus:ring-ring focus:border-transparent h-10",
              formFieldLabel: "text-foreground font-bold text-xs",
              footerActionLink: "text-primary font-bold hover:underline",
              identityPreviewText: "text-foreground font-medium",
              identityPreviewEditButtonIcon: "text-primary",
            },
          }}
        />
      </div>
    </div>
  );
}
