import dns from "node:dns";
import http from "node:http";
import https from "node:https";
import { isIP } from "node:net";
import { Readable } from "node:stream";
import { Readability } from "@mozilla/readability";
import { parseHTML } from "linkedom";
import type { ExtractedDocument } from "@/lib/content/types";
import { IngestError } from "./errors";
import { elementToText, firstHeading } from "./html-text";
import { assertPublicHttpUrl, bareHostname, isPrivateAddress } from "./ssrf";
import { countWords, MIN_WORDS, normaliseText } from "./text";

export const URL_TIMEOUT_MS = 10_000;
export const URL_MAX_BYTES = 5 * 1024 * 1024;
export const URL_MAX_REDIRECTS = 3;
const PAYWALL_MAX_WORDS = 400;
const USER_AGENT = "ReadEasy/1.0 (+https://readeasy.app; reading import)";

export type ResolvedAddress = { address: string; family: number };
export type LookupFn = (hostname: string) => Promise<ResolvedAddress[]>;
export type FetchInit = { signal: AbortSignal; headers: Record<string, string>; redirect: "manual" };
// The pinned address is the one DNS gave us and we validated; the fetch must
// connect to it rather than resolving the hostname again (rebinding guard).
export type Pin = { address: string; family: 4 | 6; hostname: string };
export type FetchFn = (url: string, init: FetchInit, pin: Pin) => Promise<Response>;

export type UrlDeps = {
  lookup?: LookupFn;
  fetch?: FetchFn;
  timeoutMs?: number;
  maxBytes?: number;
  maxRedirects?: number;
};

export const defaultLookup: LookupFn = async (hostname) => dns.promises.lookup(hostname, { all: true, verbatim: true });

const NULL_BODY_STATUS = new Set([101, 204, 205, 304]);

// A fetch built on node:http(s) so the socket connects to the pinned IP while
// TLS still verifies the certificate against the hostname.
export const pinnedFetch: FetchFn = (url, init, pin) =>
  new Promise<Response>((resolve, reject) => {
    const u = new URL(url);
    const mod = u.protocol === "https:" ? https : http;
    const lookup: net.LookupFunction = (_host, options, callback) => {
      if (options.all) {
        (callback as unknown as (err: null, addresses: ResolvedAddress[]) => void)(null, [
          { address: pin.address, family: pin.family },
        ]);
      } else {
        callback(null, pin.address, pin.family);
      }
    };
    const req = mod.request(
      u,
      {
        method: "GET",
        headers: init.headers,
        signal: init.signal,
        lookup,
        servername: isIP(pin.hostname) ? undefined : pin.hostname,
      },
      (res) => {
        const status = res.statusCode ?? 0;
        const headers = new Headers();
        for (const [k, v] of Object.entries(res.headers)) {
          if (Array.isArray(v)) for (const item of v) headers.append(k, item);
          else if (typeof v === "string") headers.set(k, v);
        }
        try {
          const body = NULL_BODY_STATUS.has(status)
            ? null
            : (Readable.toWeb(res) as unknown as ReadableStream<Uint8Array>);
          if (body === null) res.resume();
          resolve(new Response(body, { status: Math.min(Math.max(status, 200), 599), headers }));
        } catch (e) {
          reject(e);
        }
      },
    );
    req.on("error", reject);
    req.end();
  });

type net = typeof import("node:net");
// eslint-disable-next-line @typescript-eslint/no-namespace
declare namespace net {
  type LookupFunction = import("node:net").LookupFunction;
}

function isAbort(e: unknown): boolean {
  const name = (e as { name?: string } | null)?.name;
  return name === "AbortError" || name === "TimeoutError";
}

function parseContentType(header: string | null): { type: string; charset: string } {
  const [rawType = "", ...params] = (header ?? "").split(";");
  const type = rawType.trim().toLowerCase();
  let charset = "utf-8";
  for (const p of params) {
    const [k, v] = p.split("=").map((s) => s.trim().toLowerCase());
    if (k === "charset" && v) charset = v.replace(/^"|"$/g, "");
  }
  return { type, charset };
}

async function readCapped(res: Response, maxBytes: number, signal: AbortSignal): Promise<Uint8Array> {
  if (!res.body) return new Uint8Array(0);
  const reader = res.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    for (;;) {
      if (signal.aborted) throw new IngestError("timeout");
      const { done, value } = await reader.read();
      if (done) break;
      if (!value) continue;
      total += value.byteLength;
      if (total > maxBytes) {
        await reader.cancel().catch(() => undefined);
        throw new IngestError("too_large", { kind: "page", limit: Math.round(maxBytes / (1024 * 1024)) });
      }
      chunks.push(value);
    }
  } catch (e) {
    if (e instanceof IngestError) throw e;
    if (isAbort(e) || signal.aborted) throw new IngestError("timeout", {}, { cause: e });
    throw new IngestError("fetch_failed", {}, { cause: e });
  }
  const out = new Uint8Array(total);
  let offset = 0;
  for (const c of chunks) {
    out.set(c, offset);
    offset += c.byteLength;
  }
  return out;
}

function decode(bytes: Uint8Array, charset: string): string {
  try {
    return new TextDecoder(charset).decode(bytes);
  } catch {
    return new TextDecoder("utf-8").decode(bytes);
  }
}

const PAYWALL_PHRASES = [
  "subscribe to continue",
  "subscribe to read",
  "sign in to read",
  "log in to read",
  "login to read",
  "sign in to continue",
  "log in to continue",
  "create a free account to continue",
  "subscribers only",
];

