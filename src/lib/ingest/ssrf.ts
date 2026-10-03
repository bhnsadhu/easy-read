import { isIP } from "node:net";
import { IngestError } from "./errors";

// Server-side request forgery guard for URL imports. We never trust `new URL`
// alone: hosts are re-parsed with a strict IPv4 normaliser (octal, hex,
// decimal and shortened forms) and IPv6 is expanded so mapped/embedded IPv4
// addresses are checked too.

// Strict IPv4 parser. Accepts 1 to 4 parts; each part may be decimal, octal
// (leading 0) or hex (0x). Returns a canonical dotted quad or null.
export function parseIPv4(host: string): string | null {
  let h = host.trim();
  if (h.endsWith(".")) h = h.slice(0, -1);
  if (!h) return null;
  const parts = h.split(".");
  if (parts.length < 1 || parts.length > 4) return null;
  const values: number[] = [];
  for (const part of parts) {
    let v: number;
    if (/^0x[0-9a-f]+$/i.test(part)) v = parseInt(part.slice(2), 16);
    else if (/^0[0-7]*$/.test(part)) v = part.length === 1 ? 0 : parseInt(part.slice(1), 8);
    else if (/^[1-9][0-9]*$/.test(part)) v = parseInt(part, 10);
    else return null;
    if (!Number.isFinite(v)) return null;
    values.push(v);
  }
  const last = values[values.length - 1];
  if (last === undefined) return null;
  // All but the last part must fit in one byte; the last part fills the rest.
  for (let i = 0; i < values.length - 1; i++) {
    if ((values[i] ?? 256) > 255) return null;
  }
  const remaining = 4 - (values.length - 1);
  if (last >= 256 ** remaining) return null;
  const bytes: number[] = values.slice(0, -1);
  for (let i = remaining - 1; i >= 0; i--) bytes.push(Math.floor(last / 256 ** i) % 256);
  return bytes.join(".");
}

function v4ToInt(dotted: string): number {
  const [a = 0, b = 0, c = 0, d = 0] = dotted.split(".").map(Number);
  return ((a << 24) >>> 0) + (b << 16) + (c << 8) + d;
}

function inCidr4(ip: number, cidr: string): boolean {
  const [base, bitsStr] = cidr.split("/");
  const bits = Number(bitsStr);
  const baseInt = v4ToInt(parseIPv4(base ?? "") ?? "0.0.0.0");
  const mask = bits === 0 ? 0 : (0xffffffff << (32 - bits)) >>> 0;
  return ((ip & mask) >>> 0) === ((baseInt & mask) >>> 0);
}

// Everything that is not a public unicast address.
const PRIVATE_V4 = [
  "0.0.0.0/8", // "this" network
  "10.0.0.0/8", // RFC 1918
  "100.64.0.0/10", // CGNAT
  "127.0.0.0/8", // loopback
  "169.254.0.0/16", // link-local and cloud metadata
  "172.16.0.0/12", // RFC 1918
  "192.0.0.0/24", // IETF protocol assignments
  "192.0.2.0/24", // TEST-NET-1
  "192.168.0.0/16", // RFC 1918
  "198.18.0.0/15", // benchmarking
  "198.51.100.0/24", // TEST-NET-2
  "203.0.113.0/24", // TEST-NET-3
  "224.0.0.0/4", // multicast
  "240.0.0.0/4", // reserved and broadcast
];

export function isPrivateIPv4(dotted: string): boolean {
  const ip = v4ToInt(dotted);
  return PRIVATE_V4.some((cidr) => inCidr4(ip, cidr));
}

// Expands an IPv6 literal to eight 16-bit groups. Handles "::" compression
// and an embedded dotted IPv4 in the last 32 bits. Returns null when invalid.
export function expandIPv6(ip: string): number[] | null {
  let s = ip.trim();
  if (s.startsWith("[") && s.endsWith("]")) s = s.slice(1, -1);
  const zone = s.indexOf("%");
  if (zone !== -1) s = s.slice(0, zone);
  if (isIP(s) !== 6) return null;

  // Replace a trailing dotted IPv4 with two hex groups.
  const lastColon = s.lastIndexOf(":");
  const tail = s.slice(lastColon + 1);
  if (tail.includes(".")) {
    const v4 = parseIPv4(tail);
    if (!v4) return null;
    const [a = 0, b = 0, c = 0, d = 0] = v4.split(".").map(Number);
    s = `${s.slice(0, lastColon + 1)}${((a << 8) | b).toString(16)}:${((c << 8) | d).toString(16)}`;
  }

  const halves = s.split("::");
  if (halves.length > 2) return null;
  const head = halves[0] ? halves[0].split(":") : [];
  const rest = halves.length === 2 && halves[1] ? halves[1].split(":") : [];
  const missing = 8 - head.length - rest.length;
  if (halves.length === 2 ? missing < 1 : missing !== 0) return null;
  const groups = [...head, ...(halves.length === 2 ? Array<string>(missing).fill("0") : []), ...rest];
  const out: number[] = [];
  for (const g of groups) {
    if (!/^[0-9a-f]{1,4}$/i.test(g)) return null;
    out.push(parseInt(g, 16));
  }
  return out.length === 8 ? out : null;
}

