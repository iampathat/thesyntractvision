/* QCDS Cancer Lab — genome perspective + independently verifiable exact-motif micro-demo.
 * The motif scan is conventional CPU string matching on synthetic fragments.
 * It does NOT claim genome-wide QCDS execution, genomic validation or quantum speedup.
 * © 2026 Patrik Sundblom. Research development support: OpenAI / ChatGPT.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  root.CancerGenomePerspective = api;
  if (typeof document !== "undefined") api.initialize();
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  const CHROMOSOMES = Array.from({length: 22}, (_, i) => String(i + 1)).concat(["X", "Y"]);
  const FRAGMENT_LENGTH = 8192;
  const MOTIF = "GATTACAGTCGA";
  const INSERTIONS = [
    {chr: "3", offset: 1845}, {chr: "13", offset: 4103}, {chr: "17", offset: 6552}
  ];
  const ALPHABET = "ACGT";
  const DEMO_LENGTH = FRAGMENT_LENGTH * CHROMOSOMES.length;
  const GENOME_BASES = 3000000000n;

  function fragments() {
    return CHROMOSOMES.map((chr, ix) => {
      let seed = (0x9e3779b9 ^ Math.imul(ix + 1, 0x85ebca6b)) >>> 0;
      const sequence = new Array(FRAGMENT_LENGTH);
      for (let j = 0; j < sequence.length; j++) {
        // Mulberry32-style mixing avoids short low-bit cycles in synthetic DNA.
        seed = (seed + 0x6D2B79F5) >>> 0;
        let t = seed;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        sequence[j] = ALPHABET[((t ^ (t >>> 14)) >>> 0) & 3];
      }
      const insert = INSERTIONS.find(v => v.chr === chr);
      if (insert) for (let j = 0; j < MOTIF.length; j++) sequence[insert.offset+j] = MOTIF[j];
      return {chr, sequence:sequence.join(""), length:FRAGMENT_LENGTH};
    });
  }

  // Counts overlapping matches on the forward strand; the query has to be literal DNA.
  function findMatches(fragmentSet, motif) {
    const q = String(motif || "").toUpperCase().trim();
    if (!/^[ACGT]{6,18}$/.test(q)) throw new Error("Enter 6–18 A/C/G/T symbols. This demo searches exact matches on the + strand.");
    const found = [];
    for (const fragment of fragmentSet) {
      let position = fragment.sequence.indexOf(q);
      while (position !== -1) {
        found.push({chr:fragment.chr, offset:position, strand:"+", matched:q});
        position = fragment.sequence.indexOf(q, position + 1);
      }
    }
    return found;
  }

  function choose3(n) { const x=BigInt(n);return x*(x-1n)*(x-2n)/6n; }
  const cache = fragments();
  const $ = id => document.getElementById(id);

  function e(tag,cls,value) {
    const node=document.createElement(tag);
    if(cls)node.className=cls;
    if(value!==undefined)node.textContent=String(value);
    return node;
  }
  function context(match) {
    const fragment = cache.find(x=>x.chr===match.chr);
    const from=Math.max(0,match.offset-30);
    const to=Math.min(fragment.sequence.length,match.offset+match.matched.length+30);
    const wrap=e("div","genome-sequence");
    wrap.append(e("code","",fragment.sequence.slice(from,match.offset)));
    wrap.append(e("mark","",fragment.sequence.slice(match.offset,match.offset+match.matched.length)));
    wrap.append(e("code","",fragment.sequence.slice(match.offset+match.matched.length,to)));
    return {wrap,from:from+1,to};
  }
  function renderHits(matches,motif) {
    const title=$("genomeHitsHeadline"), rows=$("genomeHits"), board=$("chromosomeBoard"), detail=$("genomePositionDetail");
    if(!title||!rows||!board||!detail)return;
    title.textContent=matches.length+" exact "+(matches.length===1?"match":"matches")+" in "+DEMO_LENGTH.toLocaleString("en-US")+" synthetic bases";
    board.replaceChildren();rows.replaceChildren();detail.replaceChildren();
    for(const fragment of cache) {
      const row=e("div","chromosome-row");
      row.append(e("span","chromosome-label","chr"+fragment.chr));
      const track=e("div","chromosome-track");
      track.setAttribute("aria-label","Synthetic chromosome "+fragment.chr+" fragment, "+FRAGMENT_LENGTH+" bases");
      const hits=matches.filter(m=>m.chr===fragment.chr);
      for(const m of hits.slice(0,180)) {
        const marker=e("button","genome-hit-marker");
        marker.type="button";
        marker.title="chr"+m.chr+" synthetic position "+(m.offset+1);
        marker.setAttribute("aria-label","Show synthetic match on chromosome "+m.chr+", position "+(m.offset+1));
        marker.style.left=Math.min(99.5,100*m.offset/FRAGMENT_LENGTH).toFixed(2)+"%";
        marker.addEventListener("click",()=>showHit(m));
        track.append(marker);
      }
      row.append(track,e("span","chromosome-count",String(hits.length)));
      board.append(row);
    }
    const cap=Math.min(matches.length,30);
    if(!matches.length) {
      rows.append(e("p","genome-empty","No exact occurrence of "+motif+" in the 24 synthetic test fragments. This is not a result from real genome sequencing."));
    } else {
      const caption=e("p","genome-list-summary","Positions are 1-based within each synthetic 8,192-base fragment; they are not human genome coordinates.");
      rows.append(caption);
      for(const match of matches.slice(0,cap)) {
        const btn=e("button","genome-match-row","chr"+match.chr+" · "+(match.offset+1)+" · "+match.strand+" strand");
        btn.type="button";
        btn.addEventListener("click",()=>showHit(match));
        rows.append(btn);
      }
      if(matches.length>cap)rows.append(e("p","genome-list-summary","Showing "+cap+" of "+matches.length+" exact matches; every match contributes to chromosome counts."));
      showHit(matches[0]);
    }
  }
  function showHit(hit) {
    const target=$("genomePositionDetail");
    if(!target)return;
    target.replaceChildren();
    target.append(e("strong","","Synthetic chr"+hit.chr+": position "+(hit.offset+1)+" · exact + strand match"));
    const c=context(hit);
    target.append(c.wrap,e("small","","Shown bases "+c.from+"–"+c.to+" of a synthetic fragment, with the exact queried sequence highlighted. These are NOT BRCA, PIK3CA or patient-derived positions."));
  }
  function run() {
    const input=$("genomeMotif"), error=$("genomeSearchError");
    if(!input)return;
    try {
      const query=input.value.toUpperCase().replace(/\s/g,"");
      const hits=findMatches(cache,query);
      error.textContent="";
      renderHits(hits,query);
    } catch (err) { error.textContent=err.message; }
  }
  function initialize() {
    if(typeof document==="undefined"||!$("genomePerspective"))return;
    $("genomeDemoBases").textContent=DEMO_LENGTH.toLocaleString("en-US");
    $("genomeTriples").textContent="≈4.5 × 10²⁷";
    $("genomeMotif").value=MOTIF;
    const form=$("genomeSearchForm");
    form.addEventListener("submit",evt=>{evt.preventDefault();run();});
    run();
  }
  return {CHROMOSOMES,FRAGMENT_LENGTH,MOTIF,INSERTIONS,DEMO_LENGTH,GENOME_BASES,
    fragments,findMatches,choose3,initialize};
});