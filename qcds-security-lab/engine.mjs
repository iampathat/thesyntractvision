// Copyright © 2026 Patrik Sundblom. See LICENSE.md.
// Inspectable QCDS Security Lab inference engine.
import { generateAttackVectorSpace } from "./attack-vectors.mjs";
const CONDITION_DEFS = [
  ["external_input", "External actors, users, devices or systems can submit input"],
  [
    "untrusted_content",
    "The system processes input whose trust cannot be assumed",
  ],
  [
    "rag",
    "The system retrieves, imports or combines information from a connected source",
  ],
  [
    "sensitive_data",
    "Sensitive, confidential or safety-relevant information is reachable by the system",
  ],
  [
    "cross_user",
    "Multiple users, tenants, devices, roles or principals share a system or resource boundary",
  ],
  [
    "tools",
    "The system can invoke connected interfaces, services, APIs, actuators or other components",
  ],
  [
    "high_impact",
    "At least one available action can materially change data, money, access, operations or physical state",
  ],
  [
    "human_approval",
    "A human approval step exists before at least one consequential action",
  ],
  [
    "authorization",
    "Explicit authorization is enforced at the relevant resource or action boundary",
  ],
  [
    "third_party",
    "The system depends on external services, components, packages, models, data or providers",
  ],
  [
    "secrets",
    "Secrets, credentials or privileged tokens are available within the system boundary",
  ],
  ["logging", "Security-relevant actions and outcomes are logged"],
  [
    "rollback",
    "Consequential actions can be contained, reversed, isolated or rolled back",
  ],
  [
    "ai_component",
    "The target system itself contains an AI/ML or learned-model component",
  ],
];

