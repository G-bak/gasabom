import { LandingScreen } from "@/components/LandingScreen";
import { getAllSongs } from "@/lib/songs";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const songs = await getAllSongs();
  return <LandingScreen songs={songs} />;
}
