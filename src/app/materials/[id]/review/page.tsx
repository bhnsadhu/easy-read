import { notFound, redirect } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import { ReviewClient } from "@/components/teacher/review-client";
import { resolveOwner } from "@/lib/auth/owner";
import { getSession } from "@/lib/auth/session";
import { listClasses } from "@/lib/data/classes";
import { getMaterialWithSections } from "@/lib/data/materials";
import { NotFoundError } from "@/lib/data/types";
import { publicEnv } from "@/lib/env";

export const metadata = { title: "Review" };

export default async function ReviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const owner = await resolveOwner();
  if (!owner) redirect("/");
  let data;
  try {
    data = await getMaterialWithSections(owner, id);
  } catch (e) {
    if (e instanceof NotFoundError) notFound();
    throw e;
  }
  const session = await getSession();
  const classes = session ? await listClasses(session.sub) : [];
  return (
    <>
      <SiteHeader />
      <ReviewClient
        material={{
          id: data.material.id,
          title: data.material.title,
          status: data.material.status,
          version: data.material.version,
          classId: data.material.class_id,
          shareToken: data.material.share_token,
          tldr: data.material.tldr,
          wordPreview: data.material.word_preview,
          supports: data.material.supports,
        }}
        sections={data.sections.map((s) => ({ id: s.id, position: s.position, status: s.status, title: s.title, about: s.about, original: s.original, levels: s.levels, factGuard: s.fact_guard, readability: s.readability, version: s.version, error: s.error }))}
        signedIn={Boolean(session)}
        classes={classes.map((c) => ({ id: c.id, name: c.name, handle: c.handle }))}
        appUrl={publicEnv.NEXT_PUBLIC_APP_URL}
      />
    </>
  );
}
