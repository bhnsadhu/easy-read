// Rule-based plain-language rewriter. Used as the built-in adapter (no API
// key needed) and as the deterministic stand-in in tests. It never adds or
// removes facts: it splits long sentences, replaces academic vocabulary with
// everyday words, and untangles clauses. Fact Guard still verifies the output.

import type { Block, SectionContent } from "@/lib/content/types";

export type Level = "medium" | "simple";

// base form -> [base, 3rd person, past, -ing]
const VERBS: Record<string, [string, string, string, string]> = {
  demonstrate: ["show", "shows", "showed", "showing"],
  illustrate: ["show", "shows", "showed", "showing"],
  indicate: ["show", "shows", "showed", "showing"],
  utilize: ["use", "uses", "used", "using"],
  utilise: ["use", "uses", "used", "using"],
  obtain: ["get", "gets", "got", "getting"],
  acquire: ["get", "gets", "got", "getting"],
  require: ["need", "needs", "needed", "needing"],
  commence: ["start", "starts", "started", "starting"],
  initiate: ["start", "starts", "started", "starting"],
  terminate: ["end", "ends", "ended", "ending"],
  assist: ["help", "helps", "helped", "helping"],
  attempt: ["try", "tries", "tried", "trying"],
  purchase: ["buy", "buys", "bought", "buying"],
  possess: ["have", "has", "had", "having"],
  comprehend: ["understand", "understands", "understood", "understanding"],
  construct: ["build", "builds", "built", "building"],
  generate: ["make", "makes", "made", "making"],
  produce: ["make", "makes", "made", "making"],
  manufacture: ["make", "makes", "made", "making"],
  eliminate: ["remove", "removes", "removed", "removing"],
  modify: ["change", "changes", "changed", "changing"],
  alter: ["change", "changes", "changed", "changing"],
  transform: ["change", "changes", "changed", "changing"],
  observe: ["see", "sees", "saw", "seeing"],
  occur: ["happen", "happens", "happened", "happening"],
  perform: ["do", "does", "did", "doing"],
  remain: ["stay", "stays", "stayed", "staying"],
  retain: ["keep", "keeps", "kept", "keeping"],
  maintain: ["keep", "keeps", "kept", "keeping"],
  select: ["choose", "chooses", "chose", "choosing"],
  transmit: ["send", "sends", "sent", "sending"],
  reside: ["live", "lives", "lived", "living"],
  inhabit: ["live in", "lives in", "lived in", "living in"],
  consume: ["use up", "uses up", "used up", "using up"],
  depart: ["leave", "leaves", "left", "leaving"],
  enable: ["let", "lets", "let", "letting"],
  permit: ["allow", "allows", "allowed", "allowing"],
  prevent: ["stop", "stops", "stopped", "stopping"],
  enhance: ["improve", "improves", "improved", "improving"],
  diminish: ["shrink", "shrinks", "shrank", "shrinking"],
  decrease: ["go down", "goes down", "went down", "going down"],
  increase: ["go up", "goes up", "went up", "going up"],
  reduce: ["lower", "lowers", "lowered", "lowering"],
  accumulate: ["build up", "builds up", "built up", "building up"],
  emerge: ["come out", "comes out", "came out", "coming out"],
  release: ["let out", "lets out", "let out", "letting out"],
  encounter: ["meet", "meets", "met", "meeting"],
  establish: ["set up", "sets up", "set up", "setting up"],
  determine: ["find out", "finds out", "found out", "finding out"],
  examine: ["look at", "looks at", "looked at", "looking at"],
  investigate: ["look into", "looks into", "looked into", "looking into"],
  locate: ["find", "finds", "found", "finding"],
  discover: ["find", "finds", "found", "finding"],
  function: ["work", "works", "worked", "working"],
  operate: ["work", "works", "worked", "working"],
  reflect: ["bounce back", "bounces back", "bounced back", "bouncing back"],
  convert: ["turn", "turns", "turned", "turning"],
  contain: ["hold", "holds", "held", "holding"],
  comprise: ["make up", "makes up", "made up", "making up"],
  constitute: ["make up", "makes up", "made up", "making up"],
  represent: ["stand for", "stands for", "stood for", "standing for"],
  respond: ["answer", "answers", "answered", "answering"],
  inquire: ["ask", "asks", "asked", "asking"],
  assess: ["judge", "judges", "judged", "judging"],
  evaluate: ["judge", "judges", "judged", "judging"],
  calculate: ["work out", "works out", "worked out", "working out"],
  anticipate: ["expect", "expects", "expected", "expecting"],
  recall: ["remember", "remembers", "remembered", "remembering"],
  depict: ["show", "shows", "showed", "showing"],
  state: ["say", "says", "said", "saying"],
  reveal: ["show", "shows", "showed", "showing"],
};

