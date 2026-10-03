// Local, dependency-free detection of personal information in uploaded
// material. Findings are flagged for the teacher to confirm; nothing blocks.

export type PiiKind = "email" | "phone" | "ssn" | "student_id" | "iep_504" | "name_grade_table" | "dob";

export type PiiFinding = {
  kind: PiiKind;
  match: string;
  // Character offset of `match` in the original text.
  index: number;
  // 1-based line number.
  line: number;
};

export type PiiReport = { findings: PiiFinding[]; summary: string };

const EMAIL = /[\w.+-]+@[\w-]+(?:\.[\w-]+)+/g;
const IGNORED_EMAIL_DOMAINS = /(^|\.)example\.(com|org|net)$/i;

// US phone numbers, not glued to other digits, letters, or hyphens.
const PHONE = /(?<![\w/.-])(?:\+?1[ .-]?)?\(?\d{3}\)?[ .-]?\d{3}[ .-]?\d{4}(?![\w-])/g;
const SSN = /\b\d{3}-\d{2}-\d{4}\b/g;
const STUDENT_ID = /\b(?:student\s*id|student\s*#|id)\s*[:#]?\s*(\d{5,})\b/gi;
const URL = /\bhttps?:\/\/\S+|\bwww\.\S+/gi;
const ISBN_NEARBY = /isbn[^\n]{0,24}$/i;

const IEP_PATTERNS: RegExp[] = [
  /\bIEP\b/g,
  /\b504 plan\b/gi,
  /\bsection 504\b/gi,
  /\bindividualized education(?: program| plan)?\b/gi,
  /\bspecial education\b/gi,
  /\bfree (?:and|or|\/) reduced(?:-price)? lunch\b/gi,
  /\bELL\b/g,
  /\bdiagnosed with\b/gi,
];

const MONTH = "(?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\\.?";
const DATE = `(?:\\d{1,2}[/.-]\\d{1,2}[/.-]\\d{2,4}|${MONTH} \\d{1,2},? \\d{4}|\\d{1,2} ${MONTH} \\d{4}|\\d{4}-\\d{2}-\\d{2})`;
const DOB = new RegExp(`\\b(?:DOB|D\\.O\\.B\\.?|date of birth|birth ?date|birthday|born(?: on)?)\\b\\s*[:\\-]?\\s*(${DATE})`, "gi");

// "Maria Lopez: 87%", "Lopez, Maria  B+", "Jamal Carter\t92"
const NAME_GRADE_LINE = /^\s*([A-Z][\p{L}'-]+(?:,? [A-Z][\p{L}'.-]+)+)\s*(?:[:|\t-]|,|\s{2,})\s*(\d{1,3}(?:\.\d)?%?|[A-F][+-]?)\s*$/u;
const NAME_GRADE_MIN_LINES = 3;

function lineStarts(text: string): number[] {
  const starts = [0];
  for (let i = 0; i < text.length; i++) if (text.charCodeAt(i) === 10) starts.push(i + 1);
  return starts;
}

function lineAt(starts: number[], index: number): number {
  let lo = 0;
  let hi = starts.length - 1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if ((starts[mid] ?? 0) <= index) lo = mid;
    else hi = mid - 1;
  }
  return lo + 1;
}

function spansOf(text: string, re: RegExp): [number, number][] {
  const out: [number, number][] = [];
  for (const m of text.matchAll(re)) out.push([m.index, m.index + m[0].length]);
  return out;
}

function inside(spans: [number, number][], index: number): boolean {
  return spans.some(([a, b]) => index >= a && index < b);
}

