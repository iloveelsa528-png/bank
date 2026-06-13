import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";

const ALLOWED_MIME = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const EXT_MAP: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png":  ".png",
  "image/webp": ".webp",
  "image/gif":  ".gif",
};
const MAX_BYTES = 5 * 1024 * 1024; // 5 MB

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();

    const file = formData.get("file");
    const slotId = formData.get("slotId");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "file 필드가 없습니다." }, { status: 400 });
    }
    if (typeof slotId !== "string" || !/^[A-Za-z]$/.test(slotId)) {
      return NextResponse.json(
        { error: "slotId는 영문 한 글자(A~Z)여야 합니다." },
        { status: 400 },
      );
    }
    if (!ALLOWED_MIME.has(file.type)) {
      return NextResponse.json(
        { error: "지원하지 않는 파일 형식입니다. (jpg, png, webp, gif만 허용)" },
        { status: 400 },
      );
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json(
        { error: `파일 크기가 너무 큽니다. (최대 ${MAX_BYTES / 1024 / 1024}MB)` },
        { status: 400 },
      );
    }

    const ext      = EXT_MAP[file.type] ?? ".jpg";
    const uuid     = randomUUID();
    const filename = `${slotId.toUpperCase()}${ext}`;
    const dirPath  = path.join(process.cwd(), "public", "uploads", "passage-images", uuid);
    const filePath = path.join(dirPath, filename);

    await fs.mkdir(dirPath, { recursive: true });
    const buffer = Buffer.from(await file.arrayBuffer());
    await fs.writeFile(filePath, buffer);

    const url = `/uploads/passage-images/${uuid}/${filename}`;
    return NextResponse.json({ url });
  } catch (err) {
    console.error("[POST /api/uploads/passage-image]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "업로드 실패" },
      { status: 500 },
    );
  }
}
