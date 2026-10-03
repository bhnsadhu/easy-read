import "server-only";
import { unstable_cache, revalidateTag } from "next/cache";
import { getHandleByCode, getPublicClass, getPublicMaterial, type PublicClass, type PublicMaterial } from "./public";

// Student pages are read far more than they change (35 students opening one
// link at once). Published content is cached per token/handle and invalidated
// when a teacher publishes, edits, unpublishes, or rotates a link.

export const classTag = (handle: string) => `class:${handle.toLowerCase()}`;
export const materialTag = (token: string) => `material:${token}`;

export function cachedPublicClass(handle: string): Promise<PublicClass | null> {
  const h = handle.toLowerCase();
  return unstable_cache(() => getPublicClass(h), ["public-class", h], { tags: [classTag(h)], revalidate: 300 })();
}

export function cachedPublicMaterial(token: string): Promise<PublicMaterial | null> {
  return unstable_cache(() => getPublicMaterial(token), ["public-material", token], { tags: [materialTag(token)], revalidate: 300 })();
}

export function cachedHandleByCode(code: string): Promise<string | null> {
  const c = code.toUpperCase().replace(/[^A-Z0-9]/g, "");
  return unstable_cache(() => getHandleByCode(c), ["class-code", c], { revalidate: 60 })();
}

export function invalidateMaterial(token: string, classHandle?: string | null) {
  revalidateTag(materialTag(token), "max");
  if (classHandle) revalidateTag(classTag(classHandle), "max");
}

export function invalidateClass(handle: string) {
  revalidateTag(classTag(handle), "max");
}
