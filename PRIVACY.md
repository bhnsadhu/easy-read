# Privacy

ReadEasy is built so that students never have to give it anything.

## Students

- No accounts, names, emails, or passwords. A student opens a link or types a class code.
- No analytics, cookies, or tracking on student pages. Reading settings and progress are saved in the browser's local storage on that device only, and never sent anywhere.
- Class and material links use unguessable 128-bit tokens, are marked "noindex" for search engines, and are rate-limited. A teacher can rotate a link at any time, which disables the old one immediately.
- Nothing a student does is reported back to the teacher.

## Teachers

- We store the teacher's email address, their classes, the materials they upload, and the adapted versions.
- Sign-in uses a one-time email link. There is no password to leak.
- Uploaded content is sent to the AI provider (Anthropic) only to produce the adapted version, and is never written to logs.
- Before processing, ReadEasy scans uploads for likely student personal information (names next to grades, emails, phone numbers, IEP or 504 references) and warns the teacher so it can be removed first.
- Teachers can delete a material or a class at any time; deletion removes the content and its adapted versions.

## Design choices with COPPA and FERPA in mind

- Collecting nothing from students means there is no student record to protect, share, or request.
- Teacher-owned data is isolated by database row-level security: one teacher can never read or change another's data, and anonymous visitors can read only published content through a specific link.
- Student pages are served with a strict content security policy and no third-party scripts.

Questions: open an issue in the repository.
