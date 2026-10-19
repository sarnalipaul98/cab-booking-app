
import { SignIn } from "@clerk/nextjs";
import { Suspense } from "react";

export default function SignInPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 p-4">
      <Suspense fallback={<p>Loading sign in...</p>}>
        <SignIn />
      </Suspense>
    </main>
  );
}