export function detectPii(text: string): PiiReport {
  const findings: PiiFinding[] = [];
  const starts = lineStarts(text);
  const urls = spansOf(text, URL);
  const add = (kind: PiiKind, match: string, index: number) => {
    findings.push({ kind, match, index, line: lineAt(starts, index) });
  };

  for (const m of text.matchAll(EMAIL)) {
    const domain = m[0].slice(m[0].lastIndexOf("@") + 1);
    if (IGNORED_EMAIL_DOMAINS.test(domain)) continue;
    add("email", m[0], m.index);
  }

  const ssnSpans = spansOf(text, SSN);
  for (const m of text.matchAll(SSN)) add("ssn", m[0], m.index);

  for (const m of text.matchAll(PHONE)) {
    if (inside(urls, m.index) || inside(ssnSpans, m.index)) continue;
    const before = text.slice(Math.max(0, m.index - 30), m.index);
    if (ISBN_NEARBY.test(before)) continue;
    add("phone", m[0], m.index);
  }

  for (const m of text.matchAll(STUDENT_ID)) {
    const num = m[1];
    if (!num || inside(urls, m.index)) continue;
    const numIndex = m.index + m[0].lastIndexOf(num);
    add("student_id", num, numIndex);
  }

  for (const re of IEP_PATTERNS) {
    for (const m of text.matchAll(re)) add("iep_504", m[0], m.index);
  }

  for (const m of text.matchAll(DOB)) {
    const date = m[1];
    if (!date) continue;
    add("dob", date, m.index + m[0].lastIndexOf(date));
  }

  // Name + score tables: only when at least three such lines exist.
  const rows: { name: string; index: number }[] = [];
  const lines = text.split("\n");
  let offset = 0;
  for (const line of lines) {
    const m = line.match(NAME_GRADE_LINE);
    if (m && m[1] !== undefined) {
      const nameIndex = offset + line.indexOf(m[1]);
      rows.push({ name: m[1], index: nameIndex });
    }
    offset += line.length + 1;
  }
  if (rows.length >= NAME_GRADE_MIN_LINES) {
    for (const row of rows) add("name_grade_table", row.name, row.index);
  }

  findings.sort((a, b) => a.index - b.index);
  return { findings, summary: summarise(findings) };
}

const LABELS: Record<PiiKind, [singular: string, plural: string]> = {
  email: ["an email address", "email addresses"],
  phone: ["a phone number", "phone numbers"],
  ssn: ["a Social Security number", "Social Security numbers"],
  student_id: ["a student ID", "student IDs"],
  iep_504: ["a mention of IEP or 504 services", "mentions of IEP or 504 services"],
  name_grade_table: ["a list of student names with grades", "a list of student names with grades"],
  dob: ["a date of birth", "dates of birth"],
};

function joinList(parts: string[]): string {
  if (parts.length <= 1) return parts[0] ?? "";
  if (parts.length === 2) return `${parts[0]} and ${parts[1]}`;
  return `${parts.slice(0, -1).join(", ")}, and ${parts[parts.length - 1]}`;
}

export function summarise(findings: PiiFinding[]): string {
  if (findings.length === 0) return "No personal information found.";
  const counts = new Map<PiiKind, number>();
  for (const f of findings) counts.set(f.kind, (counts.get(f.kind) ?? 0) + 1);
  const parts: string[] = [];
  for (const kind of Object.keys(LABELS) as PiiKind[]) {
    const n = counts.get(kind);
    if (!n) continue;
    const [singular, plural] = LABELS[kind];
    if (kind === "name_grade_table") parts.push(singular);
    else parts.push(n === 1 ? singular : `${n} ${plural}`);
  }
  return `Found ${joinList(parts)}. Remove them before publishing, or keep them if they belong in the reading.`;
}

// Replaces each finding in the text. Names in grade tables become "Student";
// everything else becomes "[removed]".
export function redactPii(text: string, findings: PiiFinding[]): string {
  const ordered = [...findings].sort((a, b) => b.index - a.index || b.match.length - a.match.length);
  let out = text;
  let lastStart = Number.POSITIVE_INFINITY;
  for (const f of ordered) {
    const end = f.index + f.match.length;
    if (end > lastStart) continue; // overlaps something already replaced
    if (out.slice(f.index, end) !== f.match) continue; // text changed since detection
    const replacement = f.kind === "name_grade_table" ? "Student" : "[removed]";
    out = out.slice(0, f.index) + replacement + out.slice(end);
    lastStart = f.index;
  }
  return out;
}
