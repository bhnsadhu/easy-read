import "server-only";
import { randomBytes } from "node:crypto";
import { mkdir, readFile, writeFile, unlink } from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { hasSupabase, publicEnv, serverEnv } from "./env";

export const UPLOAD_BUCKET = "uploads";

// Uploads live in Supabase Storage in production (browser -> signed URL, never
// through our functions because of Vercel's 4.5 MB body cap). Without Supabase
// (local dev, tests) they go to a temp directory via a direct route.

export function newUploadId(): string {
  return `${Date.now().toString(36)}_${randomBytes(12).toString("base64url")}`;
}

export function isValidUploadId(id: string): boolean {
  return /^[a-z0-9]{6,12}_[A-Za-z0-9_-]{16}$/.test(id);
}

function localDir(): string {
  return process.env.UPLOAD_DIR ?? path.join(os.tmpdir(), "readeasy-uploads");
}

export function uploadMode(): "signed" | "direct" {
  return hasSupabase() && serverEnv().SUPABASE_SERVICE_ROLE_KEY ? "signed" : "direct";
}

export async function createSignedUpload(ownerKey: string, uploadId: string): Promise<{ path: string; signedUrl: string; token: string }> {
  const { createClient } = await import("@supabase/supabase-js");
  const admin = createClient(publicEnv.NEXT_PUBLIC_SUPABASE_URL!, serverEnv().SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
  const storagePath = `${ownerKey}/${uploadId}`;
  const { data, error } = await admin.storage.from(UPLOAD_BUCKET).createSignedUploadUrl(storagePath);
  if (error || !data) throw new Error(`signed upload failed: ${error?.message ?? "unknown"}`);
  return { path: storagePath, signedUrl: data.signedUrl, token: data.token };
}

export async function storeDirectUpload(uploadId: string, bytes: Uint8Array): Promise<void> {
  const dir = localDir();
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, uploadId), bytes);
}

export async function readUpload(ownerKey: string, uploadId: string): Promise<Uint8Array | null> {
  if (!isValidUploadId(uploadId)) return null;
  if (uploadMode() === "signed") {
    const { createClient } = await import("@supabase/supabase-js");
    const admin = createClient(publicEnv.NEXT_PUBLIC_SUPABASE_URL!, serverEnv().SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
    const { data, error } = await admin.storage.from(UPLOAD_BUCKET).download(`${ownerKey}/${uploadId}`);
    if (error || !data) return null;
    return new Uint8Array(await data.arrayBuffer());
  }
  try {
    return new Uint8Array(await readFile(path.join(localDir(), uploadId)));
  } catch {
    return null;
  }
}

export async function deleteUpload(ownerKey: string, uploadId: string): Promise<void> {
  if (!isValidUploadId(uploadId)) return;
  if (uploadMode() === "signed") {
    const { createClient } = await import("@supabase/supabase-js");
    const admin = createClient(publicEnv.NEXT_PUBLIC_SUPABASE_URL!, serverEnv().SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
    await admin.storage.from(UPLOAD_BUCKET).remove([`${ownerKey}/${uploadId}`]);
    return;
  }
  await unlink(path.join(localDir(), uploadId)).catch(() => undefined);
}
