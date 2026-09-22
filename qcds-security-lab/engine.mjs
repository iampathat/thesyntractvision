// Copyright © 2026 Patrik Sundblom. See LICENSE.md.
// Deterministic, inspectable Security Lab evaluation engine.
const CONDITION_DEFS = [
  ["external_input", "External users or systems can submit content"],
  [
    "untrusted_content",
    "The system processes untrusted web, email, file or retrieved content",
  ],
  ["rag", "The system retrieves knowledge from a corpus or connected source"],
  [
    "sensitive_data",
    "Sensitive or confidential data is reachable by the system",
  ],
  [
    "cross_user",
    "Multiple users, tenants or principals share the same application boundary",
  ],
  ["tools", "The model or application can call external tools or APIs"],
  [
    "high_impact",
    "At least one available action has meaningful external impact",
  ],
  [
    "human_approval",
    "A human approval step exists before at least one consequential action",
  ],
  [
    "authorization",
    "Explicit authorization is enforced at the resource/action boundary",
  ],
  [
    "third_party",
    "The system depends on third-party services, models, packages or data",
  ],
  [
    "secrets",
    "Secrets, credentials or privileged tokens are available to the application",
  ],
  ["logging", "Security-relevant actions are logged"],
  [
    "rollback",
    "Consequential actions can be contained, reversed or rolled back",
  ],
];

const LENSES = {
  STRIDE: {
    color: "cyan",
    tests: [
      ["external_input", "Spoofing / tampering entry exists"],
      ["sensitive_data", "Information disclosure consequence exists"],
      ["high_impact", "Tampering / denial / privilege consequences may matter"],
      ["cross_user", "Principal separation must be preserved"],
    ],
  },
  "OWASP / GenAI": {
    color: "acid",
    tests: [
      ["untrusted_content", "Untrusted content can influence model context"],
      ["rag", "Retrieval introduces a knowledge boundary"],
      ["tools", "Model output can cross into tool execution"],
      ["sensitive_data", "Sensitive context can become model-visible"],
    ],
  },
  Identity: {
    color: "orange",
    tests: [
      ["cross_user", "Multiple principals create authorization edges"],
      ["authorization", "Resource/action authorization exists"],
      ["secrets", "Privileged credentials may amplify authority"],
      ["tools", "Delegated tool authority must match the user context"],
    ],
  },
  "Agent / Tool Chain": {
    color: "purple",
    tests: [
      ["tools", "External actions are callable"],
      ["high_impact", "Consequential action surface exists"],
      ["human_approval", "Human approval is part of the control chain"],
      ["rollback", "Recovery determines blast radius"],
    ],
  },
  "Privacy / Supply Chain": {
    color: "blue",
    tests: [
      ["sensitive_data", "Protected data exists"],
      ["third_party", "External dependency boundary exists"],
      ["rag", "Retrieved material may have separate provenance"],
      ["logging", "Logs may contain or expose sensitive events"],
    ],
  },
  "Open Search": {
    color: "white",
    tests: [
      ["external_input", "Start from attacker-controlled ingress"],
      ["high_impact", "Start backward from consequence"],
      ["secrets", "Start from authority-bearing material"],
      ["rollback", "Start from irreversible failure"],
    ],
  },
};