export function looksPaywalled(document: Document): boolean {
  const robots = document.querySelector('meta[name="robots"]')?.getAttribute("content")?.toLowerCase() ?? "";
  const hasPassword = Boolean(document.querySelector('input[type="password"]'));
  if (robots.includes("noindex") && hasPassword) return true;
  const bodyText = (document.body?.textContent ?? "").replace(/\s+/g, " ").toLowerCase();
  if (countWords(bodyText) < PAYWALL_MAX_WORDS && PAYWALL_PHRASES.some((p) => bodyText.includes(p))) return true;
  return false;
}

export function htmlPageToDocument(html: string): ExtractedDocument {
  const { document } = parseHTML(html);
  if (looksPaywalled(document)) throw new IngestError("paywalled");

  const pageTitle = document.querySelector("title")?.textContent?.trim() ?? "";
  let text = "";
  let title: string | undefined;
  let article: ReturnType<Readability["parse"]> = null;
  try {
    article = new Readability(document, { charThreshold: 200 }).parse();
  } catch {
    article = null;
  }
  if (article?.content) {
    const { document: articleDoc } = parseHTML(`<!doctype html><html><body>${article.content}</body></html>`);
    text = elementToText(articleDoc.body);
    title = article.title?.trim() || undefined;
  }
  if (!text.trim()) {
    // Readability found no article; fall back to the whole body minus chrome.
    const { document: fresh } = parseHTML(html);
    for (const el of Array.from(fresh.querySelectorAll("nav, header, footer, aside, script, style, noscript, form"))) {
      el.remove();
    }
    text = fresh.body ? elementToText(fresh.body) : "";
  }
  text = normaliseText(text);
  if (countWords(text) < MIN_WORDS) throw new IngestError("page_empty");

  const doc: ExtractedDocument = { text, warnings: [] };
  const finalTitle = title || pageTitle || firstHeading(text);
  if (finalTitle) doc.title = finalTitle.slice(0, 300);
  return doc;
}

async function resolvePinned(url: URL, lookup: LookupFn): Promise<Pin> {
  const hostname = bareHostname(url);
  if (isIP(hostname) !== 0) {
    if (isPrivateAddress(hostname)) throw new IngestError("blocked_url");
    return { address: hostname, family: isIP(hostname) === 6 ? 6 : 4, hostname };
  }
  let addresses: ResolvedAddress[];
  try {
    addresses = await lookup(hostname);
  } catch (cause) {
    throw new IngestError("fetch_failed", {}, { cause });
  }
  if (!addresses.length) throw new IngestError("fetch_failed");
  // One private answer is enough to refuse: a mixed answer is how rebinding starts.
  if (addresses.some((a) => isPrivateAddress(a.address))) throw new IngestError("blocked_url");
  const first = addresses[0];
  if (!first) throw new IngestError("fetch_failed");
  return { address: first.address, family: first.family === 6 ? 6 : 4, hostname };
}

export async function fetchUrlToText(input: string, deps: UrlDeps = {}): Promise<ExtractedDocument> {
  const lookup = deps.lookup ?? defaultLookup;
  const fetchFn = deps.fetch ?? pinnedFetch;
  const timeoutMs = deps.timeoutMs ?? URL_TIMEOUT_MS;
  const maxBytes = deps.maxBytes ?? URL_MAX_BYTES;
  const maxRedirects = deps.maxRedirects ?? URL_MAX_REDIRECTS;

  let current = assertPublicHttpUrl(input);
  const signal = AbortSignal.timeout(timeoutMs);

  for (let hop = 0; ; hop++) {
    const pin = await resolvePinned(current, lookup);
    let res: Response;
    try {
      res = await fetchFn(
        current.href,
        {
          signal,
          redirect: "manual",
          headers: {
            "user-agent": USER_AGENT,
            accept: "text/html,application/xhtml+xml,text/plain;q=0.9,*/*;q=0.1",
            "accept-language": "en",
            "accept-encoding": "identity",
          },
        },
        pin,
      );
    } catch (cause) {
      if (cause instanceof IngestError) throw cause;
      if (isAbort(cause) || signal.aborted) throw new IngestError("timeout", {}, { cause });
      throw new IngestError("fetch_failed", {}, { cause });
    }

    if ([301, 302, 303, 307, 308].includes(res.status)) {
      await res.body?.cancel().catch(() => undefined);
      const location = res.headers.get("location");
      if (!location) throw new IngestError("fetch_failed");
      if (hop + 1 > maxRedirects) throw new IngestError("too_many_redirects");
      let next: URL;
      try {
        next = new URL(location, current);
      } catch {
        throw new IngestError("invalid_url");
      }
      // Every hop is validated like the first one.
      current = assertPublicHttpUrl(next.href);
      continue;
    }

    if (res.status === 401 || res.status === 403) {
      await res.body?.cancel().catch(() => undefined);
      throw new IngestError("paywalled");
    }
    if (res.status < 200 || res.status >= 300) {
      await res.body?.cancel().catch(() => undefined);
      throw new IngestError("http_error", { status: res.status });
    }

    const { type, charset } = parseContentType(res.headers.get("content-type"));
    const isHtml = type === "text/html" || type === "application/xhtml+xml";
    const isText = type === "text/plain";
    if (!isHtml && !isText) {
      await res.body?.cancel().catch(() => undefined);
      throw new IngestError("unsupported_content");
    }

    const bytes = await readCapped(res, maxBytes, signal);
    const body = decode(bytes, charset);

    if (isText) {
      const text = normaliseText(body);
      if (countWords(text) < MIN_WORDS) throw new IngestError("page_empty");
      const doc: ExtractedDocument = { text, warnings: [] };
      const title = firstHeading(text);
      if (title) doc.title = title;
      return doc;
    }
    return htmlPageToDocument(body);
  }
}
