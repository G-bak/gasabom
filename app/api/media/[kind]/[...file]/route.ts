import { serveMedia } from "@/lib/media-response";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
type Context = { params: Promise<{ kind: string; file: string[] }> };
export async function GET(request: Request, context: Context) {
  const { kind, file } = await context.params;
  return serveMedia(request, kind, file);
}
export async function HEAD(request: Request, context: Context) {
  return GET(request, context);
}