function addFinding(out, finding, conditions, lenses) {
  const byKey = Object.fromEntries(conditions.map((c) => [c.key, c.value]));
  if (finding.requires.some((key) => byKey[key] === false)) return;
  const hitLenses = lenses
    .filter((l) => l.active && finding.lensTriggers.includes(l.name))
    .map((l) => l.name);
  if (!hitLenses.length) return;
  const missing = finding.requires.filter((key) => byKey[key] !== true);
  out.push({
    ...finding,
    hitLenses,
    missing,
    status: missing.length ? "NEEDS CONTEXT" : "HYPOTHESIS",
  });
}
function buildFindings(input, conditions, lenses) {
  const f = [];

  addFinding(
    f,
    {
      id: "F1",
      title: "Untrusted content may influence a more trusted decision path",
      path: "External content → model/context → downstream decision",
      requires: ["external_input", "untrusted_content"],
      supports: ["tools", "high_impact", "sensitive_data"],
      lensTriggers: ["OWASP / GenAI", "STRIDE", "Open Search"],
      why: "The system accepts attacker-controlled content and also treats that content as context for a reasoning component.",
      control:
        "Separate data from instructions; constrain downstream authority; validate the action at the tool/resource boundary.",
      bypass:
        "Could the same untrusted content reach the decision through retrieval, attachments, quoted text or another indirect channel?",
      verify:
        "Use a harmless synthetic instruction embedded in test content and confirm that it cannot change protected actions or reveal protected context.",
      severity: "HIGH",
    },
    conditions,
    lenses,
  );

  addFinding(
    f,
    {
      id: "F2",
      title: "Tool authority may exceed the authority needed for the user task",
      path: "User/context → model decision → tool token → external action",
      requires: ["tools", "high_impact"],
      supports: ["secrets", "human_approval", "external_input"],
      lensTriggers: [
        "Agent / Tool Chain",
        "Identity",
        "OWASP / GenAI",
        "Open Search",
      ],
      why: "A reasoning component can reach a consequential action. The structural question is whether the action is authorized independently of the model's text.",
      control:
        "Use least-privilege tool scopes, action-specific authorization, parameter validation and independent approval for high-impact actions.",
      bypass:
        "Can a lower-trust input influence tool parameters, select a stronger tool, or cause the approver to confirm misleading context?",
      verify:
        "In a test environment, attempt a disallowed but harmless action with a low-privilege test principal and confirm the tool boundary rejects it regardless of model output.",
      severity: "CRITICAL",
    },
    conditions,
    lenses,
  );

  addFinding(
    f,
    {
      id: "F3",
      title:
        "Cross-user or cross-tenant data exposure path requires verification",
      path: "Principal A → application/model → retrieval/resource → Principal B data",
      requires: ["cross_user", "sensitive_data"],
      supports: ["rag", "authorization", "tools"],
      lensTriggers: [
        "Identity",
        "STRIDE",
        "Privacy / Supply Chain",
        "Open Search",
      ],
      why: "Multiple principals share an application boundary while sensitive information is reachable.",
      control:
        "Enforce authorization before retrieval and again at the resource/action boundary; bind identity to every request.",
      bypass:
        "Does caching, conversation state, retrieval ranking, background indexing or a shared service account bypass the intended principal boundary?",
      verify:
        "Create two isolated test principals with non-sensitive fixtures and verify that neither direct nor semantically similar queries can cross the boundary.",
      severity: "CRITICAL",
    },
    conditions,
    lenses,
  );

  addFinding(
    f,
    {
      id: "F4",
      title: "Retrieval provenance can become a trust-confusion path",
      path: "Source corpus → retrieval → model context → conclusion/action",
      requires: ["rag", "untrusted_content"],
      supports: ["third_party", "tools", "sensitive_data"],
      lensTriggers: ["OWASP / GenAI", "Privacy / Supply Chain", "Open Search"],
      why: "Retrieved material may be relevant without being trustworthy, authorized or instruction-bearing.",
      control:
        "Track provenance, authorization and trust level per retrieved item; prevent retrieved text from redefining system policy.",
      bypass:
        "Can low-trust material outrank trusted material, enter through an indexed attachment, or inherit the trust of the retrieval layer?",
      verify:
        "Seed the test corpus with clearly marked low-trust synthetic content and confirm provenance is preserved and protected decisions remain unchanged.",
      severity: "HIGH",
    },
    conditions,
    lenses,
  );

  addFinding(
    f,
    {
      id: "F5",
      title: "Human approval may be only a presentation-layer control",
      path: "Model recommendation → human confirmation → consequential action",
      requires: ["human_approval", "high_impact"],
      supports: ["tools", "untrusted_content", "sensitive_data"],
      lensTriggers: ["Agent / Tool Chain", "Open Search", "STRIDE"],
      why: "A human click is not independent verification if the human sees only the model's framing of the underlying evidence.",
      control:
        "Show original source data, exact action parameters and target identity independently of the model explanation.",
      bypass:
        "Can the model omit, summarize or frame the evidence so that the approver cannot independently detect a bad action?",
      verify:
        "Run a benign mismatch test where the model summary conflicts with the displayed source parameters and confirm the UI makes the discrepancy obvious.",
      severity: "HIGH",
    },
    conditions,
    lenses,
  );

  addFinding(
    f,
    {
      id: "F6",
      title:
        "Privileged secret or service-account concentration may enlarge blast radius",
      path: "Application/model compromise → privileged credential → broader resources",
      requires: ["secrets"],
      supports: ["tools", "third_party", "cross_user", "high_impact"],
      lensTriggers: ["Identity", "Privacy / Supply Chain", "Open Search"],
      why: "Authority-bearing credentials can turn a local model/application failure into a wider system failure.",
      control:
        "Short-lived scoped credentials, per-action tokens, secret isolation and explicit resource boundaries.",
      bypass:
        "Does any shared credential silently grant broader access than the user or task requires?",
      verify:
        "Inventory effective permissions of test credentials and compare them with the minimum permissions required for each action.",
      severity: "HIGH",
    },
    conditions,
    lenses,
  );

  addFinding(
    f,
    {
      id: "F7",
      title:
        "Third-party dependency creates an external trust and provenance boundary",
      path: "Third-party model/service/package/data → application → protected behavior",
      requires: ["third_party"],
      supports: ["sensitive_data", "rag", "tools", "secrets"],
      lensTriggers: ["Privacy / Supply Chain", "Open Search", "STRIDE"],
      why: "A dependency can alter code, data, model behavior or availability outside the direct control of the application owner.",
      control:
        "Pin and verify dependencies, minimize shared secrets/data, monitor changes and define degradation/fail-closed behavior.",
      bypass:
        "What happens if the dependency returns valid-looking but malicious, stale or structurally different output?",
      verify:
        "Use a controlled stub that returns malformed or misleading data and confirm the application contains the failure without escalating authority.",
      severity: "MEDIUM",
    },
    conditions,
    lenses,
  );

  addFinding(
    f,
    {
      id: "F8",
      title: "Detection and recovery may be weaker than the action surface",
      path: "Bad action → insufficient telemetry or rollback → persistent consequence",
      requires: ["high_impact"],
      supports: ["logging", "rollback", "tools"],
      lensTriggers: ["Agent / Tool Chain", "STRIDE", "Open Search"],
      why: "Consequential actions need observability and containment, not only preventive controls.",
      control:
        "Log actor/context/action, define alerts, reversible operations and recovery procedures.",
      bypass:
        "Can a harmful action succeed without a durable event record, or can an attacker act faster than containment?",
      verify:
        "Trigger a harmless test action and confirm the event is attributable, alertable and reversible within the intended recovery process.",
      severity: input.flags.logging && input.flags.rollback ? "MEDIUM" : "HIGH",
    },
    conditions,
    lenses,
  );

  return f.sort((a, b) => {
    const aNum = Number(String(a.id).replace(/\D/g, "")) || 0;
    const bNum = Number(String(b.id).replace(/\D/g, "")) || 0;
    return aNum - bNum;
  });
}

