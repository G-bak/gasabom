import { promises as fs } from "node:fs";
import { Readable } from "node:stream";
import path from "node:path";
import {
  safeFile,
  ensureLocalRequest,
  LibraryError,
  AUDIO_LIMIT,
  JSON_LIMIT,
} from "./library-service";
export async function serveMedia(
  request: Request,
  kind: string,
  parts: string[],
  root = process.cwd(),
) {
  let handle: Awaited<ReturnType<typeof fs.open>> | undefined;
  try {
    ensureLocalRequest(request, false);
    if (
      !["audio", "covers"].includes(kind) ||
      !Array.isArray(parts) ||
      !parts.length
    )
      return new Response(null, { status: 404 });
    const filename = await safeFile(root, `public/${kind}/${parts.join("/")}`);
    handle = await fs.open(filename, "r");
    const stat = await handle.stat();
    if (
      !stat.isFile() ||
      stat.size > (kind === "audio" ? AUDIO_LIMIT : JSON_LIMIT)
    )
      throw new LibraryError("자료 파일의 크기를 확인하세요.", 413);
    const etag = `W/"${stat.size.toString(16)}-${stat.mtimeMs.toString(16)}"`;
    const types: Record<string, string> = {
      ".mp3": "audio/mpeg",
      ".svg": "image/svg+xml",
      ".png": "image/png",
      ".webp": "image/webp",
      ".jpg": "image/jpeg",
      ".jpeg": "image/jpeg",
      ".avif": "image/avif",
    };
    const headers = new Headers({
      "content-type":
        types[path.extname(filename)] || "application/octet-stream",
      "accept-ranges": "bytes",
      "cache-control": "private, no-cache",
      etag,
      "last-modified": stat.mtime.toUTCString(),
      "x-content-type-options": "nosniff",
    });
    if (filename.endsWith(".svg"))
      headers.set(
        "content-security-policy",
        "default-src 'none'; style-src 'unsafe-inline'; sandbox",
      );
    if (
      !request.headers.has("range") &&
      request.headers.get("if-none-match") === etag
    ) {
      await handle.close();
      return new Response(null, { status: 304, headers });
    }
    let start = 0,
      end = stat.size - 1,
      status = 200;
    const range = request.headers.get("range"),
      ifRange = request.headers.get("if-range");
    if (
      range &&
      (!ifRange || ifRange === etag || ifRange === stat.mtime.toUTCString())
    ) {
      const match = range.match(/^bytes=(\d*)-(\d*)$/);
      if (!match || (!match[1] && !match[2])) {
        await handle.close();
        headers.set("content-range", `bytes */${stat.size}`);
        return new Response(null, { status: 416, headers });
      }
      if (!match[1]) start = Math.max(0, stat.size - Number(match[2]));
      else {
        start = Number(match[1]);
        if (match[2]) end = Math.min(end, Number(match[2]));
      }
      if (
        !Number.isSafeInteger(start) ||
        !Number.isSafeInteger(end) ||
        start > end ||
        start >= stat.size ||
        (!match[1] && Number(match[2]) === 0)
      ) {
        await handle.close();
        headers.set("content-range", `bytes */${stat.size}`);
        return new Response(null, { status: 416, headers });
      }
      status = 206;
      headers.set("content-range", `bytes ${start}-${end}/${stat.size}`);
    }
    headers.set("content-length", String(Math.max(0, end - start + 1)));
    if (request.method === "HEAD" || stat.size === 0) {
      await handle.close();
      return new Response(null, { status, headers });
    }
    const stream = Readable.toWeb(
      handle.createReadStream({ start, end, autoClose: true }),
    ) as ReadableStream<Uint8Array>;
    return new Response(stream, { status, headers });
  } catch (error) {
    await handle?.close().catch(() => undefined);
    const missing = (error as NodeJS.ErrnoException).code === "ENOENT";
    return new Response(
      missing
        ? "자료 파일이 없습니다."
        : error instanceof LibraryError
          ? error.message
          : "자료를 읽을 수 없습니다.",
      {
        status: missing
          ? 404
          : error instanceof LibraryError
            ? error.status
            : 500,
      },
    );
  }
}
