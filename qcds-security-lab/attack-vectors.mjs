/*
 * QCDS Security Lab — Attack Vector Fabric
 * Author: Patrik Sundblom
 *
 * Core Conditions are system coordinates. They are NOT the attack-vector catalog.
 * This module expands attack mechanisms across route variants and targets, then
 * constrains the generated vector space with the target system's ternary facts.
 */

const ROUTE_VARIANTS = {
  direct: {
    label: "direct path",
    segment: "direct boundary crossing",
  },
  alternate: {
    label: "alternate interface",
    segment: "alternate interface / endpoint",
  },
  async: {
    label: "asynchronous path",
    segment: "queue / background / delayed processing",
  },
  stateful: {
    label: "stateful path",
    segment: "session / cache / stored state",
  },
  dependency: {
    label: "dependency-mediated path",
    segment: "external dependency / provider",
  },
};

const TARGETS = {
  identity: "identity / principal",
  data: "protected data",
  action: "privileged action",
  service: "service / application logic",
  dependency: "dependency / build / update chain",
  availability: "availability / resource capacity",
  audit: "logging / audit trail",
  recovery: "containment / recovery path",
  model: "AI / model context",
};

const V = (
  id,
  title,
  {
    routeFamily,
    requires = [],
    any = [],
    supports = [],
    whenAI = false,
    variants = ["direct", "alternate"],
    targets = ["service"],
    frameworks = {},
    mechanism,
    consequence,
    control,
    verify,
    severity = "HIGH",
  },
) => ({
  id,
  title,
  routeFamily,
  requires,
  any,
  supports,
  whenAI,
  variants,
  targets,
  frameworks,
  mechanism,
  consequence,
  control,
  verify,
  severity,
});