const VERSION = "1.1.0";
const FIELD_META = {
  external_input: [
    "External input",
    "Can customers or external systems send content in?",
    "Exposure",
  ],
  untrusted_content: [
    "Untrusted content",
    "Does it read email, uploads, websites or other uncontrolled content?",
    "Exposure",
  ],
  rag: [
    "Connected knowledge",
    "Does it search documents or a knowledge base?",
    "Exposure",
  ],
  sensitive_data: [
    "Sensitive data",
    "Can it reach confidential or personal information?",
    "Exposure",
  ],
  cross_user: [
    "Shared application",
    "Do multiple users or tenants share the application?",
    "Exposure",
  ],
  tools: [
    "Tools & APIs",
    "Can it call tools, APIs or connected services?",
    "Authority",
  ],
  high_impact: [
    "Consequential actions",
    "Can it send, change, delete, pay or deploy?",
    "Authority",
  ],
  secrets: [
    "Credentials",
    "Does it hold tokens, API keys or service accounts?",
    "Authority",
  ],
  third_party: [
    "External dependencies",
    "Does it rely on outside models, packages or services?",
    "Authority",
  ],
  human_approval: [
    "Human approval",
    "Must someone approve a consequential action?",
    "Controls",
  ],
  authorization: [
    "Independent authorization",
    "Are permissions enforced at the resource or action boundary?",
    "Controls",
  ],
  logging: [
    "Security logging",
    "Are important actions recorded with an actor and outcome?",
    "Controls",
  ],
  rollback: [
    "Recovery",
    "Can consequential actions be reversed or contained?",
    "Controls",
  ],
};
const SHORT_TITLES = {
  F1: "Untrusted content → trusted decisions",
  F2: "More tool power than the task needs",
  F3: "Data crossing between users",
  F4: "Retrieved content inherits too much trust",
  F5: "Approval without the full picture",
  F6: "Credentials expand the blast radius",
  F7: "An external dependency changes behavior",
  F8: "An action outpaces detection & recovery",
};
function flags(yes = [], no = []) {
  return Object.fromEntries(
    CONDITION_DEFS.map(([k]) => [
      k,
      yes.includes(k) ? true : no.includes(k) ? false : null,
    ]),
  );
}
const SCENARIOS = [
  {
    id: "support",
    label: "Customer support AI",
    subtitle: "Email · knowledge · approved actions",
    name: "Customer Support AI",
    description:
      "An AI assistant reads customer emails, searches internal support documents and drafts replies. A person approves each reply before a tool sends it. Different customers share the service.",
    attackerGoal:
      "Expose another customer’s information or cause an unauthorized email.",
    assets: ["Customer records", "Internal documents", "Email identity"],
    flags: flags(
      [
        "external_input",
        "untrusted_content",
        "rag",
        "sensitive_data",
        "cross_user",
        "tools",
        "high_impact",
        "human_approval",
        "authorization",
        "third_party",
        "secrets",
        "logging",
      ],
      ["rollback"],
    ),
  },
  {
    id: "knowledge",
    label: "Internal knowledge assistant",
    subtitle: "Documents · retrieval · read only",
    name: "Internal Knowledge Assistant",
    description:
      "Employees ask questions over confidential company documents. Retrieval must respect each employee’s permissions. The assistant returns answers and cannot take actions.",
    attackerGoal: "Read a document outside the employee’s access permissions.",
    assets: ["Confidential documents", "Employee permissions"],
    flags: flags(
      [
        "external_input",
        "untrusted_content",
        "rag",
        "sensitive_data",
        "cross_user",
        "authorization",
        "third_party",
        "logging",
      ],
      ["tools", "high_impact", "human_approval", "rollback", "secrets"],
    ),
  },
  {
    id: "coding",
    label: "Coding & deployment agent",
    subtitle: "Repository · tools · service accounts",
    name: "Coding & Deployment Agent",
    description:
      "An agent reads repository issues and third-party packages, proposes code and can deploy through a service account. Review is required, but action-specific authorization has not yet been checked.",
    attackerGoal: "Cause a deployment outside the approved change.",
    assets: ["Source code", "Deployment credentials", "Production service"],
    flags: flags(
      [
        "external_input",
        "untrusted_content",
        "sensitive_data",
        "tools",
        "high_impact",
        "human_approval",
        "third_party",
        "secrets",
        "logging",
        "rollback",
      ],
      ["rag", "cross_user"],
    ),
  },
];
function newProject(scenario = "support") {
  const s = SCENARIOS.find((x) => x.id === scenario);
  return {
    schema: "qcds-security-lab/project-v1",
    version: VERSION,
    example: !!s,
    input: s
      ? {
          name: s.name,
          description: s.description,
          attackerGoal: s.attackerGoal,
          assets: [...s.assets],
          flags: { ...s.flags },
        }
      : {
          name: "My system",
          description: "",
          attackerGoal: "",
          assets: [],
          flags: flags(),
        },
    excludedLenses: [],
    evidence: [],
    actions: {},
    updatedAt: new Date().toISOString(),
  };
}
function fingerprint(input, excludedLenses = []) {
  return JSON.stringify([
    input.name,
    input.description,
    input.attackerGoal,
    input.assets,
    CONDITION_DEFS.map(([k]) => [k, input.flags[k]]),
    [...excludedLenses].sort(),
  ]);
}
function conditionList(input) {
  return CONDITION_DEFS.map(([key, label], i) => ({
    id: "C" + (i + 1),
    key,
    label,
    value: input.flags[key] ?? null,
  }));
}
function lensRuns(input, excluded = []) {
  return Object.entries(LENSES).map(([name, l]) => ({
    name,
    color: l.color,
    excluded: excluded.includes(name),
    evidence: l.tests
      .filter(([k]) => input.flags[k] === true)
      .map(([, v]) => v),
    active:
      !excluded.includes(name) &&
      l.tests.some(([k]) => input.flags[k] === true),
  }));
}
function candidateRun(input, excluded = []) {
  return buildFindings(
    input,
    conditionList(input),
    lensRuns(input, excluded),
  ).map((f) => ({ ...f, shortTitle: SHORT_TITLES[f.id] }));
}
function evidenceState(records) {
  const support = records.some((e) => e.outcome === "supports");
  const refute = records.some((e) => e.outcome === "refutes");
  return support && refute
    ? "CONFLICTING EVIDENCE"
    : refute
      ? "REFUTED · REPORTED"
      : support
        ? "SUPPORTED · REPORTED"
        : records.length
          ? "INCONCLUSIVE"
          : "HYPOTHESIS";
}
function rotationResults(input, excluded, findings) {
  const baseline = findings.map((f) => f.id);
  return Object.keys(LENSES)
    .filter((n) => !excluded.includes(n))
    .map((name) => {
      const after = candidateRun(input, [...excluded, name])
        .filter((f) => !f.missing.length)
        .map((f) => f.id);
      return {
        name,
        retained: baseline.filter((id) => after.includes(id)),
        lost: baseline.filter((id) => !after.includes(id)),
      };
    });
}
function oracleResults(input, findings) {
  const f = input.flags;
  return [
    {
      name: "Boundary Oracle",
      state: [f.external_input, f.cross_user, f.third_party].includes(true)
        ? "REVIEW"
        : "UNKNOWN",
      detail:
        "Check where external content, identities and dependencies cross into trusted behavior.",
    },
    {
      name: "Authority Oracle",
      state:
        f.tools === false
          ? "OUT OF SCOPE"
          : f.authorization === true
            ? "TEST CONTROL"
            : f.tools === true && f.authorization === false
              ? "CONTROL GAP"
              : "UNKNOWN",
      detail:
        f.authorization === true
          ? "Authorization is declared. Test it using the exact actor, resource and action."
          : "Confirm that tool permissions are checked independently of model output.",
    },
    {
      name: "Control Oracle",
      state:
        f.high_impact === false
          ? "OUT OF SCOPE"
          : f.authorization === false && f.human_approval === false
            ? "CONTROL GAP"
            : f.human_approval === true || f.authorization === true
              ? "TEST CONTROL"
              : "UNKNOWN",
      detail:
        "Challenge both the control and how the same path might pass around it.",
    },
    {
      name: "Evidence Oracle",
      state: findings.some((x) => x.status === "CONFLICTING EVIDENCE")
        ? "CONFLICT"
        : findings.some((x) => x.records.length)
          ? "REVIEW RECORDS"
          : "AWAITING TESTS",
      detail:
        "Observations are user-reported. The lab does not execute tests or certify a vulnerability.",
    },
  ];
}
function analyze(input, evidence = [], excluded = []) {
  const fp = fingerprint(input, excluded);
  const candidates = candidateRun(input, excluded);
  const findings = candidates
    .filter((f) => !f.missing.length)
    .map((f) => {
      const records = evidence.filter(
        (e) => e.findingId === f.id && e.fingerprint === fp,
      );
      return { ...f, records, status: evidenceState(records) };
    });
  const rotation = rotationResults(input, excluded, findings);
  const dimensions = conditionList(input)
    .filter((c) => c.value === true)
    .map((c) => {
      const copy = { ...input, flags: { ...input.flags, [c.key]: null } };
      const ids = candidateRun(copy, excluded)
        .filter((f) => !f.missing.length)
        .map((f) => f.id);
      return {
        ...c,
        retained: findings.filter((f) => ids.includes(f.id)).map((f) => f.id),
        lost: findings.filter((f) => !ids.includes(f.id)).map((f) => f.id),
      };
    });
  const ids = findings.map((f) => f.id);
  const chains = [
    {
      ids: ["F1", "F2", "F8"],
      title: "Content reaches a consequential action",
      explanation:
        "Follow untrusted content into tool authority, then ask whether detection and recovery contain the effect.",
    },
    {
      ids: ["F4", "F3"],
      title: "Retrieval crosses an identity boundary",
      explanation:
        "Challenge source trust together with document access. Both conditions must hold for this composed route.",
    },
    {
      ids: ["F1", "F5", "F2"],
      title: "A misleading summary passes approval",
      explanation:
        "Inspect the original source, the exact approved parameters and the action that actually runs.",
    },
  ].filter((c) => c.ids.every((id) => ids.includes(id)));
  return {
    version: VERSION,
    generatedAt: new Date().toISOString(),
    fingerprint: fp,
    input: structuredClone(input),
    excludedLenses: [...excluded],
    conditions: conditionList(input),
    lenses: lensRuns(input, excluded),
    findings,
    pending: candidates.filter((f) => f.missing.length),
    oracles: oracleResults(input, findings),
    rotation,
    dimensions,
    chains,
    unknown: conditionList(input).filter((c) => c.value === null),
    archivedEvidence: evidence.filter((e) => e.fingerprint !== fp).length,
  };
}
function validateProject(value) {
  if (!value || value.schema !== "qcds-security-lab/project-v1" || !value.input)
    throw new Error(
      "Choose a QCDS Security Lab project JSON exported from this lab.",
    );
  const str = (s, n = 20000) => typeof s === "string" && s.length <= n;
  const i = value.input;
  if (
    !["name", "description", "attackerGoal"].every((k) => str(i[k])) ||
    !Array.isArray(i.assets) ||
    i.assets.length > 100 ||
    !i.assets.every((x) => str(x, 1000))
  )
    throw new Error("Project details are invalid or too long.");
  if (
    !i.flags ||
    !CONDITION_DEFS.every(
      ([k]) => i.flags[k] === null || typeof i.flags[k] === "boolean",
    )
  )
    throw new Error("Each system condition must be Yes, No or Unknown.");
  if (
    !Array.isArray(value.excludedLenses) ||
    value.excludedLenses.some((x) => !Object.hasOwn(LENSES, x)) ||
    new Set(value.excludedLenses).size !== value.excludedLenses.length
  )
    throw new Error("Invalid perspective selection.");
  if (!Array.isArray(value.evidence) || value.evidence.length > 500)
    throw new Error("Invalid evidence records.");
  const evidence = value.evidence.map((e) => {
    if (
      !e ||
      !Object.hasOwn(SHORT_TITLES, e.findingId) ||
      !["supports", "refutes", "inconclusive"].includes(e.outcome) ||
      !["id", "source", "observation", "fingerprint", "createdAt"].every((k) =>
        str(e[k], 30000),
      ) ||
      !e.source.trim() ||
      !e.observation.trim()
    )
      throw new Error("An evidence record is incomplete.");
    return {
      id: e.id,
      findingId: e.findingId,
      source: e.source,
      observation: e.observation,
      fingerprint: e.fingerprint,
      createdAt: e.createdAt,
      outcome: e.outcome,
    };
  });
  const actions = {};
  for (const [id, a] of Object.entries(value.actions || {})) {
    if (
      !Object.hasOwn(SHORT_TITLES, id) ||
      !a ||
      !["open", "progress", "done"].includes(a.status) ||
      !str(a.owner, 200) ||
      !str(a.note, 5000) ||
      !str(a.fingerprint, 30000)
    )
      throw new Error("An action record is invalid.");
    actions[id] = {
      status: a.status,
      owner: a.owner,
      note: a.note,
      fingerprint: a.fingerprint,
    };
  }
  return {
    schema: value.schema,
    version: VERSION,
    example: value.example === true,
    input: {
      name: i.name,
      description: i.description,
      attackerGoal: i.attackerGoal,
      assets: [...i.assets],
      flags: Object.fromEntries(CONDITION_DEFS.map(([k]) => [k, i.flags[k]])),
    },
    excludedLenses: [...value.excludedLenses],
    evidence,
    actions,
    updatedAt: new Date().toISOString(),
  };
}
function markdown(model, project) {
  const lines = [
    "# QCDS Security Lab — Threat model",
    "",
    `**System:** ${model.input.name}`,
    `**Run:** ${model.generatedAt}`,
    `**Author:** Patrik Sundblom · QCDS Security Lab`,
    `**Mode:** Deterministic browser evaluation · ${project.example ? "Example system" : "User-defined system"}`,
    "",
    model.input.description,
    "",
    `**Attacker goal:** ${model.input.attackerGoal || "Not specified"}`,
    `**Assets:** ${model.input.assets.join(", ") || "Not specified"}`,
    "",
    "## Scope & evidence",
    "Candidate paths come from eight shared rules. Perspective agreement is not independent evidence. This run does not scan a system, execute a quantum circuit, or automatically verify a vulnerability. Test observations are user-reported.",
    "",
    `Excluded perspectives: ${model.excludedLenses.join(", ") || "None"}.`,
    `${model.unknown.length} unknown conditions; ${model.archivedEvidence} evidence records belong to different system snapshots.`,
    "",
    "## 1. Conditions",
    ...model.conditions.map(
      (c) =>
        `- ${c.id} · ${c.label}: **${c.value === null ? "UNKNOWN" : c.value ? "YES" : "NO"}**`,
    ),
    "",
    "## 2. Oracle checks",
    ...model.oracles.map((o) => `- **${o.name} — ${o.state}**: ${o.detail}`),
    "",
    "## 3. Findings",
  ];
  for (const f of model.findings) {
    lines.push(
      `\n### ${f.id} — ${f.shortTitle}`,
      `- Potential impact: ${f.severity}`,
      `- Evidence state: ${f.status}`,
      `- Path: ${f.path}`,
      `- Basis: ${f.why}`,
      `- Required conditions: ${f.requires.map((k) => model.conditions.find((c) => c.key === k).id).join(", ")}`,
      `- Control: ${f.control}`,
      `- Challenge: ${f.bypass}`,
      `- Test: ${f.verify}`,
      `- Perspectives: ${f.hitLenses.join(", ")}`,
    );
    f.records.forEach((e) =>
      lines.push(
        `- Observation (${e.outcome}, ${e.createdAt}): ${e.observation} | Source: ${e.source}`,
      ),
    );
    const a = project.actions[f.id];
    if (a && a.fingerprint === model.fingerprint)
      lines.push(
        `- Action: ${a.status}; owner: ${a.owner || "Unassigned"}; ${a.note}`,
      );
  }
  if (!model.findings.length)
    lines.push("No candidate rule matched. This is not a safety conclusion.");
  lines.push(
    "\n## 4. Rotation",
    ...model.rotation.map(
      (r) =>
        `- Without ${r.name}: retained ${r.retained.join(", ") || "none"}; lost ${r.lost.join(", ") || "none"}.`,
    ),
    "\n## 5. Dimension exclusion",
    ...model.dimensions.map(
      (d) =>
        `- Hide ${d.id}: retained ${d.retained.length}; lost ${d.lost.join(", ") || "none"}.`,
    ),
    "\n## 6. Composed paths",
    ...model.chains.map(
      (c) => `- ${c.ids.join(" → ")}: ${c.title}. ${c.explanation}`,
    ),
    "\n## 7. More context needed",
    ...model.pending.map(
      (f) => `- ${f.id}: ${f.missing.map((k) => FIELD_META[k][0]).join(", ")}`,
    ),
    "",
    "Copyright © 2026 Patrik Sundblom. Commercial license required. See qcds-security-lab/LICENSE.md.",
  );
  return lines.join("\n");
}
export {
  VERSION,
  CONDITION_DEFS,
  FIELD_META,
  SHORT_TITLES,
  LENSES,
  SCENARIOS,
  newProject,
  fingerprint,
  analyze,
  validateProject,
  markdown,
};