const VERB_FORMS = new Map<string, string>();
for (const [base, forms] of Object.entries(VERBS)) {
  const stem = base.endsWith("e") ? base.slice(0, -1) : base;
  VERB_FORMS.set(base, forms[0]);
  VERB_FORMS.set(base.endsWith("y") && !/[aeiou]y$/.test(base) ? `${base.slice(0, -1)}ies` : base.endsWith("s") || base.endsWith("x") || base.endsWith("ch") ? `${base}es` : `${base}s`, forms[1]);
  VERB_FORMS.set(base.endsWith("e") ? `${base}d` : base.endsWith("y") && !/[aeiou]y$/.test(base) ? `${base.slice(0, -1)}ied` : /[aeiou][bdgmnpt]$/.test(base) && base.length <= 6 ? `${base}${base.slice(-1)}ed` : `${base}ed`, forms[2]);
  VERB_FORMS.set(`${stem}ing`, forms[3]);
}

const WORDS: Record<string, string> = {
  approximately: "about", roughly: "about", additionally: "also", furthermore: "also", moreover: "also",
  consequently: "so", therefore: "so", thus: "so", hence: "so", accordingly: "so",
  however: "but", nevertheless: "still", nonetheless: "still", whereas: "while",
  subsequently: "later", previously: "before", initially: "at first", ultimately: "in the end", eventually: "in the end",
  frequently: "often", occasionally: "sometimes", rarely: "not often", primarily: "mainly", predominantly: "mainly",
  sufficient: "enough", insufficient: "not enough", adequate: "enough", numerous: "many", various: "different",
  significant: "important", substantial: "large", considerable: "large", enormous: "huge", immense: "huge", minute: "tiny",
  fundamental: "basic", essential: "needed", crucial: "very important", vital: "very important", principal: "main", primary: "main",
  individuals: "people", individual: "person", majority: "most", minority: "a few", component: "part", components: "parts",
  portion: "part", segment: "part", element: "part", elements: "parts", region: "area", regions: "areas",
  location: "place", locations: "places", residence: "home", vehicle: "car", automobile: "car", beverage: "drink",
  purchase: "buy", assistance: "help", objective: "goal", objectives: "goals", initial: "first", final: "last",
  prior: "earlier", subsequent: "later", additional: "extra", alternative: "other", identical: "the same", similar: "alike",
  beneath: "under", within: "in", upon: "on", amongst: "among", regarding: "about", concerning: "about",
  despite: "even with", via: "through", whilst: "while", thereby: "and so", wherein: "where", whereby: "by which",
  commonly: "often", typically: "usually", generally: "usually", approximate: "rough", magnitude: "size",
  numerical: "number", velocity: "speed", rapid: "fast", rapidly: "fast", gradually: "slowly", abundant: "plentiful",
  scarce: "rare", exterior: "outside", interior: "inside", adjacent: "next to", remote: "far away", vast: "huge",
  ascend: "go up", descend: "go down", assemble: "put together", disassemble: "take apart",
  responsible: "in charge of", capable: "able", visible: "able to be seen", invisible: "hidden", audible: "able to be heard",
  nutrients: "food", nutrition: "food", consumption: "use", utilization: "use", production: "making", construction: "building",
  organism: "living thing", organisms: "living things", species: "kinds of living things", habitat: "home", habitats: "homes",
  precipitation: "rain or snow", atmosphere: "air", vegetation: "plants",
};