const ATTACK_VECTOR_SEEDS = [
  V("INJECTION", "Injection through lower-trust input", {
    routeFamily: "F1",
    requires: ["external_input", "untrusted_content"],
    any: ["tools", "sensitive_data", "high_impact"],
    variants: ["direct", "alternate", "async", "stateful"],
    targets: ["service", "data", "action"],
    frameworks: {
      STRIDE: ["Tampering", "Elevation of Privilege"],
      "OWASP / AppSec": ["A05:2025 Injection"],
      "Open Search": ["Input-to-trust transition"],
    },
    mechanism: "attacker-controlled syntax or structure changes trusted processing",
    consequence: "protected processing, data or actions may be altered",
    control: "context-aware validation, safe interpreters, parameterization and downstream authorization",
    verify: "send harmless structured payloads through every input path and compare intended versus actual interpretation",
    severity: "CRITICAL",
  }),
  V("COMMAND", "Command or interpreter injection", {
    routeFamily: "F1",
    requires: ["external_input", "untrusted_content"],
    any: ["tools", "high_impact"],
    variants: ["direct", "alternate", "async"],
    targets: ["action", "service"],
    frameworks: {
      STRIDE: ["Tampering", "Elevation of Privilege"],
      "OWASP / AppSec": ["A05:2025 Injection"],
      "Action / Tool Chain": ["Interpreter / command authority"],
      "Open Search": ["Trust-boundary execution"],
    },
    mechanism: "lower-trust input reaches an interpreter, shell, query engine or executable interface",
    consequence: "the attacker may cause unintended commands or actions",
    control: "remove interpreter ambiguity, use allowlisted parameters and constrain execution authority",
    verify: "exercise safe metacharacter and parameter-boundary cases without executing harmful commands",
    severity: "CRITICAL",
  }),
  V("PATH", "Path, object or resource selector manipulation", {
    routeFamily: "F3",
    requires: ["external_input"],
    any: ["sensitive_data", "cross_user"],
    variants: ["direct", "alternate", "stateful"],
    targets: ["data", "service"],
    frameworks: {
      STRIDE: ["Information Disclosure", "Tampering"],
      "OWASP / AppSec": ["A01:2025 Broken Access Control", "API1:2023 Broken Object Level Authorization"],
      Identity: ["Object authorization"],
      "Open Search": ["Selector manipulation"],
    },
    mechanism: "attacker-controlled identifiers select a different resource than intended",
    consequence: "another principal's object or protected resource may be read or changed",
    control: "bind every object lookup to the authenticated principal and enforce authorization at the resource boundary",
    verify: "use two isolated fixture principals and vary identifiers across direct and alternate interfaces",
    severity: "CRITICAL",
  }),
  V("PROPERTY", "Object property authorization bypass", {
    routeFamily: "F3",
    requires: ["external_input", "sensitive_data"],
    variants: ["direct", "alternate"],
    targets: ["data"],
    frameworks: {
      STRIDE: ["Information Disclosure", "Tampering"],
      "OWASP / AppSec": ["A01:2025 Broken Access Control", "API3:2023 Broken Object Property Level Authorization"],
      Identity: ["Property-level authorization"],
    },
    mechanism: "the object is authorized but individual fields are not",
    consequence: "protected fields may be read or modified",
    control: "authorize readable and writable properties independently of object retrieval",
    verify: "request and mutate disallowed fixture properties using a low-privilege principal",
    severity: "HIGH",
  }),
  V("FUNCTION", "Function-level authorization bypass", {
    routeFamily: "F2",
    requires: ["tools"],
    any: ["cross_user", "high_impact"],
    variants: ["direct", "alternate"],
    targets: ["action", "service"],
    frameworks: {
      STRIDE: ["Elevation of Privilege"],
      "OWASP / AppSec": ["A01:2025 Broken Access Control", "API5:2023 Broken Function Level Authorization"],
      Identity: ["Function authorization", "Privilege boundary"],
      "Action / Tool Chain": ["Action authority"],
    },
    mechanism: "a principal can invoke a function outside its role or task authority",
    consequence: "privileged operations become reachable",
    control: "enforce server-side function authorization using the effective principal and task scope",
    verify: "invoke privileged fixture functions through normal and alternate endpoints with a low-privilege principal",
    severity: "CRITICAL",
  }),
  V("AUTHN", "Authentication failure or identity assumption", {
    routeFamily: "F3",
    requires: ["cross_user"],
    variants: ["direct", "alternate", "stateful"],
    targets: ["identity", "data"],
    frameworks: {
      STRIDE: ["Spoofing"],
      "OWASP / AppSec": ["A07:2025 Authentication Failures", "API2:2023 Broken Authentication"],
      Identity: ["Authentication", "Session identity"],
    },
    mechanism: "authentication or identity binding can be bypassed, confused or reused",
    consequence: "an attacker may act as another principal",
    control: "strong authentication, session binding, token validation, replay resistance and explicit identity transitions",
    verify: "exercise safe invalid, expired, replayed and cross-session fixture credentials",
    severity: "CRITICAL",
  }),
  V("TOKEN_REPLAY", "Session or token replay", {
    routeFamily: "F6",
    requires: ["secrets"],
    any: ["cross_user", "tools"],
    variants: ["direct", "stateful", "alternate"],
    targets: ["identity", "action"],
    frameworks: {
      STRIDE: ["Spoofing", "Elevation of Privilege"],
      "OWASP / AppSec": ["A07:2025 Authentication Failures"],
      Identity: ["Token replay", "Session binding"],
    },
    mechanism: "authority-bearing session material remains usable outside its intended context",
    consequence: "stolen or copied authority may be replayed",
    control: "short lifetimes, audience binding, nonce/replay protection and contextual token validation",
    verify: "replay synthetic fixture tokens across sessions, audiences and expired contexts",
    severity: "HIGH",
  }),
  V("CONFUSED_DEPUTY", "Confused-deputy authority transfer", {
    routeFamily: "F2",
    requires: ["tools"],
    any: ["external_input", "cross_user", "secrets"],
    variants: ["direct", "alternate", "async"],
    targets: ["action", "identity"],
    frameworks: {
      STRIDE: ["Elevation of Privilege"],
      "OWASP / AppSec": ["A01:2025 Broken Access Control", "A06:2025 Insecure Design"],
      Identity: ["Delegated authority", "Confused deputy"],
      "Action / Tool Chain": ["Delegated action"],
    },
    mechanism: "a more privileged component acts on behalf of a less privileged requester without preserving scope",
    consequence: "authority crosses the intended trust boundary",
    control: "carry originating identity and task scope to the final action boundary",
    verify: "submit a low-authority fixture request that asks a privileged component to cross its allowed scope",
    severity: "CRITICAL",
  }),
  V("MASS_ASSIGN", "Unsafe field binding or mass assignment", {
    routeFamily: "F1",
    requires: ["external_input"],
    any: ["sensitive_data", "high_impact"],
    variants: ["direct", "alternate"],
    targets: ["data", "identity", "service"],
    frameworks: {
      STRIDE: ["Tampering", "Elevation of Privilege"],
      "OWASP / AppSec": ["A01:2025 Broken Access Control", "API3:2023 Broken Object Property Level Authorization"],
    },
    mechanism: "untrusted fields bind to internal or privileged object properties",
    consequence: "protected state or privilege attributes may be changed",
    control: "explicit input schemas and allowlisted writable fields",
    verify: "add benign unexpected privileged fields to fixture requests and verify they are ignored or rejected",
  }),
  V("DATA_EXPOSURE", "Excessive or unintended data exposure", {
    routeFamily: "F3",
    requires: ["sensitive_data"],
    any: ["external_input", "cross_user", "logging", "third_party"],
    variants: ["direct", "alternate", "async", "stateful", "dependency"],
    targets: ["data"],
    frameworks: {
      STRIDE: ["Information Disclosure"],
      "OWASP / AppSec": ["A01:2025 Broken Access Control", "A04:2025 Cryptographic Failures"],
      "Privacy / Supply Chain": ["Protected-data exposure"],
      Identity: ["Principal separation"],
    },
    mechanism: "more protected data crosses a boundary than the requester, component or task needs",
    consequence: "confidential or personal data may be disclosed",
    control: "minimize returned data, authorize fields and resources, and protect data in transit and at rest",
    verify: "compare low-privilege fixture responses, logs and dependency payloads with the minimum required dataset",
    severity: "CRITICAL",
  }),
  V("CRYPTO", "Cryptographic protection failure", {
    routeFamily: "F3",
    requires: ["sensitive_data"],
    variants: ["direct", "stateful", "dependency"],
    targets: ["data", "identity"],
    frameworks: {
      STRIDE: ["Information Disclosure", "Tampering"],
      "OWASP / AppSec": ["A04:2025 Cryptographic Failures"],
      "Privacy / Supply Chain": ["Data protection"],
    },
    mechanism: "sensitive data or authority relies on missing, weak or misapplied cryptographic protection",
    consequence: "confidentiality or integrity can fail across storage or transport boundaries",
    control: "use current protocols, correct key management and authenticated encryption where appropriate",
    verify: "inspect fixture transport/storage configuration and reject downgraded or invalid protection states",
    severity: "HIGH",
  }),
  V("SSRF", "Server-side request forgery or destination confusion", {
    routeFamily: "F2",
    requires: ["external_input", "tools"],
    variants: ["direct", "alternate", "async"],
    targets: ["service", "data", "action"],
    frameworks: {
      STRIDE: ["Tampering", "Information Disclosure", "Elevation of Privilege"],
      "OWASP / AppSec": ["A05:2025 Injection", "API7:2023 Server Side Request Forgery"],
      "Action / Tool Chain": ["Outbound request authority"],
    },
    mechanism: "attacker-controlled destination data causes a trusted component to reach an unintended resource",
    consequence: "internal services, metadata or privileged destinations may become reachable",
    control: "destination allowlists, network egress controls, URL normalization and protocol restrictions",
    verify: "use safe fixture destinations to verify blocked schemes, hosts, redirects and internal ranges",
    severity: "CRITICAL",
  }),
  V("RESOURCE", "Unrestricted resource consumption", {
    routeFamily: "F8",
    requires: ["external_input"],
    variants: ["direct", "alternate", "async"],
    targets: ["availability", "service"],
    frameworks: {
      STRIDE: ["Denial of Service"],
      "OWASP / AppSec": ["A06:2025 Insecure Design", "API4:2023 Unrestricted Resource Consumption"],
      "Open Search": ["Resource amplification"],
    },
    mechanism: "attacker-controlled work can consume disproportionate compute, storage, bandwidth or paid services",
    consequence: "availability or operating cost can be exhausted",
    control: "bounded work, quotas, rate limits, backpressure and cost-aware circuit breakers",
    verify: "measure harmless fixture workloads at increasing rates and confirm bounded resource use",
    severity: "HIGH",
  }),
  V("BUSINESS_FLOW", "Sensitive business-flow abuse", {
    routeFamily: "F2",
    requires: ["external_input", "high_impact"],
    variants: ["direct", "alternate", "async"],
    targets: ["action", "service"],
    frameworks: {
      STRIDE: ["Tampering", "Denial of Service"],
      "OWASP / AppSec": ["A06:2025 Insecure Design", "API6:2023 Unrestricted Access to Sensitive Business Flows"],
      "Action / Tool Chain": ["Business-flow authority"],
    },
    mechanism: "valid functionality can be automated or sequenced in a harmful way",
    consequence: "business state can be manipulated without a classic implementation bug",
    control: "abuse-case limits, sequencing constraints, anti-automation controls and business invariants",
    verify: "exercise safe high-rate or unusual-order fixture flows and verify business invariants remain enforced",
    severity: "HIGH",
  }),
  V("MISCONFIG", "Security misconfiguration", {
    routeFamily: "F7",
    any: ["external_input", "tools", "third_party", "sensitive_data"],
    variants: ["direct", "alternate", "dependency"],
    targets: ["service", "data", "identity"],
    frameworks: {
      STRIDE: ["Information Disclosure", "Elevation of Privilege"],
      "OWASP / AppSec": ["A02:2025 Security Misconfiguration", "API8:2023 Security Misconfiguration"],
      "Privacy / Supply Chain": ["Configuration boundary"],
    },
    mechanism: "defaults, debug surfaces, permissions or environment settings expose unintended capability",
    consequence: "protected interfaces, information or authority may become reachable",
    control: "secure defaults, configuration baselines, least privilege and continuous drift detection",
    verify: "compare fixture configuration against the intended baseline and probe known debug/admin surfaces safely",
    severity: "HIGH",
  }),
  V("INVENTORY", "Shadow, stale or undocumented interface", {
    routeFamily: "F7",
    any: ["external_input", "tools", "third_party"],
    variants: ["alternate", "dependency"],
    targets: ["service", "action", "data"],
    frameworks: {
      STRIDE: ["Information Disclosure", "Elevation of Privilege"],
      "OWASP / AppSec": ["A02:2025 Security Misconfiguration", "API9:2023 Improper Inventory Management"],
      "Open Search": ["Unknown interface"],
    },
    mechanism: "an old, hidden or undocumented interface remains reachable",
    consequence: "obsolete controls or unintended data/action surfaces remain exposed",
    control: "authoritative inventory, ownership, version retirement and exposure discovery",
    verify: "compare deployed fixture endpoints and versions with the authoritative inventory",
    severity: "MEDIUM",
  }),
  V("UNSAFE_API", "Unsafe consumption of external API or service data", {
    routeFamily: "F4",
    requires: ["third_party"],
    any: ["rag", "tools", "sensitive_data"],
    variants: ["dependency", "async", "direct"],
    targets: ["service", "data", "action"],
    frameworks: {
      STRIDE: ["Tampering", "Information Disclosure"],
      "OWASP / AppSec": ["API10:2023 Unsafe Consumption of APIs", "A03:2025 Software Supply Chain Failures"],
      "Privacy / Supply Chain": ["Third-party trust"],
    },
    mechanism: "trusted processing assumes external provider data is safe, authorized or structurally stable",
    consequence: "a compromised or malformed dependency can influence protected behavior",
    control: "validate dependency output, preserve provenance, constrain authority and define failure modes",
    verify: "use a safe test double returning malformed, stale and misleading fixture data",
    severity: "HIGH",
  }),
  V("SUPPLY_PACKAGE", "Package or dependency compromise", {
    routeFamily: "F7",
    requires: ["third_party"],
    variants: ["dependency", "async"],
    targets: ["dependency", "service", "data"],
    frameworks: {
      STRIDE: ["Tampering", "Elevation of Privilege"],
      "OWASP / AppSec": ["A03:2025 Software Supply Chain Failures", "A08:2025 Software or Data Integrity Failures"],
      "Privacy / Supply Chain": ["Dependency provenance", "Update integrity"],
    },
    mechanism: "a trusted package, component or provider changes outside the owner's direct control",
    consequence: "malicious or corrupted code/data can enter the trusted system boundary",
    control: "pin and verify provenance, minimize dependency authority and monitor changes",
    verify: "use controlled dependency substitutions or integrity failures in a test environment",
    severity: "CRITICAL",
  }),
  V("INTEGRITY", "Software or data integrity failure", {
    routeFamily: "F7",
    any: ["third_party", "rag", "external_input"],
    variants: ["dependency", "async", "stateful"],
    targets: ["dependency", "data", "service"],
    frameworks: {
      STRIDE: ["Tampering"],
      "OWASP / AppSec": ["A08:2025 Software or Data Integrity Failures"],
      "Privacy / Supply Chain": ["Integrity / provenance"],
    },
    mechanism: "trusted code or data is accepted without adequate integrity or provenance checks",
    consequence: "modified artifacts or data may be treated as authoritative",
    control: "signatures, integrity validation, provenance and controlled promotion paths",
    verify: "alter a harmless fixture artifact or dataset and confirm the integrity boundary rejects it",
    severity: "HIGH",
  }),
  V("SECRET", "Credential or secret exposure", {
    routeFamily: "F6",
    requires: ["secrets"],
    variants: ["direct", "stateful", "dependency", "async"],
    targets: ["identity", "action", "data"],
    frameworks: {
      STRIDE: ["Spoofing", "Elevation of Privilege", "Information Disclosure"],
      "OWASP / AppSec": ["A07:2025 Authentication Failures", "A02:2025 Security Misconfiguration"],
      Identity: ["Credential exposure", "Privilege amplification"],
      "Privacy / Supply Chain": ["Secret propagation"],
    },
    mechanism: "authority-bearing material is exposed to a broader context than intended",
    consequence: "local compromise can become broader authenticated access",
    control: "secret isolation, short-lived scoped credentials and elimination of shared static authority",
    verify: "inventory fixture credential reachability and compare effective permissions with minimum required scope",
    severity: "CRITICAL",
  }),
  V("LOGGING", "Security logging or alerting blind spot", {
    routeFamily: "F8",
    requires: ["high_impact"],
    variants: ["direct", "alternate", "async"],
    targets: ["audit", "recovery"],
    frameworks: {
      STRIDE: ["Repudiation"],
      "OWASP / AppSec": ["A09:2025 Security Logging & Alerting Failures"],
      "Action / Tool Chain": ["Detection / attribution"],
    },
    mechanism: "security-relevant actions can occur without durable, attributable detection",
    consequence: "harm may persist or be disputed without timely containment",
    control: "actor/context/action/outcome logging, protected audit trails and tested alert paths",
    verify: "trigger harmless fixture actions and verify attribution, alerting and audit durability",
    severity: "HIGH",
  }),
  V("REPUDIATION", "Action cannot be reliably attributed", {
    routeFamily: "F8",
    any: ["cross_user", "tools", "high_impact"],
    variants: ["direct", "alternate", "async"],
    targets: ["audit", "identity"],
    frameworks: {
      STRIDE: ["Repudiation"],
      "OWASP / AppSec": ["A09:2025 Security Logging & Alerting Failures"],
      Identity: ["Actor attribution"],
    },
    mechanism: "the system cannot reliably bind an important event to the acting principal and context",
    consequence: "misuse or failure cannot be reconstructed or contested",
    control: "tamper-resistant identity-bound audit events with sufficient context",
    verify: "perform safe multi-principal fixture actions and confirm each outcome is uniquely attributable",
    severity: "MEDIUM",
  }),
  V("EXCEPTION", "Exceptional condition fails open", {
    routeFamily: "F8",
    any: ["tools", "high_impact", "sensitive_data", "third_party"],
    variants: ["direct", "async", "dependency"],
    targets: ["service", "action", "data", "recovery"],
    frameworks: {
      STRIDE: ["Tampering", "Denial of Service", "Elevation of Privilege"],
      "OWASP / AppSec": ["A10:2025 Mishandling of Exceptional Conditions"],
      "Open Search": ["Failure-state transition"],
    },
    mechanism: "timeout, malformed state or dependency failure moves the system into a less protected path",
    consequence: "controls may be bypassed or state may become inconsistent",
    control: "fail closed where required, define bounded retries and make exceptional states explicit",
    verify: "inject harmless timeouts, malformed fixture states and dependency errors",
    severity: "HIGH",
  }),
  V("RECOVERY", "Containment or rollback can be bypassed", {
    routeFamily: "F8",
    requires: ["high_impact"],
    variants: ["direct", "async", "stateful", "dependency"],
    targets: ["recovery", "action"],
    frameworks: {
      STRIDE: ["Denial of Service", "Tampering"],
      "Action / Tool Chain": ["Containment / recovery"],
      "Open Search": ["Persistence after consequence"],
    },
    mechanism: "consequential state propagates faster or farther than containment can reverse",
    consequence: "harm persists after detection",
    control: "bounded blast radius, reversible operations, isolation and rehearsed recovery",
    verify: "perform a harmless reversible fixture action and measure containment and restoration",
    severity: "HIGH",
  }),
  V("RACE", "Race, ordering or stale-state abuse", {
    routeFamily: "F1",
    any: ["cross_user", "tools", "high_impact"],
    variants: ["async", "stateful", "alternate"],
    targets: ["service", "data", "action"],
    frameworks: {
      STRIDE: ["Tampering", "Elevation of Privilege"],
      "OWASP / AppSec": ["A06:2025 Insecure Design", "A10:2025 Mishandling of Exceptional Conditions"],
      "Open Search": ["Ordering / concurrency"],
    },
    mechanism: "security decisions depend on state that can change between checks or across asynchronous stages",
    consequence: "an attacker may exploit stale authorization, duplicate actions or inconsistent state",
    control: "atomic invariants, idempotency, version checks and authorization at the final mutation boundary",
    verify: "run safe concurrent fixture actions and stale-state retries",
    severity: "HIGH",
  }),
  V("CACHE", "Cache or stored-state trust confusion", {
    routeFamily: "F3",
    any: ["cross_user", "sensitive_data", "rag"],
    variants: ["stateful", "async"],
    targets: ["data", "identity", "service"],
    frameworks: {
      STRIDE: ["Information Disclosure", "Tampering"],
      "OWASP / AppSec": ["A01:2025 Broken Access Control", "A06:2025 Insecure Design"],
      Identity: ["State / principal binding"],
      "Open Search": ["Stored-state boundary"],
    },
    mechanism: "cached or persisted state is reused under the wrong principal, trust level or freshness assumption",
    consequence: "data, decisions or authority can cross contexts",
    control: "bind stored state to principal, scope, freshness and provenance",
    verify: "switch fixture principals and contexts while exercising cache and background paths",
    severity: "HIGH",
  }),
  V("PROVENANCE", "Source provenance confusion", {
    routeFamily: "F4",
    requires: ["rag"],
    any: ["untrusted_content", "third_party", "sensitive_data"],
    variants: ["direct", "async", "dependency", "stateful"],
    targets: ["data", "service", "action"],
    frameworks: {
      STRIDE: ["Tampering", "Information Disclosure"],
      "OWASP / AppSec": ["A06:2025 Insecure Design", "API10:2023 Unsafe Consumption of APIs"],
      "Privacy / Supply Chain": ["Data provenance", "Source trust"],
      "Open Search": ["Source-to-decision transition"],
    },
    mechanism: "retrieved or imported material inherits more trust than its source warrants",
    consequence: "untrusted, stale or unauthorized information influences protected outcomes",
    control: "preserve source identity, authorization, freshness and trust level through every transformation",
    verify: "seed harmless low-trust fixture data and observe whether provenance survives retrieval and transformation",
    severity: "HIGH",
  }),
  V("APPROVAL", "Human approval is not independent verification", {
    routeFamily: "F5",
    requires: ["human_approval", "high_impact"],
    variants: ["direct", "alternate", "async"],
    targets: ["action", "data"],
    frameworks: {
      STRIDE: ["Tampering", "Elevation of Privilege"],
      "OWASP / AppSec": ["A06:2025 Insecure Design"],
      "Action / Tool Chain": ["Approval integrity"],
      "Open Search": ["Human control bypass"],
    },
    mechanism: "the approver sees a filtered representation instead of authoritative action details",
    consequence: "a harmful action can receive valid-looking approval",
    control: "show original source, exact parameters, target identity and independent policy checks",
    verify: "create a benign mismatch between recommendation and authoritative fixture parameters",
    severity: "HIGH",
  }),
  V("TOOL_AUTHORITY", "Connected-action authority exceeds task scope", {
    routeFamily: "F2",
    requires: ["tools", "high_impact"],
    variants: ["direct", "alternate", "async", "dependency"],
    targets: ["action"],
    frameworks: {
      STRIDE: ["Elevation of Privilege", "Tampering"],
      "OWASP / AppSec": ["A01:2025 Broken Access Control", "A06:2025 Insecure Design"],
      Identity: ["Delegated authority"],
      "Action / Tool Chain": ["Least-privilege action scope"],
      "Open Search": ["Action-boundary crossing"],
    },
    mechanism: "an upstream request or decision can reach stronger action authority than the originating task needs",
    consequence: "a local reasoning or input failure becomes a consequential external action",
    control: "action-specific authorization, least-privilege credentials and parameter constraints at the final boundary",
    verify: "attempt a harmless out-of-scope fixture action using a low-authority request",
    severity: "CRITICAL",
  }),
  V("DEPENDENCY_OUTAGE", "Dependency failure amplifies into system failure", {
    routeFamily: "F7",
    requires: ["third_party"],
    variants: ["dependency", "async"],
    targets: ["availability", "service", "recovery"],
    frameworks: {
      STRIDE: ["Denial of Service"],
      "OWASP / AppSec": ["A03:2025 Software Supply Chain Failures", "A10:2025 Mishandling of Exceptional Conditions"],
      "Privacy / Supply Chain": ["Dependency resilience"],
    },
    mechanism: "an external provider becomes unavailable, slow or structurally incompatible",
    consequence: "system availability or recovery degrades beyond the intended boundary",
    control: "timeouts, circuit breakers, degraded modes, dependency isolation and tested recovery",
    verify: "use a controlled test double to simulate latency, outage and malformed dependency responses",
    severity: "MEDIUM",
  }),
  V("AI_PROMPT", "Direct prompt or instruction injection", {
    routeFamily: "F1",
    requires: ["ai_component", "external_input", "untrusted_content"],
    whenAI: true,
    variants: ["direct", "stateful"],
    targets: ["model", "action", "data"],
    frameworks: {
      STRIDE: ["Tampering"],
      "OWASP / AppSec": ["A05:2025 Injection", "A06:2025 Insecure Design"],
      "AI / GenAI": ["Instruction injection"],
      "Open Search": ["Model-context boundary"],
    },
    mechanism: "attacker-controlled instructions alter model behavior beyond the intended task",
    consequence: "model output, data handling or downstream actions may be redirected",
    control: "separate policy from data, constrain tool authority and verify outputs at protected boundaries",
    verify: "use harmless synthetic conflicting instructions and observe policy and action boundaries",
    severity: "HIGH",
  }),
  V("AI_INDIRECT", "Indirect instruction injection through connected content", {
    routeFamily: "F4",
    requires: ["ai_component", "rag", "untrusted_content"],
    whenAI: true,
    variants: ["async", "dependency", "stateful"],
    targets: ["model", "action", "data"],
    frameworks: {
      STRIDE: ["Tampering"],
      "OWASP / AppSec": ["A05:2025 Injection"],
      "AI / GenAI": ["Indirect instruction injection", "Retrieval trust"],
      "Privacy / Supply Chain": ["Connected-content provenance"],
    },
    mechanism: "instructions embedded in retrieved or imported material enter model context",
    consequence: "lower-trust content influences protected model behavior or actions",
    control: "preserve content provenance, separate instructions from data and constrain downstream authority",
    verify: "seed harmless marked instructions in a low-trust fixture source and trace their effect",
    severity: "CRITICAL",
  }),
  V("AI_RETRIEVAL", "Retrieval or grounding poisoning", {
    routeFamily: "F4",
    requires: ["ai_component", "rag"],
    any: ["untrusted_content", "third_party"],
    whenAI: true,
    variants: ["async", "dependency", "stateful"],
    targets: ["model", "data"],
    frameworks: {
      STRIDE: ["Tampering", "Information Disclosure"],
      "OWASP / AppSec": ["A08:2025 Software or Data Integrity Failures"],
      "AI / GenAI": ["Retrieval poisoning", "Grounding integrity"],
      "Privacy / Supply Chain": ["Data provenance"],
    },
    mechanism: "retrieval corpus or grounding data is manipulated, stale or unauthorized",
    consequence: "model conclusions inherit corrupted or inappropriate context",
    control: "source authorization, provenance, integrity, freshness and trust-aware retrieval",
    verify: "insert harmless contradictory fixture records and verify provenance-aware behavior",
    severity: "HIGH",
  }),
  V("AI_TOOL", "Model-influenced tool or action abuse", {
    routeFamily: "F2",
    requires: ["ai_component", "tools"],
    any: ["high_impact", "secrets"],
    whenAI: true,
    variants: ["direct", "alternate", "async"],
    targets: ["action", "identity"],
    frameworks: {
      STRIDE: ["Elevation of Privilege", "Tampering"],
      "OWASP / AppSec": ["A01:2025 Broken Access Control", "A06:2025 Insecure Design"],
      "AI / GenAI": ["Excessive agency", "Tool abuse"],
      "Action / Tool Chain": ["Model-to-action authority"],
    },
    mechanism: "model output can select or parameterize actions with authority beyond the task",
    consequence: "untrusted context or model error becomes an external consequential action",
    control: "least-privilege tools, action authorization, parameter validation and independent policy enforcement",
    verify: "attempt harmless out-of-scope fixture tool calls driven by model-visible context",
    severity: "CRITICAL",
  }),
  V("AI_DISCLOSURE", "Sensitive information disclosure through model context or output", {
    routeFamily: "F3",
    requires: ["ai_component", "sensitive_data"],
    whenAI: true,
    variants: ["direct", "stateful", "async"],
    targets: ["model", "data"],
    frameworks: {
      STRIDE: ["Information Disclosure"],
      "OWASP / AppSec": ["A01:2025 Broken Access Control"],
      "AI / GenAI": ["Sensitive information disclosure"],
      "Privacy / Supply Chain": ["Model-context privacy"],
    },
    mechanism: "protected information enters model context or output outside the intended principal/task boundary",
    consequence: "confidential information may be exposed",
    control: "data minimization, principal-aware retrieval, output filtering and authorization at the data boundary",
    verify: "use isolated fixture secrets and cross-principal prompts to verify non-disclosure",
    severity: "CRITICAL",
  }),
  V("AI_SUPPLY", "Model or AI component supply-chain compromise", {
    routeFamily: "F7",
    requires: ["ai_component", "third_party"],
    whenAI: true,
    variants: ["dependency", "async"],
    targets: ["model", "dependency", "data"],
    frameworks: {
      STRIDE: ["Tampering"],
      "OWASP / AppSec": ["A03:2025 Software Supply Chain Failures", "A08:2025 Software or Data Integrity Failures"],
      "AI / GenAI": ["Model supply chain"],
      "Privacy / Supply Chain": ["Model provenance"],
    },
    mechanism: "model, adapter, embedding, dataset or provider changes outside the owner's direct control",
    consequence: "behavior or data integrity can shift inside a trusted AI boundary",
    control: "model/data provenance, version pinning, integrity checks, evaluation gates and scoped provider access",
    verify: "compare controlled versions and integrity metadata using non-sensitive fixtures",
    severity: "HIGH",
  }),
];

