// Typed errors for the ingest pipeline. Every code has a teacher-facing
// message that says what happened and what to do next (BRAND.md §10).

export type IngestErrorCode =
  | "password_protected"
  | "corrupt"
  | "too_many_pages"
  | "empty"
  | "too_large"
  | "too_small"
  | "too_short"
  | "unsupported_type"
  | "heic"
  | "invalid_url"
  | "blocked_url"
  | "fetch_failed"
  | "timeout"
  | "too_many_redirects"
  | "http_error"
  | "paywalled"
  | "unsupported_content"
  | "page_empty";

export type IngestErrorDetails = {
  // Page count of the offending PDF (too_many_pages).
  pages?: number;
  // The limit that was exceeded: pages, MB, or bytes depending on the code.
  limit?: number;
  // Size of the offending input in MB (too_large).
  sizeMb?: number;
  // HTTP status (http_error).
  status?: number;
  // What kind of thing was rejected, used to pick wording ("document", "page", "photo").
  kind?: string;
  // Extra text from the sniffer explaining why a type is unsupported.
  reason?: string;
};

type MessageFn = (d: IngestErrorDetails) => string;

const MESSAGES: Record<IngestErrorCode, MessageFn> = {
  password_protected: () =>
    "This PDF is password-protected. Remove the password and upload it again, or paste the text.",
  corrupt: (d) =>
    d.kind === "photo"
      ? "We couldn't open that photo. Take it again, or upload a different one."
      : "We couldn't open that file. It may be damaged. Export it again, or paste the text.",
  too_many_pages: (d) =>
    `That PDF has ${d.pages ?? "too many"} pages. ReadEasy handles up to ${d.limit ?? 40} at a time. Split it, or paste the pages you need.`,
  empty: () => "That file doesn't have any text we can read. Try a different file, or paste the text.",
  too_large: (d) => {
    if (d.kind === "document") {
      return `That document unpacks to more than ${d.limit ?? 50} MB. Save a smaller copy, or paste the text.`;
    }
    if (d.kind === "page") {
      return `That page is bigger than ${d.limit ?? 5} MB. Copy the part you need and paste it.`;
    }
    if (d.kind === "photo") {
      return "That photo is too big for us to open. Take it again at a lower resolution, or upload a PDF.";
    }
    const size = d.sizeMb !== undefined ? `${d.sizeMb} MB` : "too big";
    return `That file is ${size}. ReadEasy accepts files up to ${d.limit ?? 25} MB. Compress it, split it, or paste the text.`;
  },
  too_small: () => "That photo is too small to read. Take it again closer to the page, or paste the text.",
  too_short: () => "That's only a few words. Add at least 20 words, or upload the full reading.",
  unsupported_type: (d) =>
    d.reason ?? "We can't read that type of file. Upload a PDF, Word document, photo, or text file, or paste the text.",
  heic: () =>
    "That's a HEIC photo, which we can't read yet. On iPhone, share it as a JPEG, or take a screenshot and upload that.",
  invalid_url: () => "That doesn't look like a web address. Check the link and try again, or paste the text.",
  blocked_url: () => "That link points somewhere we can't reach. Links must be public web pages. Paste the text instead.",
  fetch_failed: () => "We couldn't load that page. Check the link, or paste the text.",
  timeout: () => "That page took too long to load. Try again, or paste the text.",
  too_many_redirects: () =>
    "That link kept redirecting. Open the page in your browser, copy the final address, and try again.",
  http_error: (d) => `That page returned an error (${d.status ?? "unknown"}). Check the link, or paste the text.`,
  paywalled: () => "That page needs a login or subscription. Open it in your browser and paste the text.",
  unsupported_content: () => "That link isn't a web page or text file. Upload the file itself, or paste the text.",
  page_empty: () => "We couldn't find readable text at that link. Open the page, copy the text, and paste it instead.",
};

export class IngestError extends Error {
  readonly code: IngestErrorCode;
  readonly userMessage: string;
  readonly details: IngestErrorDetails;

  constructor(code: IngestErrorCode, details: IngestErrorDetails = {}, options?: { cause?: unknown }) {
    const userMessage = MESSAGES[code](details);
    super(userMessage, options);
    this.name = "IngestError";
    this.code = code;
    this.userMessage = userMessage;
    this.details = details;
  }
}

export function isIngestError(e: unknown): e is IngestError {
  return e instanceof IngestError || (typeof e === "object" && e !== null && (e as { name?: string }).name === "IngestError");
}

export function userMessageFor(code: IngestErrorCode, details: IngestErrorDetails = {}): string {
  return MESSAGES[code](details);
}