function v4FromGroups(hi: number, lo: number): string {
  return `${hi >> 8}.${hi & 0xff}.${lo >> 8}.${lo & 0xff}`;
}

export function isPrivateIPv6(groups: number[]): boolean {
  const [g0 = 0, g1 = 0, g2 = 0, g3 = 0, g4 = 0, g5 = 0, g6 = 0, g7 = 0] = groups;
  const allZeroTo = (n: number) => groups.slice(0, n).every((g) => g === 0);
  // :: (unspecified) and ::1 (loopback)
  if (allZeroTo(7) && (g7 === 0 || g7 === 1)) return true;
  // ::ffff:a.b.c.d (IPv4-mapped) and ::ffff:0:a.b.c.d (IPv4-translated)
  if (allZeroTo(5) && g5 === 0xffff) return isPrivateIPv4(v4FromGroups(g6, g7));
  if (allZeroTo(4) && g4 === 0xffff && g5 === 0) return isPrivateIPv4(v4FromGroups(g6, g7));
  // ::a.b.c.d (deprecated IPv4-compatible)
  if (allZeroTo(6)) return isPrivateIPv4(v4FromGroups(g6, g7));
  // 64:ff9b::/96 (NAT64) carries an IPv4 address in the low 32 bits.
  if (g0 === 0x64 && g1 === 0xff9b && g2 === 0 && g3 === 0 && g4 === 0 && g5 === 0) {
    return isPrivateIPv4(v4FromGroups(g6, g7));
  }
  // 2002::/16 (6to4) embeds the IPv4 address in bits 16-48.
  if (g0 === 0x2002) return isPrivateIPv4(v4FromGroups(g1, g2));
  // fe80::/10 link-local, fec0::/10 site-local (deprecated)
  if ((g0 & 0xffc0) === 0xfe80 || (g0 & 0xffc0) === 0xfec0) return true;
  // fc00::/7 unique local
  if ((g0 & 0xfe00) === 0xfc00) return true;
  // ff00::/8 multicast
  if ((g0 & 0xff00) === 0xff00) return true;
  // 2001:db8::/32 documentation
  if (g0 === 0x2001 && g1 === 0xdb8) return true;
  // Teredo (2001::/32) and ORCHID (2001:10::/28) are not public unicast either.
  if (g0 === 0x2001 && (g1 === 0 || (g1 & 0xfff0) === 0x10)) return true;
  return false;
}

// True for any address that must never be fetched. Unparseable input counts
// as private so the guard fails closed.
export function isPrivateAddress(ip: string): boolean {
  const v4 = parseIPv4(ip);
  if (v4) return isPrivateIPv4(v4);
  const v6 = expandIPv6(ip);
  if (v6) return isPrivateIPv6(v6);
  return true;
}

const BLOCKED_HOSTS = new Set(["localhost", "metadata.google.internal", "metadata", "instance-data", "ip6-localhost", "ip6-loopback"]);
const BLOCKED_SUFFIXES = [".localhost", ".local", ".internal", ".localdomain", ".home.arpa", ".intranet", ".corp", ".lan"];

export function isBlockedHostname(hostname: string): boolean {
  let h = hostname.toLowerCase();
  if (h.endsWith(".")) h = h.slice(0, -1);
  if (BLOCKED_HOSTS.has(h)) return true;
  return BLOCKED_SUFFIXES.some((suffix) => h.endsWith(suffix));
}

// Hostname without IPv6 brackets.
export function bareHostname(url: URL): string {
  const h = url.hostname;
  return h.startsWith("[") && h.endsWith("]") ? h.slice(1, -1) : h;
}

// Validates scheme and host before any network activity. Returns the parsed
// URL so callers work from the normalised form.
export function assertPublicHttpUrl(input: string): URL {
  let url: URL;
  try {
    url = new URL(input.trim());
  } catch {
    throw new IngestError("invalid_url");
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") throw new IngestError("invalid_url");
  if (url.username || url.password) throw new IngestError("blocked_url");
  const host = bareHostname(url);
  if (!host) throw new IngestError("invalid_url");
  if (isBlockedHostname(host)) throw new IngestError("blocked_url");
  // Numeric hosts in any form are checked directly.
  if (parseIPv4(host) !== null || isIP(host) !== 0) {
    if (isPrivateAddress(host)) throw new IngestError("blocked_url");
  }
  return url;
}