const severityRank = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };

function vectorState(seed, flags) {
  const requiredValues = seed.requires.map((key) => flags[key]);
  if (requiredValues.some((value) => value === false))
    return { state: "REJECTED", missing: [], reason: "required condition is 0" };
  if (seed.whenAI && flags.ai_component === false)
    return { state: "REJECTED", missing: [], reason: "target has no AI/ML component" };

  const missing = seed.requires.filter((key) => flags[key] !== true);
  if (seed.whenAI && flags.ai_component !== true && !missing.includes("ai_component"))
    missing.push("ai_component");

  if (seed.any.length) {
    const anyValues = seed.any.map((key) => flags[key]);
    if (anyValues.every((value) => value === false))
      return { state: "REJECTED", missing: [], reason: "no enabling target/surface remains" };
    if (!anyValues.some((value) => value === true))
      seed.any
        .filter((key) => flags[key] === null)
        .forEach((key) => {
          if (!missing.includes(key)) missing.push(key);
        });
  }
  return {
    state: missing.length ? "CONDITIONAL" : "ACTIVE",
    missing,
    reason: missing.length ? "one or more enabling facts remain ?" : "required facts are present",
  };
}


const OPEN_SEARCH_ENTRIES = [
  ["external_input", "external input / actor"],
  ["untrusted_content", "lower-trust material"],
  ["rag", "connected source / retrieval"],
  ["third_party", "external dependency / provider"],
  ["secrets", "credential / privileged token"],
  ["cross_user", "shared-principal boundary"],
  ["tools", "connected interface / action surface"],
];

