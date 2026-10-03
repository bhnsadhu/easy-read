import "server-only";
import { randomBytes } from "node:crypto";
import { hasSupabase, publicEnv, serverEnv } from "./env";
import { withDb } from "./db";

export const UPLOAD_BUCKET = "uploads";
// Without object storage, uploads pass through a route handler, which Vercel
// caps at 4.5 MB. With Supabase Storage they go browser -> bucket directly.
export const DIRECT_UPLOAD_MAX_BYTES = 4 * 1024 * 1024;

export function newUploadId(): string {
  return `${Date.now().toString(36)}_${randomBytes(12).toString("base64url")}`;
}

export function isValidUploadId(id: string): boolean {
  return /^[a-z0-9]{6,12}_[A-Za-z0-9_-]{16}$/.test(id);
}

export function uploadMode(): "signed" | "direct" {
  return hasSupabase() && serverEnv().SUPABASE_SERVICE_ROLE_KEY ? "signed" : "direct";
}

async function admin() {
  const { createClient } = await import("@supabase/supabase-js");
  return createClient(publicEnv.NEXT_PUBLIC_SUPABASE_URL!, serverEnv().SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
}

export async function createSignedUpload(ownerKey: string, uploadId: string): Promise<{ path: string; signedUrl: string; token: string }> {
  const storagePath = `${ownerKey}/${uploadId}`;
  const { data, error } = await (await admin()).storage.from(UPLOAD_BUCKET).createSignedUploadUrl(storagePath);
  if (error || !data) throw new Error(`signed upload failed: ${error?.message ?? "unknown"}`);
  return { path: storagePath, signedUrl: data.signedUrl, token: data.token };
}

// Direct mode keeps bytes in Postgres so any server instance can read them.
export async function storeDirectUpload(ownerKey: string, uploadId: string, mime: string, bytes: Uint8Array): Promise<void> {
  await withDb({ role: "service" }, async (q) => {
    await q("delete from uploads where created_at < now() - interval '1 day'");
    await q("insert into uploads (id, owner_key, mime, bytes) values ($1, $2, $3, $4)", [uploadId, ownerKey, mime, bytes]);
  });
}

export async function readUpload(ownerKey: string, uploadId: string): Promise<Uint8Array | null> {
  if (!isValidUploadId(uploadId)) return null;
  if (uploadMode() === "signed") {
    const { data, error } = await (await admin()).storage.from(UPLOAD_BUCKET).download(`${ownerKey}/${uploadId}`);
    if (error || !data) return null;
    return new Uint8Array(await data.arrayBuffer());
  }
  const r = await withDb({ role: "service" }, (q) => q<{ bytes: Uint8Array | Buffer }>("select bytes from uploads where id = $1 and owner_key = $2", [uploadId, ownerKey]));
  const row = r.rows[0];
  return row ? new Uint8Array(row.bytes) : null;
}

export async function deleteUpload(ownerKey: string, uploadId: string): Promise<void> {
  if (!isValidUploadId(uploadId)) return;
  if (uploadMode() === "signed") {
    await (await admin()).storage.from(UPLOAD_BUCKET).remove([`${ownerKey}/${uploadId}`]);
    return;
  }
  await withDb({ role: "service" }, (q) => q("delete from uploads where id = $1 and owner_key = $2", [uploadId, ownerKey]));
}
