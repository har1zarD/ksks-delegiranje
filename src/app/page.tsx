import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getCurrentUser, homeFor } from "@/lib/auth";

export default function Home() {
  return (
    <Suspense>
      <RedirectHome />
    </Suspense>
  );
}

async function RedirectHome() {
  const user = await getCurrentUser();
  redirect(homeFor(user.role));
  return null;
}