const OPEN_SEARCH_CONSEQUENCES = [
  {
    id: "DISCLOSURE",
    label: "protected-data disclosure",
    condition: "sensitive_data",
    target: "data",
    routeFamily: "F3",
    severity: "CRITICAL",
    frameworks: {
      STRIDE: ["Information Disclosure"],
      "OWASP / AppSec": ["A01:2025 Broken Access Control"],
      "Privacy / Supply Chain": ["Protected-data exposure"],
      "Open Search": ["Asset-first disclosure search"],
    },
    control: "principal-aware data authorization and least-data exposure at every boundary",
    verify: "use isolated fixture assets and principals to test direct, alternate and delayed access paths",
  },
  {
    id: "ACTION",
    label: "unauthorized consequential action",
    condition: "high_impact",
    target: "action",
    routeFamily: "F2",
    severity: "CRITICAL",
    frameworks: {
      STRIDE: ["Elevation of Privilege", "Tampering"],
      "OWASP / AppSec": ["A01:2025 Broken Access Control", "A06:2025 Insecure Design"],
      Identity: ["Authority expansion"],
      "Action / Tool Chain": ["Action-boundary crossing"],
      "Open Search": ["Consequence-first action search"],
    },
    control: "action-specific authorization and least-privilege authority at the final mutation boundary",
    verify: "attempt harmless out-of-scope fixture actions through direct and alternate paths",
  },
  {
    id: "INTEGRITY",
    label: "protected-state integrity change",
    condition: "untrusted_content",
    target: "service",
    routeFamily: "F1",
    severity: "HIGH",
    frameworks: {
      STRIDE: ["Tampering"],
      "OWASP / AppSec": ["A05:2025 Injection", "A08:2025 Software or Data Integrity Failures"],
      "Open Search": ["Integrity-first search"],
    },
    control: "validate trust transitions and preserve integrity through transformations and stored state",
    verify: "introduce harmless marked fixture changes at each ingress and compare protected state transitions",
  },
  {
    id: "AVAILABILITY",
    label: "availability or resource exhaustion",
    condition: "external_input",
    target: "availability",
    routeFamily: "F8",
    severity: "HIGH",
    frameworks: {
      STRIDE: ["Denial of Service"],
      "OWASP / AppSec": ["API4:2023 Unrestricted Resource Consumption", "A10:2025 Mishandling of Exceptional Conditions"],
      "Open Search": ["Resource-first search"],
    },
    control: "bounded work, quotas, backpressure, graceful degradation and containment",
    verify: "exercise bounded synthetic load across each reachable surface and observe resource ceilings",
  },
  {
    id: "PROVENANCE",
    label: "provenance or trust confusion",
    condition: "rag",
    target: "data",
    routeFamily: "F4",
    severity: "HIGH",
    frameworks: {
      STRIDE: ["Tampering", "Information Disclosure"],
      "OWASP / AppSec": ["A08:2025 Software or Data Integrity Failures", "API10:2023 Unsafe Consumption of APIs"],
      "Privacy / Supply Chain": ["Source trust / provenance"],
      "Open Search": ["Source-first trust search"],
    },
    control: "preserve source identity, authorization, freshness and trust level through every transformation",
    verify: "seed harmless low-trust fixture material and trace provenance into decisions and outputs",
  },
];