const LENSES = {
  STRIDE: {
    color: "cyan",
    tests: [
      ["external_input", "Spoofing or tampering entry points may exist"],
      ["sensitive_data", "Information disclosure consequences may matter"],
      ["high_impact", "Tampering, denial or privilege consequences may matter"],
      ["cross_user", "Principal or boundary separation must be preserved"],
    ],
  },
  "OWASP / AppSec": {
    color: "acid",
    tests: [
      ["external_input", "External input crosses an application or service boundary"],
      ["untrusted_content", "Lower-trust input reaches processing logic"],
      ["tools", "Connected interfaces or APIs expand the attack surface"],
      ["sensitive_data", "Protected information is handled by the system"],
    ],
  },
  Identity: {
    color: "orange",
    tests: [
      ["cross_user", "Multiple principals create authorization edges"],
      ["authorization", "Resource or action authorization exists"],
      ["secrets", "Privileged credentials may amplify authority"],
      ["tools", "Delegated authority must match the originating principal and task"],
    ],
  },
  "Action / Tool Chain": {
    color: "purple",
    tests: [
      ["tools", "Connected actions or components are callable"],
      ["high_impact", "A consequential action surface exists"],
      ["human_approval", "Human approval is part of the control chain"],
      ["rollback", "Containment and recovery affect blast radius"],
    ],
  },
  "Privacy / Supply Chain": {
    color: "blue",
    tests: [
      ["sensitive_data", "Protected information exists"],
      ["third_party", "An external dependency or provider boundary exists"],
      ["rag", "Connected information may have separate provenance or trust"],
      ["logging", "Telemetry may contain or expose sensitive events"],
    ],
  },
  "AI / GenAI": {
    color: "acid",
    requiresTargetAI: true,
    tests: [
      ["ai_component", "The target system contains an AI/ML component"],
      ["untrusted_content", "Lower-trust content can affect model context or behavior"],
      ["rag", "Connected data can affect model context or grounding"],
      ["tools", "Model-influenced output can cross into connected actions"],
    ],
  },
  "Open Search": {
    color: "white",
    tests: [
      ["external_input", "Start from an attacker- or environment-controlled ingress"],
      ["high_impact", "Start backward from the consequence"],
      ["secrets", "Start from authority-bearing material"],
      ["rollback", "Start from an irreversible or hard-to-contain failure"],
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
      title: "Untrusted input may influence a more trusted decision or action path",
      path: "External or lower-trust input → trusted processing/context → downstream decision or action",
      requires: ["external_input", "untrusted_content"],
      supports: ["tools", "high_impact", "sensitive_data"],
      lensTriggers: ["OWASP / AppSec", "STRIDE", "AI / GenAI", "Open Search"],
      why: "The system accepts lower-trust input and processes it in a context that can affect a more trusted decision, resource or action.",
      control:
        "Keep trust boundaries explicit; validate and normalize input; separate lower-trust data from policy or control instructions; constrain downstream authority at the resource or action boundary.",
      bypass:
        "Could the same lower-trust input reach the protected decision through an alternate channel, transformation, import, cache, attachment, integration, model context or other indirect path?",
      verify:
        "Use harmless synthetic lower-trust input and confirm that it cannot alter protected decisions or actions, or expose protected information beyond the intended boundary.",
      severity: "HIGH",
    },
    conditions,
    lenses,
  );

  addFinding(
    f,
    {
      id: "F2",
      title: "Action authority may exceed the authority needed for the originating task",
      path: "Request/context → decision component → privileged interface or credential → consequential action",
      requires: ["tools", "high_impact"],
      supports: ["secrets", "human_approval", "external_input"],
      lensTriggers: [
        "Action / Tool Chain",
        "Identity",
        "OWASP / AppSec",
        "AI / GenAI",
        "Open Search",
      ],
      why: "A system component can cause a consequential action. The structural question is whether that action is authorized independently of the upstream decision, recommendation or presentation.",
      control:
        "Use least-privilege interface scopes, action-specific authorization, parameter validation and independent approval where the impact requires it.",
      bypass:
        "Can lower-trust input influence action parameters, select a stronger interface, reuse broader credentials, cross a component boundary or mislead an approver?",
      verify:
        "In a safe test environment, attempt a disallowed but harmless action with a low-privilege test principal and confirm the action boundary rejects it regardless of upstream output or recommendation.",
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
        "Cross-user, cross-tenant or cross-principal data exposure requires verification",
      path: "Principal A → shared service/application → resource or data boundary → Principal B data",
      requires: ["cross_user", "sensitive_data"],
      supports: ["rag", "authorization", "tools"],
      lensTriggers: [
        "Identity",
        "STRIDE",
        "Privacy / Supply Chain",
        "OWASP / AppSec",
        "Open Search",
      ],
      why: "Multiple principals share a system or resource boundary while protected information is reachable.",
      control:
        "Enforce authorization before data access and again at the relevant resource or action boundary; bind the correct principal identity to every request and transition.",
      bypass:
        "Can caching, session or workflow state, indexing, alternate interfaces, shared credentials, background processing or misbound identity bypass the intended principal boundary?",
      verify:
        "Create two isolated test principals with non-sensitive fixtures and verify that direct, indirect and alternate access paths cannot cross the protected resource boundary.",
      severity: "CRITICAL",
    },
    conditions,
    lenses,
  );

  addFinding(
    f,
    {
      id: "F4",
      title: "Connected-source provenance can become a trust-confusion path",
      path: "Source or data feed → lookup/import/retrieval → processing context → conclusion or action",
      requires: ["rag", "untrusted_content"],
      supports: ["third_party", "tools", "sensitive_data"],
      lensTriggers: [
        "OWASP / AppSec",
        "Privacy / Supply Chain",
        "AI / GenAI",
        "Open Search",
      ],
      why: "Connected material may be relevant without being trustworthy, authorized, current or appropriate for the decision that consumes it.",
      control:
        "Track provenance, authorization, freshness and trust level per source item; prevent a lower-trust source from silently inheriting the authority of the component that consumes it.",
      bypass:
        "Can lower-trust material outrank trusted material, enter through an alternate feed or indexed attachment, survive a transformation, or inherit trust from the lookup or integration layer?",
      verify:
        "Seed a safe test source with clearly marked lower-trust synthetic material and confirm provenance remains visible and protected decisions or actions do not silently inherit that source's claims.",
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
      path: "Presented recommendation/context → human confirmation → consequential action",
      requires: ["human_approval", "high_impact"],
      supports: ["tools", "untrusted_content", "sensitive_data"],
      lensTriggers: ["Action / Tool Chain", "Open Search", "STRIDE", "AI / GenAI"],
      why: "A human confirmation is not independent verification if the person sees only a filtered, summarized or misleading representation of the underlying evidence and action.",
      control:
        "Show original or authoritative source information, exact action parameters and target identity independently of the recommendation or summary being approved.",
      bypass:
        "Can the presentation layer omit, aggregate, summarize or frame information so the approver cannot independently detect a bad action?",
      verify:
        "Run a benign mismatch test where the presented recommendation conflicts with authoritative source parameters and confirm the interface makes the discrepancy obvious before approval.",
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
        "Privileged secret or credential concentration may enlarge blast radius",
      path: "Local component or account compromise → privileged credential → broader resources",
      requires: ["secrets"],
      supports: ["tools", "third_party", "cross_user", "high_impact"],
      lensTriggers: ["Identity", "Privacy / Supply Chain", "Open Search"],
      why: "Authority-bearing credentials can turn a local component, account or workflow failure into a wider system failure.",
      control:
        "Use short-lived scoped credentials, per-action or per-component authority, secret isolation and explicit resource boundaries.",
      bypass:
        "Does any shared or inherited credential silently grant broader access than the originating user, component or task requires?",
      verify:
        "Inventory effective permissions of test credentials and compare them with the minimum permissions required for each intended action and resource.",
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
      path: "External dependency or provider → system → protected behavior",
      requires: ["third_party"],
      supports: ["sensitive_data", "rag", "tools", "secrets"],
      lensTriggers: ["Privacy / Supply Chain", "Open Search", "STRIDE", "OWASP / AppSec"],
      why: "A dependency can alter code, data, behavior, availability or trust assumptions outside the direct control of the system owner.",
      control:
        "Verify and constrain dependencies, minimize shared authority and data, monitor changes, define failure behavior and preserve provenance across the dependency boundary.",
      bypass:
        "What happens if the dependency returns valid-looking but malicious, stale, unavailable or structurally different output?",
      verify:
        "Use a controlled substitute or test double that returns malformed, stale or misleading data and confirm the system contains the failure without silently escalating trust or authority.",
      severity: "MEDIUM",
    },
    conditions,
    lenses,
  );

  addFinding(
    f,
    {
      id: "F8",
      title: "Detection and recovery may be weaker than the consequence surface",
      path: "Harmful or incorrect action → insufficient telemetry or containment → persistent consequence",
      requires: ["high_impact"],
      supports: ["logging", "rollback", "tools"],
      lensTriggers: ["Action / Tool Chain", "STRIDE", "Open Search"],
      why: "Consequential actions need observability, containment and recovery as well as preventive controls.",
      control:
        "Record actor, context, action and outcome; define alerts, containment paths, reversible operations and recovery procedures appropriate to the system.",
      bypass:
        "Can a harmful action succeed without a durable event record, or can the consequence propagate faster than detection and containment?",
      verify:
        "Trigger a harmless test action and confirm the event is attributable, detectable and containable or reversible within the intended recovery process.",
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

const VERSION = "1.10.1";
const FIELD_META = {
  external_input: [
    "External input",
    "Can external actors, devices or systems provide input?",
    "Exposure",
  ],
  untrusted_content: [
    "Lower-trust input",
    "Does it receive or process data, messages, files, sensor input, documents or other material whose trust cannot be assumed?",
    "Exposure",
  ],
  rag: [
    "Connected source",
    "Does it retrieve, import or combine information from another source?",
    "Exposure",
  ],
  sensitive_data: [
    "Protected information",
    "Can it reach confidential, personal, regulated or safety-relevant information?",
    "Exposure",
  ],
  cross_user: [
    "Shared boundary",
    "Do multiple users, tenants, devices, roles or principals share a system or resource boundary?",
    "Exposure",
  ],
  tools: [
    "Connected actions",
    "Can it invoke APIs, services, interfaces, actuators or other components?",
    "Authority",
  ],
  high_impact: [
    "Consequential actions",
    "Can it materially change data, money, access, operations or physical state?",
    "Authority",
  ],
  secrets: [
    "Credentials",
    "Does it hold tokens, API keys or service accounts?",
    "Authority",
  ],
  third_party: [
    "External dependencies",
    "Does it rely on outside services, components, packages, models, data or providers?",
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
    "Can consequential actions be reversed, isolated or contained?",
    "Controls",
  ],
  ai_component: [
    "AI / ML component",
    "Does the target system itself contain an AI/ML or learned-model component?",
    "System type",
  ],
};
const SHORT_TITLES = {
  F1: "Untrusted input → trusted outcome",
  F2: "More action authority than the task needs",
  F3: "Data crossing between users",
  F4: "Connected source inherits too much trust",
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
    id: "portal",
    label: "Customer records portal",
    subtitle: "Login · records · account boundaries",
    name: "Customer Records Portal",
    description:
      "A conventional web portal lets customers sign in, reset passwords and read their own personal records. Thousands of customers share the same application and database, but each account must remain isolated from every other account.",
    attackerGoal:
      "Access another customer's records through the shared portal.",
    assets: ["Customer records", "Account identity", "Session access"],
    flags: flags(
      [
        "external_input",
        "untrusted_content",
        "sensitive_data",
        "cross_user",
        "authorization",
        "third_party",
        "logging",
      ],
      ["rag", "tools", "high_impact", "human_approval", "secrets", "rollback", "ai_component"],
    ),
  },
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
        "ai_component",
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
        "ai_component",
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
        "ai_component",
      ],
      ["rag", "cross_user"],
    ),
  },
  {
    id: "invoice",
    label: "Invoice approval assistant",
    subtitle: "Supplier PDFs · approvals · one unknown",
    name: "Invoice Approval Assistant",
    description:
      "Finance staff upload supplier invoices. The AI extracts amounts and vendors, compares information and prepares a payment recommendation for a human. Whether it searches a connected internal document or knowledge source has not yet been confirmed.",
    attackerGoal:
      "Make a malicious supplier document influence what the approver sees or which payment is prepared.",
    assets: ["Payment instructions", "Supplier records", "Finance identity"],
    flags: flags(
      [
        "external_input",
        "untrusted_content",
        "sensitive_data",
        "cross_user",
        "tools",
        "high_impact",
        "human_approval",
        "third_party",
        "logging",
        "ai_component",
      ],
      ["secrets", "rollback"],
    ),
  },
];
const WORKED_EXAMPLE_EVIDENCE = {
  portal: {
    findingId: "F3",
    source: "Worked example · synthetic two-account isolation test",
    observation:
      "Synthetic demonstration: test account A requested test account B's fixture record. Resource-level authorization rejected the cross-account request, and a direct resource-ID counter-test was also rejected.",
    outcome: "refutes",
    action:
      "Keep the two-account isolation check as a regression test for every resource endpoint.",
  },
  support: {
    findingId: "F1",
    source: "Worked example · synthetic support-email boundary test",
    observation:
      "Synthetic demonstration: a lower-trust marker in a test customer email influenced draft text, but the protected recipient and send authorization remained independently constrained.",
    outcome: "inconclusive",
    action:
      "Keep recipient authorization independent of draft content and repeat the boundary test after workflow changes.",
  },
  knowledge: {
    findingId: "F3",
    source: "Worked example · synthetic document-isolation test",
    observation:
      "Synthetic demonstration: employee A requested employee B's protected fixture document through both search and direct lookup. Both requests were rejected at the resource boundary.",
    outcome: "refutes",
    action:
      "Retain cross-principal retrieval tests in the regression suite.",
  },
  coding: {
    findingId: "F2",
    source: "Worked example · synthetic deployment-authority test",
    observation:
      "Synthetic demonstration: a low-privilege test request attempted a deployment outside the approved scope. The deployment boundary rejected the action despite the upstream recommendation.",
    outcome: "refutes",
    action:
      "Keep deployment authorization scoped to the approved repository, environment and action.",
  },
};

