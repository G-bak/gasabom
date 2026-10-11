import { Suspense } from "react";
import type { Metadata } from "next";
import { SettingsScreen } from "@/components/SettingsScreen";
import { getCatalogue } from "@/lib/songs";
import { getLibraryFiles } from "@/lib/library-files";
export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "곡 등록·데이터 관리" };
export default async function SettingsPage() {
  const [{ songs, issues }, files] = await Promise.all([
    getCatalogue(),
    getLibraryFiles(),
  ]);
  return (
    <Suspense
      fallback={
        <main className="container loading-page">자료를 불러오고 있어요.</main>
      }
    >
      <SettingsScreen songs={songs} files={files} issues={issues} />
    </Suspense>
  );
}