const PHRASES: [RegExp, string][] = [
  [/\bin order to\b/gi, "to"],
  [/\bdue to the fact that\b/gi, "because"],
  [/\bowing to the fact that\b/gi, "because"],
  [/\bin spite of the fact that\b/gi, "although"],
  [/\bas a result of\b/gi, "because of"],
  [/\bas a consequence of\b/gi, "because of"],
  [/\bfor the purpose of\b/gi, "to"],
  [/\bwith the exception of\b/gi, "except"],
  [/\bin the event that\b/gi, "if"],
  [/\bat this point in time\b/gi, "now"],
  [/\bat the present time\b/gi, "now"],
  [/\ba large number of\b/gi, "many"],
  [/\ba great deal of\b/gi, "a lot of"],
  [/\bthe majority of\b/gi, "most"],
  [/\bin the vicinity of\b/gi, "near"],
  [/\bis responsible for giving\b/gi, "gives"],
  [/\bare responsible for giving\b/gi, "give"],
  [/\bis responsible for (\w+ing)\b/gi, "is what does the $1"],
  [/\bprior to\b/gi, "before"],
  [/\bsubsequent to\b/gi, "after"],
  [/\bin addition to\b/gi, "as well as"],
  [/\bin addition,/gi, "Also,"],
  [/\bon the other hand,/gi, "But"],
  [/\bfor example,/gi, "For example,"],
  [/\bhence the name\b/gi, "that is why it is called"],
  [/\bknown as\b/gi, "called"],
  [/\breferred to as\b/gi, "called"],
  [/\btakes? place\b/gi, "happens"],
  [/\bis composed of\b/gi, "is made of"],
  [/\bis comprised of\b/gi, "is made of"],
  [/\bconsists of\b/gi, "is made of"],
  [/\bplays? (a|an) (\w+ )?role in\b/gi, "matters for"],
  [/\bbe able to\b/gi, "can"],
  [/\bis able to\b/gi, "can"],
  [/\bare able to\b/gi, "can"],
  [/\bin terms of\b/gi, "when it comes to"],
  [/\bwith regard to\b/gi, "about"],
  [/\bin the form of\b/gi, "as"],
];

// Everyday academic words the adapter knows how to replace. Fact Guard must
// not treat these as technical terms, or every simplification would be flagged.
export const ACADEMIC_WORDS: ReadonlySet<string> = new Set([
  ...VERB_FORMS.keys(),
  ...Object.keys(WORDS),
  ...Object.keys(VERBS),
  "information", "different", "important", "something", "everything", "sometimes", "together", "understand",
  "remember", "following", "including", "especially", "particular", "generally", "available", "necessary", "possible",
  "interesting", "experience", "according", "considered", "described", "developed", "explained", "introduced",
  "throughout", "themselves", "therefore", "otherwise", "beginning", "knowledge", "questions", "sentences", "paragraph",
  "difference", "difficult", "direction", "situation", "condition", "conditions", "president", "community", "character",
  "characters", "activities", "materials", "necessary", "recognize", "scientists", "scientist", "researchers",
  "researcher", "university", "experiment", "experiments", "important", "sufficient", "responsible", "immediately",
  "eventually", "completely", "certainly", "obviously", "basically", "literally", "absolutely", "definitely",
  "everywhere", "whenever", "wherever", "whichever", "yesterday", "tomorrow", "afternoon", "breakfast", "classroom",
  "classmates", "homework", "assignment", "assignments", "worksheet", "instructions", "directions", "procedure",
  "procedures", "structure", "structures", "substance", "substances", "processes", "molecules", "membrane", "membranes",
]);

function keepCase(original: string, replacement: string): string {
  if (/^[A-Z]/.test(original) && !/^[A-Z]{2,}/.test(original)) return replacement.charAt(0).toUpperCase() + replacement.slice(1);
  return replacement;
}

export function swapVocabulary(sentence: string): string {
  let s = sentence;
  for (const [re, rep] of PHRASES) s = s.replace(re, (m) => keepCase(m, rep));
  s = s.replace(/\b([A-Za-z]+)\b/g, (m) => {
    const lower = m.toLowerCase();
    const verb = VERB_FORMS.get(lower);
    if (verb) return keepCase(m, verb);
    const word = WORDS[lower];
    if (word && word !== lower) return keepCase(m, word);
    return m;
  });
  return s;
}

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const words = (s: string) => s.trim().split(/\s+/).length;

function finish(s: string): string {
  let t = s.trim().replace(/^[,;:\s]+/, "").replace(/[,;:\s]+$/, "");
  t = t.replace(/\s+([,.;:!?])/g, "$1").replace(/\s{2,}/g, " ");
  if (!t) return "";
  if (!/[.!?]$/.test(t)) t += ".";
  return capitalize(t);
}

