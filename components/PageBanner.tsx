import type { ReactNode } from "react";
import { SceneBackground } from "@/components/SceneBackground";
export function PageBanner({
  scene,
  eyebrow,
  title,
  children,
}: {
  scene: "library" | "practice" | "settings";
  eyebrow: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <section className={`page-banner banner-${scene}`}>
      <SceneBackground scene={scene} priority />
      <div className="container banner-copy">
        <span className="eyebrow">{eyebrow}</span>
        <h1>{title}</h1>
        <p>{children}</p>
      </div>
    </section>
  );
}
