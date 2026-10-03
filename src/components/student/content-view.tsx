import type { SectionContent } from "@/lib/content/types";

// Plain renderer for teacher review (no read-aloud). Never renders HTML.
export function ContentView({ content, dense = false }: { content: SectionContent; dense?: boolean }) {
  return (
    <div className={dense ? "flex flex-col gap-2" : "flex flex-col gap-5"}>
      {content.blocks.map((b, i) => {
        switch (b.type) {
          case "heading":
            return <p key={i} className={dense ? "font-bold" : "text-xl font-bold"}>{b.text}</p>;
          case "paragraph":
            return <p key={i}>{b.sentences.join(" ")}</p>;
          case "list":
            return b.ordered ? <ol key={i} className="list-decimal pl-6">{b.items.map((it, j) => <li key={j}>{it.join(" ")}</li>)}</ol> : <ul key={i} className="list-disc pl-6">{b.items.map((it, j) => <li key={j}>{it.join(" ")}</li>)}</ul>;
          case "math":
            return <pre key={i} className="whitespace-pre-wrap rounded-md bg-surface-sunken p-2 font-mono text-sm">{b.text}</pre>;
          case "table":
            return (
              <table key={i} className="text-sm"><tbody>{b.rows.map((r, j) => <tr key={j}>{r.map((c, k) => <td key={k} className="border border-border px-2 py-1">{c}</td>)}</tr>)}</tbody></table>
            );
          case "image":
            return <p key={i} className="text-ink-muted">[Image: {b.alt}]</p>;
        }
      })}
    </div>
  );
}
