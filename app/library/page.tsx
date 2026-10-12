import { Suspense } from "react";
import type { Metadata } from "next";
import { LibraryScreen } from "@/components/LibraryScreen";
import { getAllSongs } from "@/lib/songs";
export const dynamic = "force-static";
export const metadata: Metadata = { title: "내 노래 보관함" };
export default async function LibraryPage() {
  return (
    <Suspense
      fallback={
        <main className="container loading-page">
          보관함을 불러오고 있어요.
        </main>
      }
    >
      <LibraryScreen songs={await getAllSongs()} />
    </Suspense>
  );
}
