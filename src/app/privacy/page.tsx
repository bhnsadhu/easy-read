import { SiteHeader } from "@/components/site-header";

export const metadata = { title: "Privacy" };

export default function PrivacyPage() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-prose px-4 py-12 text-lg">
        <h1 className="font-display text-4xl">Privacy</h1>
        <p className="mt-4 text-ink-muted">ReadEasy is built so that students never have to give it anything.</p>
        <h2 className="mt-8 text-2xl font-bold">Students</h2>
        <ul className="mt-2 list-disc space-y-2 pl-6">
          <li>No accounts, names, emails, or passwords. A student opens a link or types a class code.</li>
          <li>No analytics or tracking on student pages. Reading settings stay in the browser on that device and are never sent anywhere.</li>
          <li>Links use unguessable tokens, are hidden from search engines, and can be rotated by the teacher at any time.</li>
          <li>Nothing a student does is reported back to the teacher.</li>
        </ul>
        <h2 className="mt-8 text-2xl font-bold">Teachers</h2>
        <ul className="mt-2 list-disc space-y-2 pl-6">
          <li>We store your email, your classes, the materials you upload, and the adapted versions.</li>
          <li>Sign-in is a one-time email link. There is no password.</li>
          <li>Uploaded content goes to the AI provider only to produce the adapted version and is never written to logs.</li>
          <li>Before processing, uploads are scanned for likely student personal information so you can remove it first.</li>
          <li>You can delete a material or a class at any time.</li>
        </ul>
        <h2 className="mt-8 text-2xl font-bold">Built with COPPA and FERPA in mind</h2>
        <p className="mt-2">Collecting nothing from students means there is no student record to protect. Teacher data is isolated by database row-level security, and anonymous visitors can read only published content through a specific link.</p>
      </main>
    </>
  );
}
