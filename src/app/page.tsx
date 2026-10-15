import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getCurrentUser, homeFor } from "@/lib/auth";
import { AppNavSkeleton } from "@/app/(app)/nav";
import { PageHeaderSkeleton, Skeleton } from "@/components/skeleton";
import { cx, GUTTER } from "@/components/ui";

export default function Home() {
  return (
    <Suspense fallback={<HomeSkeleton />}>
      <RedirectHome />
    </Suspense>
  );
}

async function RedirectHome() {
  const user = await getCurrentUser();
  redirect(homeFor(user.role));
  return null;
}

/** Dok se čita uloga: okvir aplikacije kao u (app)/layout, umjesto praznog ekrana */
function HomeSkeleton() {
  return (
    <>
      <AppNavSkeleton />
      <main className={cx("mx-auto w-full max-w-6xl flex-1 pt-6 sm:pt-10", GUTTER)}>
        <Skeleton>
          <PageHeaderSkeleton />
        </Skeleton>
      </main>
    </>
  );
}
