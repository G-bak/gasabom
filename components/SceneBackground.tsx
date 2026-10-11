import manifest from "@/public/images/backgrounds/manifest.json";
export function SceneBackground({
  scene,
  priority = false,
}: {
  scene: keyof typeof manifest.pages;
  priority?: boolean;
}) {
  const images = manifest.pages[scene];
  const ultrawideSet = (format: "webp" | "avif") =>
    images.ultrawide.map((x) => `${x[format]} ${x.width}w`).join(", ");
  const srcset = (device: "mobile" | "desktop", format: "webp" | "avif") =>
    images[device].map((x) => `${x[format]} ${x.width}w`).join(", ");
  return (
    <picture className="scene-background" aria-hidden="true">
      <source
        media="(min-width: 1921px)"
        type="image/avif"
        srcSet={ultrawideSet("avif")}
        sizes="100vw"
      />
      <source
        media="(min-width: 1921px)"
        type="image/webp"
        srcSet={ultrawideSet("webp")}
        sizes="100vw"
      />
      <source
        media="(max-width: 700px)"
        type="image/avif"
        srcSet={srcset("mobile", "avif")}
        sizes="100vw"
      />
      <source
        media="(max-width: 700px)"
        type="image/webp"
        srcSet={srcset("mobile", "webp")}
        sizes="100vw"
      />
      <source
        type="image/avif"
        srcSet={srcset("desktop", "avif")}
        sizes="100vw"
      />
      <img
        src={images.desktop[1].webp}
        srcSet={srcset("desktop", "webp")}
        sizes="100vw"
        alt=""
        loading={priority ? "eager" : "lazy"}
        fetchPriority={priority ? "high" : "auto"}
      />
    </picture>
  );
}