function triStateFor(keys, flags) {
  const values = keys.map((key) => flags[key]);
  if (values.some((value) => value === false)) return "REJECTED";
  return values.every((value) => value === true) ? "ACTIVE" : "CONDITIONAL";
}

function generateOpenSearchLattice(input, lensRuns, startSequence = 1) {
  const flags = input.flags || {};
  const activeLensNames = new Set(
    lensRuns.filter((lens) => lens.active).map((lens) => lens.name),
  );
  const assets = (input.assets || []).filter(Boolean);
  const contexts = assets.length ? assets.slice(0, 20) : ["system state"];
  const variants = ["direct", "alternate", "async"];
  const vectors = [];
  let sequence = startSequence;

  for (const [entryKey, entryLabel] of OPEN_SEARCH_ENTRIES) {
    for (const consequence of OPEN_SEARCH_CONSEQUENCES) {
      for (const asset of contexts) {
        for (const variantId of variants) {
          const variant = ROUTE_VARIANTS[variantId];
          const state = triStateFor(
            [...new Set([entryKey, consequence.condition])],
            flags,
          );
          const frameworkEntries = Object.entries(consequence.frameworks)
            .filter(([lens]) => activeLensNames.has(lens))
            .map(([lens, categories]) => ({ lens, categories: [...categories] }));
          const finalState =
            frameworkEntries.length || state === "REJECTED"
              ? state
              : "REJECTED";
          const required = [...new Set([entryKey, consequence.condition])];
          const missing = required.filter((key) => flags[key] !== true && flags[key] !== false);
          vectors.push({
            id: "OS" + String(sequence++).padStart(4, "0"),
            seedId: "OPEN_" + consequence.id,
            routeFamily: consequence.routeFamily,
            title: `${entryLabel} → ${consequence.label} · ${asset}`,
            variant: variantId,
            variantLabel: variant.label,
            target: consequence.target,
            targetLabel: asset,
            mechanism: `${entryLabel} crosses the ${variant.segment} toward ${asset}`,
            consequence: consequence.label,
            path: `${entryLabel} → ${variant.segment} → ${asset} → ${consequence.label}`,
            requires: required,
            requiresAny: [],
            supports: [],
            missing,
            state: finalState,
            rejectedReason:
              finalState === "REJECTED"
                ? frameworkEntries.length
                  ? "one of the open-search constraints is 0"
                  : "no active perspective maps this vector"
                : "",
            severity: consequence.severity,
            control: consequence.control,
            verify: consequence.verify,
            frameworks: frameworkEntries,
            hitLenses: frameworkEntries.map((entry) => entry.lens),
            generatedBy: "open-search-lattice",
          });
        }
      }
    }
  }
  return vectors;
}

