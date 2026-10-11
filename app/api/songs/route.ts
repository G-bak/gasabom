import {
  ensureLocalRequest,
  apiError,
  LibraryError,
  JSON_LIMIT,
  AUDIO_LIMIT,
  exclusive,
  getStoredSong,
  saveSong,
  deleteSong,
  limitedForm,
  limitedBody,
} from "@/lib/library-service";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  try {
    ensureLocalRequest(request, false);
    return Response.json(
      await getStoredSong(
        process.cwd(),
        new URL(request.url).searchParams.get("id") || "",
      ),
    );
  } catch (error) {
    return apiError(error);
  }
}
async function save(request: Request, edit: boolean) {
  try {
    ensureLocalRequest(request);
    const form = await limitedForm(
      request,
      AUDIO_LIMIT + JSON_LIMIT + 1024 * 1024,
    );
    const raw = form.get("song");
    if (typeof raw !== "string" || Buffer.byteLength(raw) > JSON_LIMIT)
      throw new LibraryError("곡 JSON은 최대 10MB입니다.", 413);
    let song;
    try {
      song = JSON.parse(raw);
    } catch {
      throw new LibraryError("곡 JSON 형식을 확인하세요.");
    }
    const file = form.get("audio");
    if (
      file instanceof File &&
      (!/\.mp3$/i.test(file.name) || file.size > AUDIO_LIMIT)
    )
      throw new LibraryError("100MB 이하의 MP3를 선택하세요.", 413);
    const audio =
      file instanceof File ? new Uint8Array(await file.arrayBuffer()) : null;
    const expected = form.get("revision");
    if (edit && typeof expected !== "string")
      throw new LibraryError("편집할 자료를 다시 불러오세요.", 409);
    return Response.json(
      await exclusive(() =>
        saveSong(
          process.cwd(),
          song,
          audio,
          edit ? String(expected) : undefined,
        ),
      ),
      { status: edit ? 200 : 201 },
    );
  } catch (error) {
    return apiError(error);
  }
}
export async function POST(request: Request) {
  return save(request, false);
}
export async function PUT(request: Request) {
  return save(request, true);
}
export async function DELETE(request: Request) {
  try {
    ensureLocalRequest(request);
    let value;
    try {
      value = JSON.parse(
        (await limitedBody(request, 1024 * 1024)).toString("utf8"),
      );
    } catch (error) {
      if (error instanceof LibraryError) throw error;
      throw new LibraryError("삭제 요청의 형식을 확인하세요.");
    }
    if (
      !value ||
      typeof value.id !== "string" ||
      typeof value.revision !== "string"
    )
      throw new LibraryError("삭제할 곡과 자료 버전이 필요합니다.");
    return Response.json(
      await exclusive(() =>
        deleteSong(process.cwd(), value.id, value.revision),
      ),
    );
  } catch (error) {
    return apiError(error);
  }
}
