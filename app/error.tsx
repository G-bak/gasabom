"use client";
import Link from "next/link";
import { SETTINGS_VISIBLE } from "@/lib/features";
export default function ErrorPage({ retry }: { retry: () => void }) {
  return (
    <main className="container loading-page">
      <h1>화면을 불러오지 못했습니다</h1>
      <p>자료 폴더와 파일 권한을 확인한 뒤 다시 시도하세요.</p>
      <button className="button button-primary" onClick={retry}>
        다시 시도
      </button>{" "}
      {SETTINGS_VISIBLE && <Link href="/settings">자료 관리</Link>}
    </main>
  );
}
