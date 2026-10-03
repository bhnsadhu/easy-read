import { it } from "vitest";
import { syllabify, syllableCount } from "@/lib/text/syllables";
import { splitSentences } from "@/lib/text/sentences";
import { appendFileSync, writeFileSync } from "node:fs";
const OUT = "/tmp/claude-0/-home-user-easy-read/f83de398-9743-505f-a43c-186e7f9aca12/scratchpad/probe-out.txt";
writeFileSync(OUT, "");
const log = (...a: unknown[]) => appendFileSync(OUT, a.map(String).join(" ") + "\n");
it("probe", () => {
  const sample: Array<[string, string]> = [
    ["every","ev-ery"],["idea","i-de-a"],["area","ar-e-a"],["science","sci-ence"],["poem","po-em"],["ocean","o-cean"],["animal","an-i-mal"],["family","fam-i-ly"],["different","dif-fer-ent"],["interesting","in-ter-est-ing"],["photosynthesis","pho-to-syn-the-sis"],["chlorophyll","chlo-ro-phyll"],["temperature","tem-per-a-ture"],["government","gov-ern-ment"],["independence","in-de-pen-dence"],["molecule","mol-e-cule"],["energy","en-er-gy"],["oxygen","ox-y-gen"],["carbon","car-bon"],["dioxide","di-ox-ide"],
    // 50-word sample (Merriam-Webster style)
    ["cat","cat"],["reading","read-ing"],["water","wa-ter"],["table","ta-ble"],["elephant","el-e-phant"],["beautiful","beau-ti-ful"],["important","im-por-tant"],["because","be-cause"],["people","peo-ple"],["history","his-to-ry"],["another","an-oth-er"],["example","ex-am-ple"],["together","to-geth-er"],["through","through"],["children","chil-dren"],["mountain","moun-tain"],["volcano","vol-ca-no"],["continent","con-ti-nent"],["equation","e-qua-tion"],["fraction","frac-tion"],["community","com-mu-ni-ty"],["president","pres-i-dent"],["revolution","rev-o-lu-tion"],["sunlight","sun-light"],["pigment","pig-ment"],["discovered","dis-cov-ered"],["kilograms","ki-lo-grams"],["percent","per-cent"],["condensation","con-den-sa-tion"],["precipitation","pre-cip-i-ta-tion"],["organism","or-gan-ism"],["measure","mea-sure"],["island","is-land"],["quickly","quick-ly"],["yellow","yel-low"],["seven","sev-en"],["orange","or-ange"],["music","mu-sic"],["ruler","rul-er"],["picture","pic-ture"],["simple","sim-ple"],["umbrella","um-brel-la"],["butterfly","but-ter-fly"],["computer","com-put-er"],["happiness","hap-pi-ness"],["celebrate","cel-e-brate"],["remember","re-mem-ber"],["triangle","tri-an-gle"],["circle","cir-cle"],["wanted","want-ed"],
  ];
  let ok = 0; const bad: string[] = [];
  for (const [w, exp] of sample) { const got = syllabify(w).join("-"); if (got === exp) ok++; else bad.push(`${w}: got ${got} want ${exp}`); }
  log(`accuracy ${ok}/${sample.length}`); log(bad.join("\n"));
  for (const w of ["don't","co-operate","CO2","niño","Photosynthesis","Every","doesn't","NASA","H2O","cat.","\"Wow!\"","", "日本語", "rhythm", "jumped", "makes", "boxes", "needed", "Netherlands", "Ingenhousz", "evaporation", "square", "I'm", "twenty-one", "e-mail"]) log(JSON.stringify(w), "=>", JSON.stringify(syllabify(w)), syllableCount(w));
  log(JSON.stringify(splitSentences('Dr. Smith went to the U.S. in May. He saw Mr. Jones at 5 p.m. It cost $3.50. "Wow!" she said.')));
  log(JSON.stringify(splitSentences('He said, "Go." Then left. Pi is 3.14 and so on. Wait... what? I saw it. . . really. See Fig. 3 for details. It was approx. 5 meters. The Dept. of State said so.')));
  log(JSON.stringify(splitSentences('🌞 Plants grow! 🌱 They need light. 🌞')));
  log(JSON.stringify(splitSentences('Hola. ¿Cómo estás? ¡Muy bien! El Sr. García vive aquí.')));
  log(JSON.stringify(splitSentences('First line\nSecond line\n\nThird para.')), JSON.stringify(splitSentences('')), JSON.stringify(splitSentences('   \n ')));
});
