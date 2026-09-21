(() => {
  "use strict";

  const $ = (sel, root=document) => root.querySelector(sel);
  const $$ = (sel, root=document) => [...root.querySelectorAll(sel)];

  const state = {
    model: null,
    mini: {
      step: 0,
      answers: [],
      flags: {},
      session: null,
      provider: "Adaptive demo",
      initializing: false
    }
  };

  const CONDITION_DEFS = [
    ["external_input","External users or systems can submit content"],
    ["untrusted_content","The system processes untrusted web, email, file or retrieved content"],
    ["rag","The system retrieves knowledge from a corpus or connected source"],
    ["sensitive_data","Sensitive or confidential data is reachable by the system"],
    ["cross_user","Multiple users, tenants or principals share the same application boundary"],
    ["tools","The model or application can call external tools or APIs"],
    ["high_impact","At least one available action has meaningful external impact"],
    ["human_approval","A human approval step exists before at least one consequential action"],
    ["authorization","Explicit authorization is enforced at the resource/action boundary"],
    ["third_party","The system depends on third-party services, models, packages or data"],
    ["secrets","Secrets, credentials or privileged tokens are available to the application"],
    ["logging","Security-relevant actions are logged"],
    ["rollback","Consequential actions can be contained, reversed or rolled back"]
  ];

  const LENSES = {
    "STRIDE": {
      color:"cyan",
      tests:[
        ["external_input","Spoofing / tampering entry exists"],
        ["sensitive_data","Information disclosure consequence exists"],
        ["high_impact","Tampering / denial / privilege consequences may matter"],
        ["cross_user","Principal separation must be preserved"]
      ]
    },
    "OWASP / GenAI": {
      color:"acid",
      tests:[
        ["untrusted_content","Untrusted content can influence model context"],
        ["rag","Retrieval introduces a knowledge boundary"],
        ["tools","Model output can cross into tool execution"],
        ["sensitive_data","Sensitive context can become model-visible"]
      ]
    },
    "Identity": {
      color:"orange",
      tests:[
        ["cross_user","Multiple principals create authorization edges"],
        ["authorization","Resource/action authorization exists"],
        ["secrets","Privileged credentials may amplify authority"],
        ["tools","Delegated tool authority must match the user context"]
      ]
    },
    "Agent / Tool Chain": {
      color:"purple",
      tests:[
        ["tools","External actions are callable"],
        ["high_impact","Consequential action surface exists"],
        ["human_approval","Human approval is part of the control chain"],
        ["rollback","Recovery determines blast radius"]
      ]
    },
    "Privacy / Supply Chain": {
      color:"blue",
      tests:[
        ["sensitive_data","Protected data exists"],
        ["third_party","External dependency boundary exists"],
        ["rag","Retrieved material may have separate provenance"],
        ["logging","Logs may contain or expose sensitive events"]
      ]
    },
    "Open Search": {
      color:"white",
      tests:[
        ["external_input","Start from attacker-controlled ingress"],
        ["high_impact","Start backward from consequence"],
        ["secrets","Start from authority-bearing material"],
        ["rollback","Start from irreversible failure"]
      ]
    }
  };

  function readInput(){
    const flags = {};
    CONDITION_DEFS.forEach(([key]) => flags[key] = Boolean($("#qtm_"+key)?.checked));
    return {
      name: ($("#qtm_name")?.value || "Untitled system").trim(),
      description: ($("#qtm_description")?.value || "").trim(),
      attackerGoal: ($("#qtm_goal")?.value || "").trim(),
      assets: ($("#qtm_assets")?.value || "").split(",").map(x=>x.trim()).filter(Boolean),
      flags
    };
  }

  function conditionList(input){
    const out = [];
    let n = 1;
    CONDITION_DEFS.forEach(([key,label]) => {
      if(input.flags[key]) out.push({id:"C"+n++, key, label, value:true});
    });
    if(input.assets.length) out.push({id:"C"+n++, key:"assets", label:"Protected assets: "+input.assets.join(", "), value:true});
    if(input.attackerGoal) out.push({id:"C"+n++, key:"goal", label:"Attacker goal: "+input.attackerGoal, value:true});
    return out;
  }

  function lensRuns(input){
    return Object.entries(LENSES).map(([name,lens]) => {
      const evidence = lens.tests.filter(([key]) => input.flags[key]).map(([,why])=>why);
      return {name, color:lens.color, evidence, active:evidence.length>0};
    });
  }

  function addFinding(arr, finding, conditions, lenses){
    const hitLenses = lenses.filter(l => finding.lensTriggers.some(t => l.name === t) && l.active).map(l=>l.name);
    const requiredPresent = finding.requires.every(k => conditions.some(c=>c.key===k));
    const supportingPresent = finding.supports.filter(k => conditions.some(c=>c.key===k)).length;
    if(!requiredPresent) return;
    const rediscovery = hitLenses.length;
    const status = rediscovery >= 2 || supportingPresent >= 2 ? "SUPPORTED" : "HYPOTHESIS";
    arr.push({...finding, hitLenses, rediscovery, status});
  }

  function buildFindings(input, conditions, lenses){
    const f = [];

    addFinding(f,{
      id:"F1",
      title:"Untrusted content may influence a more trusted decision path",
      path:"External content → model/context → downstream decision",
      requires:["external_input","untrusted_content"],
      supports:["tools","high_impact","sensitive_data"],
      lensTriggers:["OWASP / GenAI","STRIDE","Open Search"],
      why:"The system accepts attacker-controlled content and also treats that content as context for a reasoning component.",
      control:"Separate data from instructions; constrain downstream authority; validate the action at the tool/resource boundary.",
      bypass:"Could the same untrusted content reach the decision through retrieval, attachments, quoted text or another indirect channel?",
      verify:"Use a harmless synthetic instruction embedded in test content and confirm that it cannot change protected actions or reveal protected context.",
      severity:"HIGH"
    },conditions,lenses);

    addFinding(f,{
      id:"F2",
      title:"Tool authority may exceed the authority needed for the user task",
      path:"User/context → model decision → tool token → external action",
      requires:["tools","high_impact"],
      supports:["secrets","human_approval","external_input"],
      lensTriggers:["Agent / Tool Chain","Identity","OWASP / GenAI","Open Search"],
      why:"A reasoning component can reach a consequential action. The structural question is whether the action is authorized independently of the model's text.",
      control:"Use least-privilege tool scopes, action-specific authorization, parameter validation and independent approval for high-impact actions.",
      bypass:"Can a lower-trust input influence tool parameters, select a stronger tool, or cause the approver to confirm misleading context?",
      verify:"In a test environment, attempt a disallowed but harmless action with a low-privilege test principal and confirm the tool boundary rejects it regardless of model output.",
      severity:"CRITICAL"
    },conditions,lenses);

    addFinding(f,{
      id:"F3",
      title:"Cross-user or cross-tenant data exposure path requires verification",
      path:"Principal A → application/model → retrieval/resource → Principal B data",
      requires:["cross_user","sensitive_data"],
      supports:["rag","authorization","tools"],
      lensTriggers:["Identity","STRIDE","Privacy / Supply Chain","Open Search"],
      why:"Multiple principals share an application boundary while sensitive information is reachable.",
      control:"Enforce authorization before retrieval and again at the resource/action boundary; bind identity to every request.",
      bypass:"Does caching, conversation state, retrieval ranking, background indexing or a shared service account bypass the intended principal boundary?",
      verify:"Create two isolated test principals with non-sensitive fixtures and verify that neither direct nor semantically similar queries can cross the boundary.",
      severity:"CRITICAL"
    },conditions,lenses);

    addFinding(f,{
      id:"F4",
      title:"Retrieval provenance can become a trust-confusion path",
      path:"Source corpus → retrieval → model context → conclusion/action",
      requires:["rag","untrusted_content"],
      supports:["third_party","tools","sensitive_data"],
      lensTriggers:["OWASP / GenAI","Privacy / Supply Chain","Open Search"],
      why:"Retrieved material may be relevant without being trustworthy, authorized or instruction-bearing.",
      control:"Track provenance, authorization and trust level per retrieved item; prevent retrieved text from redefining system policy.",
      bypass:"Can low-trust material outrank trusted material, enter through an indexed attachment, or inherit the trust of the retrieval layer?",
      verify:"Seed the test corpus with clearly marked low-trust synthetic content and confirm provenance is preserved and protected decisions remain unchanged.",
      severity:"HIGH"
    },conditions,lenses);

    addFinding(f,{
      id:"F5",
      title:"Human approval may be only a presentation-layer control",
      path:"Model recommendation → human confirmation → consequential action",
      requires:["human_approval","high_impact"],
      supports:["tools","untrusted_content","sensitive_data"],
      lensTriggers:["Agent / Tool Chain","Open Search","STRIDE"],
      why:"A human click is not independent verification if the human sees only the model's framing of the underlying evidence.",
      control:"Show original source data, exact action parameters and target identity independently of the model explanation.",
      bypass:"Can the model omit, summarize or frame the evidence so that the approver cannot independently detect a bad action?",
      verify:"Run a benign mismatch test where the model summary conflicts with the displayed source parameters and confirm the UI makes the discrepancy obvious.",
      severity:"HIGH"
    },conditions,lenses);

    addFinding(f,{
      id:"F6",
      title:"Privileged secret or service-account concentration may enlarge blast radius",
      path:"Application/model compromise → privileged credential → broader resources",
      requires:["secrets"],
      supports:["tools","third_party","cross_user","high_impact"],
      lensTriggers:["Identity","Privacy / Supply Chain","Open Search"],
      why:"Authority-bearing credentials can turn a local model/application failure into a wider system failure.",
      control:"Short-lived scoped credentials, per-action tokens, secret isolation and explicit resource boundaries.",
      bypass:"Does any shared credential silently grant broader access than the user or task requires?",
      verify:"Inventory effective permissions of test credentials and compare them with the minimum permissions required for each action.",
      severity:"HIGH"
    },conditions,lenses);

    addFinding(f,{
      id:"F7",
      title:"Third-party dependency creates an external trust and provenance boundary",
      path:"Third-party model/service/package/data → application → protected behavior",
      requires:["third_party"],
      supports:["sensitive_data","rag","tools","secrets"],
      lensTriggers:["Privacy / Supply Chain","Open Search","STRIDE"],
      why:"A dependency can alter code, data, model behavior or availability outside the direct control of the application owner.",
      control:"Pin and verify dependencies, minimize shared secrets/data, monitor changes and define degradation/fail-closed behavior.",
      bypass:"What happens if the dependency returns valid-looking but malicious, stale or structurally different output?",
      verify:"Use a controlled stub that returns malformed or misleading data and confirm the application contains the failure without escalating authority.",
      severity:"MEDIUM"
    },conditions,lenses);

    addFinding(f,{
      id:"F8",
      title:"Detection and recovery may be weaker than the action surface",
      path:"Bad action → insufficient telemetry or rollback → persistent consequence",
      requires:["high_impact"],
      supports:["logging","rollback","tools"],
      lensTriggers:["Agent / Tool Chain","STRIDE","Open Search"],
      why:"Consequential actions need observability and containment, not only preventive controls.",
      control:"Log actor/context/action, define alerts, reversible operations and recovery procedures.",
      bypass:"Can a harmful action succeed without a durable event record, or can an attacker act faster than containment?",
      verify:"Trigger a harmless test action and confirm the event is attributable, alertable and reversible within the intended recovery process.",
      severity: input.flags.logging && input.flags.rollback ? "MEDIUM" : "HIGH"
    },conditions,lenses);

    return f.sort((a,b)=>{
      const aNum = Number(String(a.id).replace(/\D/g,"")) || 0;
      const bNum = Number(String(b.id).replace(/\D/g,"")) || 0;
      return aNum - bNum;
    });
  }

  function oracleResults(input, findings){
    const has = k => input.flags[k];
    const out = [
      {
        name:"Boundary Oracle",
        state: (has("external_input")||has("cross_user")||has("third_party")) ? "CONCERN" : "UNRESOLVED",
        detail: (has("external_input")||has("cross_user")||has("third_party"))
          ? "At least one trust boundary is explicit and should be modeled."
          : "No explicit trust boundary was declared; confirm whether that is actually true."
      },
      {
        name:"Authority Oracle",
        state: has("tools") ? (has("authorization") ? "PARTIAL" : "CONCERN") : "PASS",
        detail: has("tools")
          ? (has("authorization") ? "Tool authority exists and an authorization control is declared; verify enforcement at the action boundary." : "Tool authority exists without an explicit action/resource authorization control.")
          : "No external tool authority was declared."
      },
      {
        name:"Control Oracle",
        state: has("high_impact") ? ((has("human_approval")||has("authorization")) ? "PARTIAL" : "CONCERN") : "PASS",
        detail: has("high_impact")
          ? "Consequential actions exist; controls must be independently tested rather than assumed."
          : "No high-impact action was declared."
      },
      {
        name:"Evidence Oracle",
        state: findings.length ? "UNRESOLVED" : "PASS",
        detail: findings.length
          ? "Findings are structurally inferred from declared Conditions. They remain unverified until the listed tests bind them to evidence."
          : "No structural finding was generated from the declared Conditions."
      }
    ];
    return out;
  }

  function rotationResults(findings){
    return findings.map(f => {
      const all = f.hitLenses;
      return {
        id:f.id,
        title:f.title,
        full:all.length,
        withoutPrimary:Math.max(0,all.length-1),
        survives:all.length > 1,
        message: all.length > 1
          ? "Rediscovered by "+(all.length-1)+" independent perspective"+(all.length-1===1?"":"s")+" after excluding the first lens."
          : "Not independently rediscovered after excluding its only active named lens; keep as a hypothesis until open-search or evidence supports it."
      };
    });
  }

  function buildModel(input){
    const conditions = conditionList(input);
    const lenses = lensRuns(input);
    const findings = buildFindings(input, conditions, lenses);
    const oracles = oracleResults(input, findings);
    const rotation = rotationResults(findings);
    return {
      meta:{version:"QCDS Security Lab browser proof v0.1", generatedAt:new Date().toISOString()},
      input, conditions, lenses, oracles, findings, rotation,
      summary:{
        conditions:conditions.length,
        activeLenses:lenses.filter(x=>x.active).length,
        findings:findings.length,
        supported:findings.filter(x=>x.status==="SUPPORTED").length,
        hypotheses:findings.filter(x=>x.status==="HYPOTHESIS").length,
        independentlyRediscovered:rotation.filter(x=>x.survives).length
      }
    };
  }

  function esc(s){
    return String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#039;"}[c]));
  }

  function render(model){
    state.model=model;
    const out=$("#qtm_results");
    if(!out) return;

    const summary = model.summary;
    out.innerHTML = `
      <div class="run-head">
        <div>
          <div class="section-kicker">RUN RESULT</div>
          <h3>${esc(model.input.name)}</h3>
          <p>${esc(model.input.description || "No description supplied.")}</p>
        </div>
        <div class="run-metrics">
          <div><strong>${summary.conditions}</strong><span>Conditions</span></div>
          <div><strong>${summary.activeLenses}</strong><span>Active lenses</span></div>
          <div><strong>${summary.findings}</strong><span>Candidate findings</span></div>
          <div><strong>${summary.independentlyRediscovered}</strong><span>Rediscovered after rotation</span></div>
        </div>
      </div>

      <div class="explain-strip">
        <b>What just happened?</b>
        <span>Your answers became Conditions. Six perspective families generated candidate paths. Oracles challenged boundary, authority, controls and evidence. Rotation then asked whether each finding survives when its first perspective is removed.</span>
      </div>

      <div class="result-block">
        <div class="result-title"><span>01</span><h4>Conditions</h4><p>Facts declared by the user. QCDS treats these as the current observable logical space.</p></div>
        <div class="condition-results">
          ${model.conditions.length ? model.conditions.map(c=>`<div><code>${c.id}</code><span>${esc(c.label)}</span></div>`).join("") : '<p class="empty">No Conditions selected yet.</p>'}
        </div>
      </div>

      <div class="result-block">
        <div class="result-title"><span>02</span><h4>Oracle pass</h4><p>Constraints do not prove a vulnerability; they decide what must be challenged next.</p></div>
        <div class="oracle-results">
          ${model.oracles.map(o=>`<article><div class="oracle-state ${o.state.toLowerCase()}">${o.state}</div><b>${esc(o.name)}</b><p>${esc(o.detail)}</p></article>`).join("")}
        </div>
      </div>

      <div class="result-block">
        <div class="result-title"><span>03</span><h4>Parallel perspectives</h4><p>Frameworks are lenses. QCDS preserves their separate evidence instead of flattening them into one checklist.</p></div>
        <div class="lens-results">
          ${model.lenses.map(l=>`<article class="${l.active?"active":""}"><b>${esc(l.name)}</b><span>${l.active ? l.evidence.length+" triggered dimensions" : "No declared trigger"}</span>${l.active?'<ul>'+l.evidence.map(x=>'<li>'+esc(x)+'</li>').join("")+'</ul>':""}</article>`).join("")}
        </div>
      </div>

      <div class="result-block">
        <div class="result-title"><span>04</span><h4>Candidate findings</h4><p>These are structured defensive hypotheses. “Supported” means multiple declared Conditions/perspectives converge — not that exploitation has been proven.</p></div>
        <div class="finding-results">
          ${model.findings.length ? model.findings.map(f=>`
            <article class="finding">
              <div class="finding-top"><span class="sev ${f.severity.toLowerCase()}">${f.severity}</span><span class="status">${f.status}</span><span class="fid">${f.id}</span></div>
              <h5>${esc(f.title)}</h5>
              <div class="path">${esc(f.path)}</div>
              <p>${esc(f.why)}</p>
              <div class="finding-grid">
                <div><small>CONTROL</small><span>${esc(f.control)}</span></div>
                <div><small>BYPASS QUESTION</small><span>${esc(f.bypass)}</span></div>
                <div><small>VERIFICATION TEST</small><span>${esc(f.verify)}</span></div>
                <div><small>PERSPECTIVES</small><span>${f.hitLenses.map(esc).join(" · ") || "Open hypothesis"}</span></div>
              </div>
            </article>`).join("") : '<p class="empty">No candidate finding matched the current Conditions. Add system facts rather than assuming this means the system is safe.</p>'}
        </div>
      </div>

      <div class="result-block">
        <div class="result-title"><span>05</span><h4>Rotation / dimension exclusion</h4><p>Remove the first active lens for each finding. If another independent perspective rediscovers the same structural path, the finding is less dependent on one taxonomy.</p></div>
        <div class="rotation-results">
          ${model.rotation.length ? model.rotation.map(r=>`
            <article class="${r.survives?"survives":"weak"}">
              <span>${r.survives?"REDISCOVERED":"LENS-DEPENDENT"}</span>
              <b>${esc(r.id)} · ${esc(r.title)}</b>
              <p>${esc(r.message)}</p>
            </article>`).join("") : '<p class="empty">Nothing to rotate yet.</p>'}
        </div>
      </div>

      <div class="result-block truth">
        <div class="result-title"><span>06</span><h4>Truth-Alignment state</h4><p>The browser proof does not call structural hypotheses “verified.” Verification requires the evidence tests above to be performed and bound back to the finding.</p></div>
        <div class="truth-box">
          <strong>${summary.supported}</strong><span>structurally supported</span>
          <strong>${summary.hypotheses}</strong><span>single-path hypotheses</span>
          <strong>0</strong><span>evidence-verified findings in this browser-only run</span>
        </div>
      </div>

      <div class="run-actions">
        <button type="button" id="qtm_copy_md" class="button primary">Copy Markdown report</button>
        <button type="button" id="qtm_download_json" class="button ghost">Download JSON</button>
      </div>
    `;
    out.hidden=false;
    $("#qtm_copy_md")?.addEventListener("click", copyMarkdown);
    $("#qtm_download_json")?.addEventListener("click", downloadJSON);
    out.scrollIntoView({behavior:"smooth",block:"start"});
  }

  function markdown(model){
    const lines=[];
    lines.push("# QCDS Security Lab Threat Model");
    lines.push("");
    lines.push("**System:** "+model.input.name);
    if(model.input.description) lines.push("**Description:** "+model.input.description);
    if(model.input.attackerGoal) lines.push("**Attacker goal:** "+model.input.attackerGoal);
    lines.push("");
    lines.push("## Conditions");
    model.conditions.forEach(c=>lines.push("- **"+c.id+"** "+c.label));
    lines.push("");
    lines.push("## Oracle pass");
    model.oracles.forEach(o=>lines.push("- **"+o.name+" — "+o.state+"**: "+o.detail));
    lines.push("");
    lines.push("## Candidate findings");
    model.findings.forEach(f=>{
      lines.push("### "+f.id+" — "+f.title);
      lines.push("- Severity: "+f.severity);
      lines.push("- State: "+f.status);
      lines.push("- Path: "+f.path);
      lines.push("- Why: "+f.why);
      lines.push("- Control: "+f.control);
      lines.push("- Bypass question: "+f.bypass);
      lines.push("- Verification test: "+f.verify);
      lines.push("- Perspectives: "+(f.hitLenses.join(", ")||"Open hypothesis"));
      lines.push("");
    });
    lines.push("## Rotation");
    model.rotation.forEach(r=>lines.push("- **"+r.id+" — "+(r.survives?"REDISCOVERED":"LENS-DEPENDENT")+"**: "+r.message));
    lines.push("");
    lines.push("## Verification note");
    lines.push("This browser run generates structural defensive hypotheses from declared Conditions. A finding becomes evidence-verified only after its verification test is performed and bound to observed evidence.");
    lines.push("");
    lines.push("Generated by QCDS Security Lab browser proof v0.1 — Patrik Sundblom.");
    return lines.join("\n");
  }

  async function copyMarkdown(){
    if(!state.model) return;
    const btn=$("#qtm_copy_md");
    try{
      await navigator.clipboard.writeText(markdown(state.model));
      if(btn){ const old=btn.textContent; btn.textContent="Copied"; setTimeout(()=>btn.textContent=old,1200); }
    }catch{
      const blob=new Blob([markdown(state.model)],{type:"text/markdown"});
      const url=URL.createObjectURL(blob); const a=document.createElement("a");
      a.href=url;a.download="qcds-threat-model.md";a.click();URL.revokeObjectURL(url);
    }
  }

  function downloadJSON(){
    if(!state.model) return;
    const blob=new Blob([JSON.stringify(state.model,null,2)],{type:"application/json"});
    const url=URL.createObjectURL(blob); const a=document.createElement("a");
    a.href=url;a.download="qcds-threat-model.json";a.click();URL.revokeObjectURL(url);
  }

  function loadExample(){
    const vals={
      qtm_name:"Customer Support AI",
      qtm_description:"AI assistant reads customer email, retrieves internal support knowledge and drafts replies. A human approves before the system sends email.",
      qtm_goal:"cause an unauthorized external action or expose internal information",
      qtm_assets:"customer data, internal support documents, outbound email identity"
    };
    Object.entries(vals).forEach(([id,v])=>{ const el=$("#"+id); if(el) el.value=v; });
    ["external_input","untrusted_content","rag","sensitive_data","cross_user","tools","high_impact","human_approval","authorization","third_party","secrets","logging","rollback"].forEach(k=>{
      const el=$("#qtm_"+k); if(el) el.checked=true;
    });
  }


  const MINI_TOPICS = [
    "system",
    "inputs",
    "attacker goal",
    "assets",
    "actions",
    "controls"
  ];

  const MINI_FALLBACK_QUESTIONS = [
    "Tell me what you are building. One or two sentences is enough.",
    "Who or what can feed data into it, and what outside sources does it read?",
    "What would an attacker most want to make this system do — or reveal?",
    "What data or capability would hurt most if it was exposed, changed, deleted or misused?",
    "What can the system actually do outside the conversation — send, delete, pay, deploy, retrieve files or call APIs?",
    "What currently stops a bad action — permissions, human approval, isolation, logging, rollback or something else?"
  ];

  function miniAppend(role, text){
    const box = $("#mini_messages");
    if(!box) return;
    const div = document.createElement("div");
    div.className = "mini-msg " + (role === "user" ? "human" : "ai");
    const b = document.createElement("b");
    b.textContent = role === "user" ? "YOU" : "MINI AI";
    const span = document.createElement("span");
    span.textContent = text;
    div.append(b, span);
    box.appendChild(div);
    box.scrollTop = box.scrollHeight;
  }

  function miniSetProvider(label){
    state.mini.provider = label;
    const el = $("#mini_provider");
    if(el) el.textContent = label;
  }

  function miniDetect(text){
    const s = String(text || "").toLowerCase();
    const hit = (key, words) => {
      if(words.some(w => s.includes(w))) state.mini.flags[key] = true;
    };

    hit("external_input", ["customer","user","public","external","email","upload","form","chat","message","website"]);
    hit("untrusted_content", ["email","web","website","internet","upload","file","document","attachment","customer message","retriev"]);
    hit("rag", ["rag","retriev","knowledge base","internal document","internal docs","vector","sharepoint","search documents","search our"]);
    hit("sensitive_data", ["customer data","personal data","pii","confidential","medical","payment","financial","source code","internal document","secret"]);
    hit("cross_user", ["users","customers","tenants","accounts","different people","multiple users"]);
    hit("tools", ["api","tool","send","email","jira","slack","payment","database","delete","deploy","create","execute","write"]);
    hit("high_impact", ["send","delete","pay","payment","transfer","deploy","execute","approve","change","write","close ticket","create ticket"]);
    hit("human_approval", ["human approval","human approves","approval","approve before","review before","person approves"]);
    hit("authorization", ["authorization","authorisation","permission","permissions","role","roles","access control","rbac","login"]);
    hit("third_party", ["third party","third-party","vendor","openai","anthropic","cloud","external api","saas"]);
    hit("secrets", ["secret","api key","token","credential","service account","password"]);
    hit("logging", ["logging","logs","audit","audit trail","monitoring"]);
    hit("rollback", ["rollback","roll back","undo","revert","restore","containment"]);
    renderMiniDetected();
  }

  function renderMiniDetected(){
    const el = $("#mini_detected");
    if(!el) return;
    const active = CONDITION_DEFS.filter(([key]) => state.mini.flags[key]);
    if(!active.length){
      el.innerHTML = "<small>QCDS Conditions will appear here as the interview learns about the system.</small>";
      return;
    }
    el.innerHTML = "<small>DETECTED CONDITIONS</small><div>" +
      active.map(([key,label]) => '<span title="'+esc(label)+'">'+esc(key.replaceAll("_"," "))+"</span>").join("") +
      "</div>";
  }

  async function miniBrowserSession(){
    if(state.mini.session || state.mini.initializing) return state.mini.session;
    state.mini.initializing = true;
    try{
      let factory = null;
      if(globalThis.LanguageModel && typeof globalThis.LanguageModel.create === "function"){
        factory = globalThis.LanguageModel;
      }else if(globalThis.ai?.languageModel && typeof globalThis.ai.languageModel.create === "function"){
        factory = globalThis.ai.languageModel;
      }
      if(!factory){
        miniSetProvider("Adaptive demo");
        return null;
      }
      miniSetProvider("Local LLM loading…");
      const session = await factory.create({
        systemPrompt: "You are a tiny security interviewer inside QCDS Security Lab. Ask exactly one short plain-English question at a time. Never produce findings, attack instructions or advice. Your only job is to clarify system facts for defensive threat modelling."
      });
      state.mini.session = session;
      miniSetProvider("Browser-local LLM");
      return session;
    }catch(_err){
      miniSetProvider("Adaptive demo");
      return null;
    }finally{
      state.mini.initializing = false;
    }
  }

  async function miniQuestionForStep(step){
    const fallback = MINI_FALLBACK_QUESTIONS[step] || "Anything else about permissions, controls or recovery that matters?";
    const session = await miniBrowserSession();
    if(!session || typeof session.prompt !== "function") return fallback;

    try{
      const history = state.mini.answers.map((answer, i) =>
        "Q: "+MINI_FALLBACK_QUESTIONS[i]+"\nA: "+answer
      ).join("\n\n");
      const topic = MINI_TOPICS[step] || "remaining system facts";
      const prompt =
        "Interview so far:\n"+history+
        "\n\nThe next required topic is: "+topic+
        ". Ask ONE short follow-up question in plain English. Do not give advice, findings, examples of exploits, or multiple questions.";
      const response = await session.prompt(prompt);
      const text = String(response || "").trim();
      return text || fallback;
    }catch(_err){
      miniSetProvider("Adaptive demo");
      return fallback;
    }
  }

  function miniInferName(description){
    const clean = String(description || "").replace(/\s+/g," ").trim();
    if(!clean) return "Interviewed system";
    const first = clean.split(/[.!?]/)[0].trim();
    if(first.length <= 52) return first;
    return first.slice(0,49).trim()+"…";
  }

  async function miniSend(){
    const input = $("#mini_input");
    const btn = $("#mini_send");
    const text = input?.value.trim();
    if(!text) return;

    if(btn) btn.disabled = true;
    miniAppend("user", text);
    state.mini.answers[state.mini.step] = text;
    miniDetect(text);
    if(input) input.value = "";

    state.mini.step += 1;
    if(state.mini.step >= MINI_FALLBACK_QUESTIONS.length){
      miniAppend("ai","Good. I have enough for a first threat-model pass. I have not decided what is vulnerable; I have only extracted system facts. Send these Conditions to the QCDS builder below.");
      const apply = $("#mini_apply");
      if(apply) apply.disabled = false;
      if(btn) btn.disabled = true;
      return;
    }

    const q = await miniQuestionForStep(state.mini.step);
    miniAppend("ai", q);
    if(btn) btn.disabled = false;
    input?.focus();
  }

  function miniApply(){
    const answers = state.mini.answers;
    const set = (id, value) => { const el=$("#"+id); if(el) el.value=value || ""; };

    set("qtm_name", miniInferName(answers[0]));
    set("qtm_description", answers[0] || "");
    set("qtm_goal", answers[2] || "");
    set("qtm_assets", answers[3] || "");

    CONDITION_DEFS.forEach(([key]) => {
      const el = $("#qtm_"+key);
      if(el) el.checked = Boolean(state.mini.flags[key]);
    });

    const wb = $("#workbench");
    wb?.scrollIntoView({behavior:"smooth", block:"start"});
    setTimeout(() => $("#qtm_run")?.focus(), 500);
  }

  function miniRestart(){
    state.mini.step = 0;
    state.mini.answers = [];
    state.mini.flags = {};
    const box=$("#mini_messages");
    if(box) box.innerHTML = '<div class="mini-msg ai"><b>MINI AI</b><span>'+esc(MINI_FALLBACK_QUESTIONS[0])+'</span></div>';
    const input=$("#mini_input"); if(input) input.value="";
    const send=$("#mini_send"); if(send) send.disabled=false;
    const apply=$("#mini_apply"); if(apply) apply.disabled=true;
    renderMiniDetected();
    input?.focus();
  }

  function init(){
    $("#mini_send")?.addEventListener("click", miniSend);
    $("#mini_input")?.addEventListener("keydown", event => {
      if(event.key === "Enter" && !event.shiftKey){
        event.preventDefault();
        miniSend();
      }
    });
    $("#mini_apply")?.addEventListener("click", miniApply);
    $("#mini_restart")?.addEventListener("click", miniRestart);
    $("#qtm_run")?.addEventListener("click",()=>render(buildModel(readInput())));
    $("#qtm_example")?.addEventListener("click",loadExample);
    $("#qtm_reset")?.addEventListener("click",()=>{
      $("#qtm_form")?.reset();
      const out=$("#qtm_results"); if(out){out.hidden=true;out.innerHTML="";}
      state.model=null;
    });
  }

  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",init);
  else init();
})();