import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { domainError, updateOwnProfileImage } from "@classroom-os/database";
import { NextRequest } from "next/server";

import { apiError, apiSuccess, assertSameOrigin, requireApiSession } from "@/lib/api";

const MAX_BYTES = 2 * 1024 * 1024;
const MIME_TO_EXTENSION = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" } as const;

export async function POST(request: NextRequest) {
  try {
    assertSameOrigin(request);
    const session = await requireApiSession(request);
    const form = await request.formData();
    const value = form.get("image");
    if (!value || typeof value !== "object" || !("arrayBuffer" in value) || typeof (value as { type?: unknown }).type !== "string" || !((value as { type: string }).type in MIME_TO_EXTENSION)) {
      throw domainError("VALIDATION_ERROR", "รูปภาพต้องเป็นไฟล์ JPG, PNG หรือ WebP");
    }
    const image = value as File;
    if (image.size === 0 || image.size > MAX_BYTES) throw domainError("VALIDATION_ERROR", "รูปภาพต้องมีขนาดไม่เกิน 2 MB");
    const extension = MIME_TO_EXTENSION[image.type as keyof typeof MIME_TO_EXTENSION];
    const directory = path.join(process.cwd(), "public", "uploads", "profile");
    await mkdir(directory, { recursive: true });
    const filename = `${session.context.userId}-${randomUUID()}.${extension}`;
    await writeFile(path.join(directory, filename), Buffer.from(await image.arrayBuffer()), { flag: "wx" });
    const profileImageKey = `/uploads/profile/${filename}`;
    const data = await updateOwnProfileImage(session.context, profileImageKey);
    return apiSuccess(data);
  } catch (error) {
    return apiError(error);
  }
}