// Splits one sentence into shorter ones without dropping any words.
export function splitSentence(sentence: string, level: Level): string[] {
  const minWords = level === "simple" ? 11 : 16;
  if (words(sentence) < minWords) return [finish(sentence)];
  let s = sentence.trim();
  const out: string[] = [];

  // "..., making the plant appear green." -> "... . This makes the plant appear green."
  s = s.replace(/,\s+(making|causing|allowing|giving|creating|leaving|forming|producing|helping|letting)\s+/g, (_m, v: string) => {
    const third: Record<string, string> = { making: "makes", causing: "causes", allowing: "allows", giving: "gives", creating: "creates", leaving: "leaves", forming: "forms", producing: "produces", helping: "helps", letting: "lets" };
    return `. This ${third[v] ?? v} `;
  });
  // ", which is/are ..." -> ". It is/They are ..."
  s = s.replace(/,\s+which\s+(is|was)\s+/g, ". It $1 ").replace(/,\s+which\s+(are|were)\s+/g, ". They $1 ").replace(/,\s+which\s+/g, ". This ");
  // ", where ..." / ", who ..."
  s = s.replace(/,\s+where\s+/g, ". There, ").replace(/,\s+who\s+/g, ". They ");
  // "; " -> ". "
  s = s.replace(/;\s+/g, ". ");
  // ": " explanations -> ". " when both halves are clauses
  s = s.replace(/:\s+(?=[a-z][^.]{20,})/g, ". ");
  // coordinating clauses
  s = s.replace(/,\s+(and|but|so|yet)\s+(?=\w+\s+\w+)/g, (_m, c: string) => (c === "and" ? ". Then " : c === "but" ? ". But " : c === "so" ? ". So " : ". Still "));
  if (level === "simple") {
    s = s.replace(/\s+(because|although|while|whereas|since|unless|even though)\s+(?=\w+\s+\w+\s+\w+)/g, (_m, c: string) => `. ${/^(although|even though|whereas)$/.test(c) ? "But" : c === "because" || c === "since" ? "That is because" : c === "unless" ? "Unless" : "Meanwhile"} `);
    s = s.replace(/\s+(?:in order )?to\s+(?=\w+\s+\w+\s+\w+\s+\w+\s+\w+)/g, (m) => m);
  }
  for (const part of s.split(/(?<=[.!?])\s+/)) {
    const f = finish(part);
    if (f) out.push(f);
  }
  // Clean leading "Then this" style stutters
  return out.map((x) => x.replace(/^Then then\b/i, "Then").replace(/^This this\b/i, "This")).filter((x) => words(x) > 1 || /\w{3,}/.test(x));
}

// "X (also called Y)" -> "X. It is also called Y." ; other parentheses are kept.
function unpackParentheses(sentence: string, level: Level): string {
  if (level !== "simple") return sentence;
  return sentence.replace(/\s*\((?:also\s+)?(?:called|known as)\s+([^)]+)\)/gi, ". It is also called $1.").replace(/\.\.\s+/g, ". ");
}

export function simplifySentence(sentence: string, level: Level): string[] {
  const swapped = swapVocabulary(unpackParentheses(sentence, level));
  const parts = splitSentence(swapped, level);
  if (level !== "simple") return parts;
  // Simple: long remaining sentences are split again at the first comma past the middle.
  return parts.flatMap((p) => {
    if (words(p) <= 18) return [p];
    const half = Math.floor(p.length / 2);
    const idx = p.indexOf(", ", half);
    if (idx === -1) return [p];
    return [finish(p.slice(0, idx)), finish(p.slice(idx + 2))].filter(Boolean);
  });
}

export function simplifyContent(content: SectionContent, level: Level): SectionContent {
  const blocks: Block[] = content.blocks.map((b) => {
    if (b.type === "paragraph") return { type: "paragraph", sentences: b.sentences.flatMap((s) => simplifySentence(s, level)) };
    if (b.type === "list") return { type: "list", ordered: b.ordered, items: b.items.map((item) => item.flatMap((s) => simplifySentence(s, level))) };
    if (b.type === "heading") return { type: "heading", level: b.level, text: swapVocabulary(b.text) };
    return b;
  });
  return { blocks };
}
