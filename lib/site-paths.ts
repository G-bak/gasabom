export const siteBasePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

// Next Link/router handle basePath themselves; native media elements need it here.
export function publicAssetUrl(src: string, basePath = siteBasePath) {
  if (!src.startsWith("/") || src.startsWith("//")) return src;
  return `${basePath}${src}`;
}
