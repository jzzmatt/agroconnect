import { SignIn as ClerkSignIn, SignUp as ClerkSignUp, UserButton as ClerkUserButton } from "@clerk/nextjs";

export function SignInButton() {
  return (
    <ClerkSignIn
      appearance={{
        elements: {
          formButtonPrimary: "bg-emerald-700 hover:bg-emerald-800 text-white font-medium",
          card: "shadow-lg border border-emerald-100 rounded-xl",
          headerTitle: "text-emerald-950 font-bold",
          headerSubtitle: "text-emerald-700",
        },
      }}
    />
  );
}

export function SignUpButton() {
  return (
    <ClerkSignUp
      appearance={{
        elements: {
          formButtonPrimary: "bg-emerald-700 hover:bg-emerald-800 text-white font-medium",
          card: "shadow-lg border border-emerald-100 rounded-xl",
          headerTitle: "text-emerald-950 font-bold",
          headerSubtitle: "text-emerald-700",
        },
      }}
    />
  );
}

export function UserProfileButton() {
  return (
    <ClerkUserButton
      appearance={{
        elements: {
          userButtonAvatarBox: "w-9 h-9 ring-2 ring-emerald-600/30",
        },
      }}
    />
  );
}