function generateAttackVectorSpace(input, lensRuns = []) {
  const flags = input.flags || {};
  const activeLensNames = new Set(
    lensRuns.filter((lens) => lens.active).map((lens) => lens.name),
  );
  const vectors = [];
  let sequence = 1;

  for (const seed of ATTACK_VECTOR_SEEDS) {
    const baseState = vectorState(seed, flags);
    for (const variantId of seed.variants) {
      const variant = ROUTE_VARIANTS[variantId];
      for (const targetId of seed.targets) {
        const target = TARGETS[targetId] || targetId;
        const frameworkEntries = Object.entries(seed.frameworks)
          .filter(([lens]) => activeLensNames.has(lens))
          .map(([lens, categories]) => ({ lens, categories: [...categories] }));
        const id = "AV" + String(sequence++).padStart(3, "0");
        const activeFrameworks = frameworkEntries.map((entry) => entry.lens);
        const state =
          frameworkEntries.length || baseState.state === "REJECTED"
            ? baseState.state
            : "REJECTED";
        vectors.push({
          id,
          seedId: seed.id,
          routeFamily: seed.routeFamily,
          title: seed.title,
          variant: variantId,
          variantLabel: variant.label,
          target: targetId,
          targetLabel: target,
          mechanism: seed.mechanism,
          consequence: seed.consequence,
          path: `${variant.segment} → ${seed.mechanism} → ${target} → ${seed.consequence}`,
          requires: [...seed.requires],
          requiresAny: [...seed.any],
          supports: [...seed.supports],
          missing: [...baseState.missing],
          state,
          rejectedReason:
            state === "REJECTED"
              ? frameworkEntries.length
                ? baseState.reason
                : "no active perspective maps this vector"
              : "",
          severity: seed.severity,
          control: seed.control,
          verify: seed.verify,
          frameworks: frameworkEntries,
          hitLenses: activeFrameworks,
        });
      }
    }
  }

  const openSearchVectors = generateOpenSearchLattice(
    input,
    lensRuns,
    sequence,
  );
  vectors.push(...openSearchVectors);

  vectors.sort(
    (a, b) =>
      (a.state === "ACTIVE" ? 0 : a.state === "CONDITIONAL" ? 1 : 2) -
        (b.state === "ACTIVE" ? 0 : b.state === "CONDITIONAL" ? 1 : 2) ||
      severityRank[b.severity] - severityRank[a.severity] ||
      a.id.localeCompare(b.id),
  );

  const surviving = vectors.filter((vector) => vector.state !== "REJECTED");
  const active = surviving.filter((vector) => vector.state === "ACTIVE");
  const conditional = surviving.filter((vector) => vector.state === "CONDITIONAL");
  const rejected = vectors.filter((vector) => vector.state === "REJECTED");

  const frameworkViews = {};
  for (const lens of lensRuns) {
    const lensVectors = surviving.filter((vector) =>
      vector.frameworks.some((entry) => entry.lens === lens.name),
    );
    const categories = {};
    for (const vector of lensVectors) {
      const mapping = vector.frameworks.find((entry) => entry.lens === lens.name);
      for (const category of mapping?.categories || []) {
        if (!categories[category])
          categories[category] = { active: 0, conditional: 0, vectors: [] };
        categories[category][
          vector.state === "ACTIVE" ? "active" : "conditional"
        ]++;
        categories[category].vectors.push(vector.id);
      }
    }
    frameworkViews[lens.name] = {
      name: lens.name,
      applicable: lens.applicable,
      active: lens.active,
      vectorCount: lensVectors.length,
      activeCount: lensVectors.filter((vector) => vector.state === "ACTIVE").length,
      conditionalCount: lensVectors.filter(
        (vector) => vector.state === "CONDITIONAL",
      ).length,
      categories,
      vectors: lensVectors,
    };
  }

  const routeFamilies = {};
  for (const vector of surviving) {
    if (!routeFamilies[vector.routeFamily])
      routeFamilies[vector.routeFamily] = {
        active: 0,
        conditional: 0,
        vectorIds: [],
        topVectors: [],
      };
    const family = routeFamilies[vector.routeFamily];
    family[vector.state === "ACTIVE" ? "active" : "conditional"]++;
    family.vectorIds.push(vector.id);
    if (family.topVectors.length < 12) family.topVectors.push(vector);
  }

  return {
    generated: vectors.length,
    activeCount: active.length,
    conditionalCount: conditional.length,
    rejectedCount: rejected.length,
    survivingCount: surviving.length,
    vectors,
    surviving,
    active,
    conditional,
    routeFamilies,
    frameworkViews,
    coreConditionAssignmentSpace: 3 ** Object.keys(flags).length,
    catalogVectorCount: vectors.filter(
      (vector) => vector.generatedBy !== "open-search-lattice",
    ).length,
    openSearchVectorCount: vectors.filter(
      (vector) => vector.generatedBy === "open-search-lattice",
    ).length,
  };
}

export {
  ATTACK_VECTOR_SEEDS,
  ROUTE_VARIANTS,
  TARGETS,
  generateAttackVectorSpace,
};