function newProject(scenario = "support") {
  const s = SCENARIOS.find((x) => x.id === scenario);
  const project = {
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
    conditionBasis: {},
    evidence: [],
    actions: {},
    updatedAt: new Date().toISOString(),
  };
  const worked = s ? WORKED_EXAMPLE_EVIDENCE[s.id] : null;
  if (worked) {
    const fp = fingerprint(project.input);
    project.evidence.push({
      id: "WORKED-" + s.id.toUpperCase(),
      findingId: worked.findingId,
      source: worked.source,
      observation: worked.observation,
      outcome: worked.outcome,
      createdAt: "2026-09-24T12:00:00Z",
      fingerprint: fp,
    });
    project.actions[worked.findingId] = {
      owner: "Worked example",
      note: worked.action,
      status: "done",
      fingerprint: fp,
    };
  }
  return project;
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

function descriptionSection(input, label) {
  const text = String(input.description || "");
  const re = new RegExp("(?:^|\\n)" + label + "\\s*:\\s*([^\\n]*)", "i");
  return (text.match(re)?.[1] || "").trim();
}
function suggestConditions(input) {
  const system = [input.name, descriptionSection(input, "System")].join(" ");
  const inputs = descriptionSection(input, "Inputs");
  const assets = [input.assets.join(" "), descriptionSection(input, "Assets")].join(" ");
  const actions = descriptionSection(input, "Actions");
  const controls = descriptionSection(input, "Controls");
  const all = [system, inputs, assets, actions, controls, input.description, input.attackerGoal]
    .join(" ")
    .toLowerCase();
  const suggestions = [];
  const seen = new Set();
  const add = (key, value, reason, confidence = "medium") => {
    if (seen.has(key) || value === null) return;
    seen.add(key);
    suggestions.push({ key, value, reason, confidence });
  };
  const none = (s) =>
    /^(?:none|nothing|no|n\/a|not applicable)$/i.test(String(s || "").trim());
  const has = (s, re) => re.test(String(s || "").toLowerCase());

  if (none(inputs))
    add("external_input", false, "The interview explicitly says there is no external input.", "high");
  else if (
    has(
      inputs,
      /anyone|public|customer|client|user|visitor|partner|external|download|upload|submit|send|enter|message|request|form|file|command|api/,
    )
  )
    add(
      "external_input",
      true,
      "The interview names external people or systems that can interact with the target.",
      "medium",
    );

  if (
    has(
      inputs,
      /untrusted|public|customer|client|user|visitor|email|upload|file|web|message|document|sensor/,
    ) ||
    suggestions.some(
      (suggestion) =>
        suggestion.key === "external_input" && suggestion.value === true,
    )
  )
    add(
      "untrusted_content",
      true,
      "Lower-trust or externally supplied material can reach the system.",
      "medium",
    );

  if (
    has(
      all,
      /retrieve|retrieval|search(?:es|ing)?|knowledge base|connected source|document store|corpus|imports? data/,
    )
  )
    add(
      "rag",
      true,
      "The description names retrieval, search or a connected information source.",
      "high",
    );
  else if (has(all, /no retrieval|does not retrieve|no connected source|no search/))
    add(
      "rag",
      false,
      "The description explicitly excludes retrieval or connected-source search.",
      "high",
    );

  if (
    has(
      assets,
      /personal|private|confidential|sensitive|regulated|health|financial|payment|credential|secret|security data|customer data|record/,
    )
  )
    add(
      "sensitive_data",
      true,
      "The protected assets include personal, confidential, regulated or security-relevant information.",
      "high",
    );

  if (
    has(
      [inputs, system, input.description].join(" "),
      /anyone|users|customers|clients|accounts|tenants|employees|multiple|shared|multi-user|multi tenant/,
    )
  )
    add(
      "cross_user",
      true,
      "The description implies multiple principals share the target or its resources.",
      "medium",
    );

  if (none(actions)) {
    add(
      "tools",
      false,
      "The interview explicitly says the system has no connected actions.",
      "high",
    );
    add(
      "high_impact",
      false,
      "The interview explicitly says there are no consequential actions.",
      "medium",
    );
  } else if (
    has(
      actions,
      /all of them|send|change|delete|pay|deploy|write|call|invoke|api|service|actuator|transfer|approve|execute|create|update/,
    )
  ) {
    add(
      "tools",
      true,
      "The interview says the system can invoke or perform connected actions.",
      "high",
    );
    add(
      "high_impact",
      true,
      "The named actions can materially change data, access, money, operations or state.",
      "medium",
    );
  }

  if (none(controls) || has(controls, /nothing|none|no controls?|without controls?/)) {
    add(
      "human_approval",
      false,
      "The interview says there is no approval control.",
      "high",
    );
    add(
      "authorization",
      false,
      "The interview says there is no independent authorization control.",
      "high",
    );
    add(
      "logging",
      false,
      "No logging control was declared when the interview said controls are absent.",
      "medium",
    );
    add(
      "rollback",
      false,
      "No containment or recovery control was declared when the interview said controls are absent.",
      "medium",
    );
  } else {
    if (has(controls, /human|approve|approval|review|confirm/))
      add(
        "human_approval",
        true,
        "The interview names a human review or approval step.",
        "high",
      );
    if (has(controls, /authori[sz]|permission|access control|rbac|policy|acl/))
      add(
        "authorization",
        true,
        "The interview names an authorization or permission control.",
        "high",
      );
    if (has(controls, /log|audit|telemetry|recorded/))
      add(
        "logging",
        true,
        "The interview names security logging or audit telemetry.",
        "high",
      );
    if (has(controls, /rollback|recover|recovery|reverse|contain|isolate|undo/))
      add(
        "rollback",
        true,
        "The interview names containment, rollback or recovery.",
        "high",
      );
  }

  if (
    has(
      all,
      /third[- ]party|vendor|provider|package|dependency|external service|cloud service|saas/,
    )
  )
    add(
      "third_party",
      true,
      "The target depends on an external provider, package or service.",
      "medium",
    );

  if (has(all, /api key|token|secret|credential|service account|password|private key/))
    add(
      "secrets",
      true,
      "The description mentions credentials, tokens, keys or other authority-bearing secrets.",
      "high",
    );

  if (
    has(
      all,
      /\bai\b|llm|language model|machine learning|learned model|predictive model|\bagent\b|assistant/,
    )
  )
    add(
      "ai_component",
      true,
      "The target description explicitly includes an AI/ML or learned-model component.",
      "high",
    );
  else if (has(all, /no ai|without ai|not an ai|does not use ai/))
    add(
      "ai_component",
      false,
      "The target description explicitly excludes AI/ML.",
      "high",
    );

  return suggestions;
}
function clarificationQueue(input, candidates) {
  const conditions = conditionList(input);
  return conditions
    .filter((condition) => condition.value === null)
    .map((condition) => {
      const routes = candidates.filter((route) =>
        route.missing.includes(condition.key),
      );
      return {
        id: condition.id,
        key: condition.key,
        label: FIELD_META[condition.key][0],
        question: FIELD_META[condition.key][1],
        routeIds: routes.map((route) => route.id),
        priority: routes.length,
      };
    })
    .sort(
      (a, b) =>
        b.priority - a.priority ||
        Number(a.id.slice(1)) - Number(b.id.slice(1)),
    );
}
function recursiveInference(candidates, conditions) {
  const byKey = Object.fromEntries(
    conditions.map((condition) => [condition.key, condition]),
  );
  return candidates.map((route) => {
    const missing = route.missing.map((key) => byKey[key]).filter(Boolean);
    const nextQuestions = [
      ...missing.map(
        (condition) =>
          `Resolve ${condition.id} · ${FIELD_META[condition.key][0]}: ${FIELD_META[condition.key][1]}`,
      ),
      `Control challenge: ${route.bypass}`,
      `Counter-test: ${route.verify}`,
    ];
    return {
      id: route.id,
      title: route.shortTitle,
      status: missing.length ? "CONDITIONAL" : "ACTIVE",
      depth: 4,
      stages: [
        { type: "route", text: route.path },
        {
          type: "conditions",
          text: missing.length
            ? `Route is kept alive while ${missing.map((condition) => condition.id).join(", ")} remain unresolved.`
            : "All required route conditions are present.",
        },
        { type: "control", text: route.control },
        { type: "challenge", text: route.bypass },
        { type: "test", text: route.verify },
      ],
      nextQuestions,
    };
  });
}
function lensRuns(input, excluded = []) {
  return Object.entries(LENSES).map(([name, l]) => {
    const applicable = !l.requiresTargetAI || input.flags.ai_component === true;
    return {
      name,
      color: l.color,
      excluded: excluded.includes(name),
      applicable,
      evidence: l.tests
        .filter(([k]) => input.flags[k] === true)
        .map(([, v]) => v),
      active: !excluded.includes(name) && applicable,
    };
  });
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
function rotationResults(input, excluded, candidates) {
  const baseline = candidates.map((f) => f.id);
  return Object.keys(LENSES)
    .filter((n) => !excluded.includes(n))
    .map((name) => {
      const after = candidateRun(input, [...excluded, name]).map((f) => f.id);
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
      state: [
        f.external_input,
        f.untrusted_content,
        f.cross_user,
        f.third_party,
      ].includes(true)
        ? "REVIEW"
        : "UNKNOWN",
      detail:
        "Check where lower-trust input, identities, components or dependencies cross into a more trusted boundary.",
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
          : "Confirm that connected-action permissions are checked independently of the upstream recommendation, decision or presentation.",
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
  const lenses = lensRuns(input, excluded);
  const vectorSpace = generateAttackVectorSpace(input, lenses);
  const candidates = candidateRun(input, excluded).map((route) => {
    const family = vectorSpace.routeFamilies[route.id] || {
      active: 0,
      conditional: 0,
      vectorIds: [],
      topVectors: [],
    };
    return {
      ...route,
      attackVectorCount: family.active + family.conditional,
      activeAttackVectors: family.active,
      conditionalAttackVectors: family.conditional,
      attackVectors: family.topVectors,
    };
  });
  const findings = candidates
    .filter((f) => !f.missing.length)
    .map((f) => {
      const records = evidence.filter(
        (e) => e.findingId === f.id && e.fingerprint === fp,
      );
      return { ...f, records, status: evidenceState(records) };
    });
  const pending = candidates
    .filter((f) => f.missing.length)
    .map((f) => ({ ...f, status: "NEEDS CONTEXT" }));
  const rotation = rotationResults(input, excluded, candidates);
  const vectorRotation = Object.keys(LENSES)
    .filter((name) => !excluded.includes(name))
    .map((name) => {
      const after = generateAttackVectorSpace(
        input,
        lensRuns(input, [...excluded, name]),
      );
      const beforeIds = new Set(vectorSpace.surviving.map((vector) => vector.id));
      const afterIds = new Set(after.surviving.map((vector) => vector.id));
      const relevantBefore = vectorSpace.surviving.filter((vector) =>
        vector.frameworks.some((entry) => entry.lens === name),
      );
      return {
        name,
        relevant: relevantBefore.length,
        retained: relevantBefore
          .filter((vector) => afterIds.has(vector.id))
          .map((vector) => vector.id),
        lost: relevantBefore
          .filter((vector) => beforeIds.has(vector.id) && !afterIds.has(vector.id))
          .map((vector) => vector.id),
      };
    });
  const dimensions = conditionList(input)
    .filter((condition) => condition.value === true)
    .map((condition) => {
      const copy = {
        ...input,
        flags: { ...input.flags, [condition.key]: null },
      };
      const after = candidateRun(copy, excluded);
      const afterById = Object.fromEntries(
        after.map((route) => [route.id, route]),
      );
      const afterVectors = generateAttackVectorSpace(
        copy,
        lensRuns(copy, excluded),
      );
      const afterVectorById = Object.fromEntries(
        afterVectors.vectors.map((vector) => [vector.id, vector]),
      );
      return {
        ...condition,
        retained: candidates
          .filter(
            (route) =>
              afterById[route.id] &&
              afterById[route.id].missing.length === route.missing.length,
          )
          .map((route) => route.id),
        weakened: candidates
          .filter(
            (route) =>
              afterById[route.id] &&
              afterById[route.id].missing.length > route.missing.length,
          )
          .map((route) => route.id),
        lost: candidates
          .filter((route) => !afterById[route.id])
          .map((route) => route.id),
        vectorImpact: {
          activeToConditional: vectorSpace.active
            .filter(
              (vector) =>
                afterVectorById[vector.id]?.state === "CONDITIONAL",
            )
            .map((vector) => vector.id),
          removed: vectorSpace.surviving
            .filter(
              (vector) =>
                !afterVectorById[vector.id] ||
                afterVectorById[vector.id].state === "REJECTED",
            )
            .map((vector) => vector.id),
        },
      };
    });
  const conditions = conditionList(input);
  const recursive = recursiveInference(candidates, conditions).map((branch) => {
    const family = vectorSpace.routeFamilies[branch.id];
    return {
      ...branch,
      attackVectorCount: family
        ? family.active + family.conditional
        : 0,
      vectorExamples: family?.topVectors?.slice(0, 6) || [],
    };
  });
  const chains = recursive.map((branch) => ({
    ids: [branch.id],
    title: branch.title,
    explanation:
      branch.stages.find((stage) => stage.type === "challenge")?.text +
      " Next: " +
      branch.nextQuestions[0],
  }));
  const suggestions = suggestConditions(input);
  const clarifications = clarificationQueue(input, candidates);

  return {
    version: VERSION,
    generatedAt: new Date().toISOString(),
    fingerprint: fp,
    input: structuredClone(input),
    excludedLenses: [...excluded],
    conditions,
    conditionSuggestions: suggestions,
    lenses,
    findings,
    pending,
    routes: [
      ...findings.map((route) => ({ ...route, conditional: false })),
      ...pending.map((route) => ({
        ...route,
        records: [],
        conditional: true,
      })),
    ],
    attackVectorSpace: vectorSpace,
    frameworkViews: vectorSpace.frameworkViews,
    searchSpace: {
      coreConditions: conditions.length,
      knownMaskDimensions: vectorSpace.maskSpace.knownDimensions,
      unknownMaskDimensions: vectorSpace.maskSpace.unknownDimensions,
      unknownMaskKeys: [...vectorSpace.maskSpace.unknownKeys],
      maskedLogicalSpace: vectorSpace.maskSpace.expression,
      maskedLogicalStates: vectorSpace.maskSpace.exactStates,
      seedMechanisms: new Set(
        vectorSpace.vectors.map((vector) => vector.seedId),
      ).size,
      generatedAttackVectors: vectorSpace.generated,
      activeAttackVectors: vectorSpace.activeCount,
      conditionalAttackVectors: vectorSpace.conditionalCount,
      rejectedAttackVectors: vectorSpace.rejectedCount,
      survivingAttackVectors: vectorSpace.survivingCount,
      survivingRoutes: candidates.length,
      confirmedRoutes: findings.length,
      conditionalRoutes: pending.length,
      rejectedRoutes: Object.keys(SHORT_TITLES).length - candidates.length,
    },
    clarifications,
    oracles: oracleResults(input, findings),
    rotation,
    vectorRotation,
    dimensions,
    recursive,
    chains,
    unknown: conditions.filter((condition) => condition.value === null),
    archivedEvidence: evidence.filter((e) => e.fingerprint !== fp).length,
  };
}
const LEGACY_LENS_NAMES = {
  "OWASP / GenAI": "OWASP / AppSec",
  "Agent / Tool Chain": "Action / Tool Chain",
};
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
      ([k]) =>
        i.flags[k] === undefined ||
        i.flags[k] === null ||
        typeof i.flags[k] === "boolean",
    )
  )
    throw new Error("Each system condition must be 1, 0 or ?.");
  if (!Array.isArray(value.excludedLenses))
    throw new Error("Invalid perspective selection.");
  const excludedLenses = [
    ...new Set(
      value.excludedLenses.map((x) => LEGACY_LENS_NAMES[x] || x),
    ),
  ];
  if (excludedLenses.some((x) => !Object.hasOwn(LENSES, x)))
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
  const conditionBasis = {};
  for (const [key, basis] of Object.entries(value.conditionBasis || {})) {
    if (
      !CONDITION_DEFS.some(([conditionKey]) => conditionKey === key) ||
      !basis ||
      typeof basis.reason !== "string" ||
      basis.reason.length > 2000 ||
      !["low", "medium", "high"].includes(basis.confidence)
    )
      throw new Error("Condition provenance is invalid.");
    conditionBasis[key] = {
      reason: basis.reason,
      confidence: basis.confidence,
      source:
        typeof basis.source === "string"
          ? basis.source.slice(0, 100)
          : "interview",
    };
  }
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
      flags: Object.fromEntries(
        CONDITION_DEFS.map(([k]) => [
          k,
          i.flags[k] === undefined ? null : i.flags[k],
        ]),
      ),
    },
    excludedLenses,
    conditionBasis,
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
    `**Mode:** QCDS browser inference · ${project.example ? "Example system" : "User-defined system"}`,
    "",
    model.input.description,
    "",
    `**Attacker goal:** ${model.input.attackerGoal || "Not specified"}`,
    `**Assets:** ${model.input.assets.join(", ") || "Not specified"}`,
    "",
    "## Scope & evidence",
    `The browser engine forms a QCDS mask from fixed 1 / 0 facts plus ${model.searchSpace.unknownMaskDimensions} unresolved dimensions (${model.searchSpace.maskedLogicalSpace} logical mask states), expands ${model.searchSpace.generatedAttackVectors} attack-vector candidates from ${model.searchSpace.seedMechanisms} mechanism seeds across route variants and targets, keeps unresolved vectors conditional, projects the surviving vector space into security frameworks, reruns perspective and dimension comparisons, recursively challenges controls, and binds user-reported evidence. Known 1 / 0 values are fixed mask coordinates; only ? branches the logical mask space.`,
    "",
    `Excluded perspectives: ${model.excludedLenses.join(", ") || "None"}.`,
    `${model.searchSpace.activeAttackVectors} active attack vectors; ${model.searchSpace.conditionalAttackVectors} conditional attack vectors; ${model.searchSpace.confirmedRoutes} active route families; ${model.searchSpace.conditionalRoutes} conditional route families; ${model.unknown.length} unknown core conditions.`,
    "",
    "## 1. Conditions",
    ...model.conditions.map((c) => {
      const basis = project.conditionBasis?.[c.key];
      return `- ${c.id} · ${c.label}: **${c.value === null ? "?" : c.value ? "1" : "0"}**${basis ? ` · interview basis: ${basis.reason} (${basis.confidence})` : ""}`;
    }),
    "",
    "## 2. Attack-vector fabric",
    `- Core mask coordinates: ${model.searchSpace.coreConditions}`,
    `- Fixed 1 / 0 dimensions: ${model.searchSpace.knownMaskDimensions}`,
    `- Unresolved ? dimensions: ${model.searchSpace.unknownMaskDimensions}`,
    `- Logical mask space: ${model.searchSpace.maskedLogicalSpace}${model.searchSpace.maskedLogicalStates !== null ? " = " + model.searchSpace.maskedLogicalStates.toLocaleString("en-US") : ""} states`,
    `- Mechanism seeds: ${model.searchSpace.seedMechanisms}`,
    `- Generated attack-vector candidates: ${model.searchSpace.generatedAttackVectors}`,
    `- Active vectors: ${model.searchSpace.activeAttackVectors}`,
    `- Conditional vectors: ${model.searchSpace.conditionalAttackVectors}`,
    `- Rejected by current constraints: ${model.searchSpace.rejectedAttackVectors}`,
    "",
    "## 3. Framework projections",
    ...Object.entries(model.frameworkViews).map(
      ([name, view]) =>
        `- ${name}: ${view.activeCount} active + ${view.conditionalCount} conditional vectors across ${Object.keys(view.categories).length} categories.`,
    ),
    "",
    "## 4. Oracle checks",
    ...model.oracles.map((o) => `- **${o.name} — ${o.state}**: ${o.detail}`),
    "",
    "## 5. Active and conditional route families",
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
  if (!model.findings.length && !model.pending.length)
    lines.push(
      "No current route family survives the declared conditions. This is not a safety conclusion.",
    );
  if (model.pending.length) {
    lines.push(
      "",
      "### Conditional routes — more context needed",
      ...model.pending.map(
        (f) =>
          `- ${f.id} — ${f.shortTitle}: unresolved ${f.missing
            .map((key) => {
              const condition = model.conditions.find(
                (item) => item.key === key,
              );
              return `${condition?.id || "?"} · ${FIELD_META[key][0]}`;
            })
            .join(", ")}.`,
      ),
    );
  }
  lines.push(
    "\n## 6. Perspective rotation",
    ...model.rotation.map(
      (r) =>
        `- Without ${r.name}: retained ${r.retained.join(", ") || "none"}; lost ${r.lost.join(", ") || "none"}.`,
    ),
    "\n## 7. Dimension walk",
    ...model.dimensions.map(
      (d) =>
        `- Set ${d.id} to ?: retained ${d.retained.length}; weakened ${d.weakened?.join(", ") || "none"}; removed ${d.lost.join(", ") || "none"}.`,
    ),
    "\n## 8. Recursive inference",
    ...model.recursive.map(
      (branch) =>
        `- ${branch.id} [${branch.status}]: ${branch.stages
          .map((stage) => `${stage.type} → ${stage.text}`)
          .join(" | ")}`,
    ),
    "\n## 9. Next clarification questions",
    ...model.clarifications.map(
      (item) =>
        `- ${item.id} · ${item.label}: ${item.question} Affects: ${item.routeIds.join(", ") || "general context"}.`,
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
  suggestConditions,
  analyze,
  validateProject,
  markdown,
};
