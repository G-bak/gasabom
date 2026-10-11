import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SongPractice } from "@/components/SongPractice";
import { getSongById } from "@/lib/songs";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const song = await getSongById(slug);
  return {
    title: song ? `${song.title} - 가사 연습` : "곡을 찾을 수 없습니다",
  };
}

export default async function SongPage({ params }: Props) {
  const { slug } = await params;
  const song = await getSongById(slug);
  if (!song) notFound();
  return <SongPractice key={song.id} song={song} />;
}
