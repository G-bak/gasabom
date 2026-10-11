import {
  ensureLocalRequest,
  apiError,
  LibraryError,
  BACKUP_LIMIT,
  exclusive,
  exportLibrary,
  inspectArchive,
  restoreArchive,
  limitedForm,
} from "@/lib/library-service";
import { getCatalogue } from "@/lib/songs";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  try {
    ensureLocalRequest(request);
    const zip = await exclusive(async () => {
      const catalogue = await getCatalogue();
      if (catalogue.issues.length)
        throw new LibraryError("오류가 있는 곡을 확인한 뒤 백업하세요.");
      return exportLibrary(process.cwd(), catalogue.songs);
    });
    return new Response(zip, {
      headers: {
        "content-type": "application/zip",
        "content-disposition": "attachment; filename=gasabom-library.zip",
        "cache-control": "no-store",
      },
    });
  } catch (error) {
    return apiError(error);
  }
}
export async function POST(request: Request) {
  try {
    ensureLocalRequest(request);
    const form = await limitedForm(request, BACKUP_LIMIT + 1024 * 1024);
    const file = form.get("archive");
    if (!(file instanceof File) || file.size > BACKUP_LIMIT)
      throw new LibraryError("250MB 이하의 곡 자료 ZIP을 선택하세요.", 413);
    const bytes = new Uint8Array(await file.arrayBuffer());
    return await exclusive(async () => {
      if (form.get("action") === "restore") {
        let expected;
        try {
          expected = JSON.parse(String(form.get("versions")));
        } catch {
          throw new LibraryError("백업을 다시 확인하세요.");
        }
        return Response.json(
          await restoreArchive(
            process.cwd(),
            bytes,
            String(form.get("policy")),
            expected,
          ),
        );
      }
      const plan = await inspectArchive(process.cwd(), bytes);
      return Response.json({
        songs: plan.songs.map((s) => ({ id: s.id, title: s.title })),
        files: Object.keys(plan.entries),
        conflicts: plan.conflicts,
        versions: plan.versions,
        digest: plan.digest,
      });
    });
  } catch (error) {
    return apiError(error);
  }
}
