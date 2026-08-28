from __future__ import annotations

import hashlib
import html
import ipaddress
import json
import re
from dataclasses import dataclass, field
from html.parser import HTMLParser
from pathlib import Path
from typing import Any, Callable, Mapping, Protocol, Sequence
from urllib.parse import urlencode, urlparse
from urllib.request import Request, urlopen

from .evidence_planning import EvidenceAcquisitionResult
from .logical_robot import (
    LOGICAL_CAPABILITIES,
    LogicalObservation,
    LogicalRobotPolicy,
    LogicalRobotRequest,
    LogicalRobotRunResult,
    LogicalRobotToolResult,
    execute_logical_robot_plans,
)
from .oracle_evolution import (
    OracleChallengeSuite,
    challenge_case_from_problem,
    extract_problem_rule_population,
)
from .oracle_genesis import OracleFailureObservation
from .problem import (
    OntologyMap,
    ProblemQuery,
    SemanticAtom,
    SemanticProblemFrame,
    SemanticRule,
)
from .runtime import RuntimeStepResult, SuperintelligenceRuntime
from .semantic import SemanticClaim


class FirstLogicalRobotError(ValueError):
    """Raised when BUILD 16 cannot execute the logical robot without guessing."""


@dataclass(frozen=True)
class WebReference:
    reference_id: str
    title: str
    url: str
    snippet: str = ""
    provenance: Mapping[str, Any] = field(default_factory=dict)

    def __post_init__(self) -> None:
        if not self.reference_id.strip() or not self.title.strip() or not self.url.strip():
            raise ValueError("web reference requires reference_id, title and url")
        parsed = urlparse(self.url)
        if parsed.scheme not in {"http", "https"} or not parsed.netloc:
            raise ValueError("web reference url must be http(s)")


@dataclass(frozen=True)
class WebDocument:
    reference: WebReference
    text: str
    content_type: str = "text/plain"
    provenance: Mapping[str, Any] = field(default_factory=dict)

    def __post_init__(self) -> None:
        if not self.text.strip():
            raise ValueError("web document requires non-empty text")


class WebSearchBackend(Protocol):
    backend_id: str

    def search(self, query: str, *, limit: int) -> tuple[WebReference, ...]: ...


class WebReadBackend(Protocol):
    backend_id: str

    def read(self, reference: WebReference, *, max_chars: int) -> WebDocument: ...


class _VisibleTextParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self._skip_depth = 0
        self.parts: list[str] = []

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        if tag.lower() in {"script", "style", "noscript", "svg"}:
            self._skip_depth += 1

    def handle_endtag(self, tag: str) -> None:
        if tag.lower() in {"script", "style", "noscript", "svg"} and self._skip_depth:
            self._skip_depth -= 1

    def handle_data(self, data: str) -> None:
        if not self._skip_depth:
            value = " ".join(data.split())
            if value:
                self.parts.append(value)


def html_to_text(value: str) -> str:
    parser = _VisibleTextParser()
    parser.feed(value)
    return " ".join(parser.parts)


def _strip_fragment_html(value: str) -> str:
    return " ".join(html_to_text(html.unescape(value)).split())


@dataclass
class WikipediaSearchBackend:
    """Key-free public search backend for the first runnable logical robot.

    This is deliberately one concrete MVP observer, not a privileged source and
    not part of QCDS semantics. It can be replaced by another WebSearchBackend.
    """

    language: str = "en"
    timeout_seconds: float = 8.0
    user_agent: str = "QCDS-First-Logical-Robot/1.0 (+https://github.com/iampathat/thesyntractvision)"
    opener: Callable[..., Any] = urlopen
    backend_id: str = "wikipedia_search_v0"

    def __post_init__(self) -> None:
        if not re.fullmatch(r"[a-zA-Z-]{2,16}", self.language):
            raise ValueError("wikipedia language must be a simple language code")
        if self.timeout_seconds <= 0:
            raise ValueError("search timeout must be positive")

    def search(self, query: str, *, limit: int) -> tuple[WebReference, ...]:
        query = " ".join(query.split())
        if not query:
            raise FirstLogicalRobotError("web search requires a non-empty query")
        if limit <= 0:
            raise ValueError("search limit must be positive")
        endpoint = f"https://{self.language}.wikipedia.org/w/api.php"
        params = urlencode({
            "action": "query",
            "list": "search",
            "srsearch": query,
            "srlimit": min(limit, 20),
            "format": "json",
            "utf8": "1",
        })
        request = Request(f"{endpoint}?{params}", headers={"User-Agent": self.user_agent})
        with self.opener(request, timeout=self.timeout_seconds) as response:
            payload = json.loads(response.read().decode("utf-8"))
        results = payload.get("query", {}).get("search", [])
        references: list[WebReference] = []
        for item in results[:limit]:
            page_id = str(item.get("pageid", "")).strip()
            title = str(item.get("title", "")).strip()
            if not page_id or not title:
                continue
            references.append(WebReference(
                reference_id=f"wikipedia:{self.language}:{page_id}",
                title=title,
                url=f"https://{self.language}.wikipedia.org/?curid={page_id}",
                snippet=_strip_fragment_html(str(item.get("snippet", ""))),
                provenance={
                    "search_backend": self.backend_id,
                    "search_query": query,
                    "page_id": page_id,
                    "external_truth_claim": False,
                },
            ))
        return tuple(references)


def _domain_allowed(hostname: str, allowed_domains: Sequence[str]) -> bool:
    hostname = hostname.lower().rstrip(".")
    if not hostname:
        return False
    try:
        ip = ipaddress.ip_address(hostname)
    except ValueError:
        ip = None
    if ip is not None:
        if ip.is_private or ip.is_loopback or ip.is_link_local or ip.is_reserved or ip.is_multicast:
            return False
    for domain in allowed_domains:
        domain = domain.lower().lstrip(".").rstrip(".")
        if hostname == domain or hostname.endswith(f".{domain}"):
            return True
    return False


@dataclass
class HttpWebReadBackend:
    """Bounded read-only HTTP observer with an explicit domain allow-list."""

    allowed_domains: tuple[str, ...] = ("wikipedia.org",)
    timeout_seconds: float = 8.0
    max_bytes: int = 1_500_000
    user_agent: str = "QCDS-First-Logical-Robot/1.0 (+https://github.com/iampathat/thesyntractvision)"
    opener: Callable[..., Any] = urlopen
    backend_id: str = "bounded_http_read_v0"

    def __post_init__(self) -> None:
        if not self.allowed_domains:
            raise ValueError("http reader requires at least one allowed domain")
        if self.timeout_seconds <= 0 or self.max_bytes <= 0:
            raise ValueError("http reader bounds must be positive")

    def read(self, reference: WebReference, *, max_chars: int) -> WebDocument:
        if max_chars <= 0:
            raise ValueError("max_chars must be positive")
        parsed = urlparse(reference.url)
        if parsed.scheme not in {"http", "https"} or not parsed.hostname:
            raise FirstLogicalRobotError("logical robot may only read http(s) references")
        if not _domain_allowed(parsed.hostname, self.allowed_domains):
            raise FirstLogicalRobotError(
                f"logical robot read blocked by domain allow-list: {parsed.hostname!r}"
            )
        request = Request(reference.url, headers={"User-Agent": self.user_agent})
        with self.opener(request, timeout=self.timeout_seconds) as response:
            content_type = str(response.headers.get("Content-Type", "text/plain")).lower()
            raw = response.read(self.max_bytes + 1)
        if len(raw) > self.max_bytes:
            raise FirstLogicalRobotError("logical robot page exceeds configured byte limit")
        charset_match = re.search(r"charset=([a-zA-Z0-9._-]+)", content_type)
        charset = charset_match.group(1) if charset_match else "utf-8"
        decoded = raw.decode(charset, errors="replace")
        text = html_to_text(decoded) if "html" in content_type else " ".join(decoded.split())
        text = text[:max_chars].strip()
        if not text:
            raise FirstLogicalRobotError("logical robot page produced no readable text")
        return WebDocument(
            reference=reference,
            text=text,
            content_type=content_type,
            provenance={
                "read_backend": self.backend_id,
                "allowed_domain": parsed.hostname,
                "read_only": True,
                "external_truth_claim": False,
            },
        )


def _normalize_text(value: str) -> str:
    return " ".join(value.casefold().split())


def _candidate_count(text: str, candidate: str) -> int:
    normalized_text = _normalize_text(text)
    normalized_candidate = _normalize_text(candidate)
    if not normalized_candidate:
        return 0
    pattern = r"(?<!\w)" + re.escape(normalized_candidate) + r"(?!\w)"
    return len(re.findall(pattern, normalized_text))


def _excerpt(text: str, candidate: str, *, radius: int = 160) -> str:
    folded = text.casefold()
    index = folded.find(candidate.casefold())
    if index < 0:
        return text[: radius * 2].strip()
    start = max(0, index - radius)
    end = min(len(text), index + len(candidate) + radius)
    return " ".join(text[start:end].split())


@dataclass(frozen=True)
class CandidateMentionExtractor:
    """Deterministic, target-blind first-MVP observation extractor.

    It does not ask a language model to decide the answer. A source produces an
    observation only when one represented candidate has a unique textual lead.
    Conflicting sources therefore remain separate evidence rather than being
    collapsed by the logical robot.
    """

    min_mentions: int = 1
    min_lead_ratio: float = 1.5
    max_confidence: float = 0.95
    extractor_id: str = "candidate_mention_extractor_v0"

    def __post_init__(self) -> None:
        if self.min_mentions <= 0:
            raise ValueError("min_mentions must be positive")
        if self.min_lead_ratio < 1.0:
            raise ValueError("min_lead_ratio must be >= 1")
        if not 0.5 <= self.max_confidence <= 1.0:
            raise ValueError("max_confidence must be in [0.5, 1.0]")

    def extract(
        self,
        request: LogicalRobotRequest,
        documents: Sequence[WebDocument],
    ) -> tuple[LogicalObservation, ...]:
        observations: list[LogicalObservation] = []
        for document in documents:
            searchable = f"{document.reference.title} {document.reference.snippet} {document.text}"
            for query_id in request.query_ids:
                candidates = tuple(request.candidate_values.get(query_id, ()))
                if not candidates:
                    continue
                counts = {candidate: _candidate_count(searchable, candidate) for candidate in candidates}
                ranked = sorted(counts.items(), key=lambda item: (-item[1], item[0]))
                top_candidate, top_count = ranked[0]
                second_count = ranked[1][1] if len(ranked) > 1 else 0
                if top_count < self.min_mentions:
                    continue
                if second_count > 0 and top_count < second_count * self.min_lead_ratio:
                    continue
                if len(ranked) > 1 and top_count == second_count:
                    continue
                total = sum(counts.values())
                share = top_count / total if total else 0.0
                confidence = min(self.max_confidence, max(0.5, 0.5 + 0.45 * share))
                digest = hashlib.sha256(
                    f"{request.evidence_action_id}|{query_id}|{document.reference.url}|{top_candidate}".encode("utf-8")
                ).hexdigest()[:16]
                observations.append(LogicalObservation(
                    observation_id=f"webobs:{digest}",
                    query_id=query_id,
                    observed_value=top_candidate,
                    source_id=document.reference.reference_id,
                    capability=request.capability,
                    confidence=confidence,
                    polarity=True,
                    uri=document.reference.url,
                    excerpt=_excerpt(document.text, top_candidate),
                    provenance={
                        "extractor": self.extractor_id,
                        "candidate_counts": counts,
                        "unique_textual_lead_required": True,
                        "target_visible_to_extractor": False,
                        "holdout_visible_to_extractor": False,
                        "source_is_external_truth_claim": False,
                    },
                ))
        return tuple(observations)


def _search_query(request: LogicalRobotRequest) -> str:
    semantic_parts: list[str] = []
    for dimension_id in request.dimension_ids:
        parts = dimension_id.split("::")
        if len(parts) >= 4 and parts[0] == "problem":
            semantic_parts.extend((parts[1].replace("_", " "), parts[2].replace("_", " ")))
            break
    candidates = [
        value
        for query_id in request.query_ids
        for value in request.candidate_values.get(query_id, ())
    ]
    base = " ".join(dict.fromkeys((*semantic_parts, *candidates)))
    return base.strip() or request.objective


@dataclass
class PublicWebLogicalRobotTool:
    """First concrete logical-robot body for public information observation."""

    search_backend: WebSearchBackend = field(default_factory=WikipediaSearchBackend)
    read_backend: WebReadBackend = field(default_factory=HttpWebReadBackend)
    extractor: CandidateMentionExtractor = field(default_factory=CandidateMentionExtractor)
    search_limit: int = 5
    max_pages_per_action: int = 4
    max_chars_per_page: int = 40_000
    tool_id: str = "public_web_logical_robot_v0"
    capabilities: tuple[str, ...] = LOGICAL_CAPABILITIES
    _references: dict[str, tuple[WebReference, ...]] = field(default_factory=dict, init=False, repr=False)
    _documents: dict[str, tuple[WebDocument, ...]] = field(default_factory=dict, init=False, repr=False)

    def __post_init__(self) -> None:
        if self.search_limit <= 0 or self.max_pages_per_action <= 0 or self.max_chars_per_page <= 0:
            raise ValueError("public web logical robot bounds must be positive")

    def _search(self, request: LogicalRobotRequest) -> tuple[WebReference, ...]:
        references = self.search_backend.search(_search_query(request), limit=self.search_limit)
        self._references[request.evidence_action_id] = references
        return references

    def _read_cached(self, request: LogicalRobotRequest) -> tuple[WebDocument, ...]:
        references = self._references.get(request.evidence_action_id, ())
        if not references:
            references = self._search(request)
        documents: list[WebDocument] = []
        for reference in references[: self.max_pages_per_action]:
            try:
                documents.append(self.read_backend.read(reference, max_chars=self.max_chars_per_page))
            except (FirstLogicalRobotError, OSError, UnicodeError, ValueError):
                continue
        resolved = tuple(documents)
        self._documents[request.evidence_action_id] = resolved
        return resolved

    def observe(self, request: LogicalRobotRequest) -> LogicalRobotToolResult:
        if request.capability not in self.capabilities:
            raise FirstLogicalRobotError(f"unsupported logical robot capability {request.capability!r}")

        if request.capability in {"search", "query"}:
            try:
                references = self._search(request)
            except (OSError, ValueError, json.JSONDecodeError) as error:
                return LogicalRobotToolResult(
                    exhausted=True,
                    retry_capabilities=("read",) if self._references.get(request.evidence_action_id) else (),
                    notes=(f"search_failed:{type(error).__name__}",),
                    provenance={"tool": self.tool_id, "read_only": True, "external_truth_claim": False},
                )
            return LogicalRobotToolResult(
                discovered_references=tuple(reference.url for reference in references),
                retry_capabilities=("read",) if references else (),
                exhausted=not references,
                notes=("references_discovered",) if references else ("no_references",),
                provenance={
                    "tool": self.tool_id,
                    "search_backend": self.search_backend.backend_id,
                    "read_only": True,
                    "external_truth_claim": False,
                },
            )

        if request.capability in {"read", "follow"}:
            documents = self._read_cached(request)
            observations = self.extractor.extract(request, documents)
            return LogicalRobotToolResult(
                observations=observations,
                discovered_references=tuple(document.reference.url for document in documents),
                retry_capabilities=("compare", "compute") if documents and not observations else (),
                exhausted=not documents,
                notes=("documents_read",) if documents else ("no_readable_documents",),
                provenance={
                    "tool": self.tool_id,
                    "read_backend": self.read_backend.backend_id,
                    "read_only": True,
                    "external_truth_claim": False,
                },
            )

        documents = self._documents.get(request.evidence_action_id, ())
        if not documents:
            documents = self._read_cached(request)
        observations = self.extractor.extract(request, documents)
        return LogicalRobotToolResult(
            observations=observations,
            discovered_references=tuple(document.reference.url for document in documents),
            retry_capabilities=(),
            exhausted=not observations,
            notes=("candidate_evidence_compared",) if observations else ("candidate_evidence_ambiguous",),
            provenance={
                "tool": self.tool_id,
                "operation": request.capability,
                "read_only": True,
                "external_truth_claim": False,
            },
        )


@dataclass(frozen=True)
class FirstLogicalRobotConfig:
    max_runtime_cycles: int = 6
    repeat_failure_observations: bool = False

    def __post_init__(self) -> None:
        if self.max_runtime_cycles <= 0:
            raise ValueError("logical robot max_runtime_cycles must be positive")


@dataclass(frozen=True)
class FirstLogicalRobotRun:
    mission_id: str
    steps: tuple[RuntimeStepResult, ...]
    robot_runs: tuple[LogicalRobotRunResult, ...]
    acquired_evidence_ids: tuple[str, ...]
    status: str
    resumable: bool
    final_state: Any
    provenance: Mapping[str, Any]

    def __post_init__(self) -> None:
        if self.status not in {"quiescent", "awaiting_sources", "terminal", "max_cycles"}:
            raise ValueError("invalid first logical robot status")


@dataclass
class FirstLogicalRobot:
    """First runnable logical robot above the BUILD 15 callable runtime.

    The robot never calls Fabric/oracle internals directly. It asks the runtime
    for the next evidence plan, observes through BUILD 14 tools, returns evidence
    with runtime.observe(), and asks the same persistent intelligence again.
    """

    runtime: SuperintelligenceRuntime
    tools: tuple[Any, ...]
    robot_policy: LogicalRobotPolicy = field(default_factory=LogicalRobotPolicy)
    config: FirstLogicalRobotConfig = field(default_factory=FirstLogicalRobotConfig)

    def __post_init__(self) -> None:
        if not self.tools:
            raise ValueError("first logical robot requires at least one LogicalRobotTool")

    def run(
        self,
        mission_id: str,
        challenge_suite: OracleChallengeSuite,
        *,
        failure_observations: Sequence[OracleFailureObservation] = (),
        **step_kwargs: Any,
    ) -> FirstLogicalRobotRun:
        steps: list[RuntimeStepResult] = []
        robot_runs: list[LogicalRobotRunResult] = []
        acquired_ids: list[str] = []
        supplied_failures = tuple(failure_observations)

        for cycle in range(self.config.max_runtime_cycles):
            active_failures = supplied_failures if (cycle == 0 or self.config.repeat_failure_observations) else ()
            step = self.runtime.step(
                mission_id,
                challenge_suite,
                observations=active_failures,
                **step_kwargs,
            )
            steps.append(step)
            checkpoint = step.cycle.checkpoint
            if checkpoint.terminal:
                return FirstLogicalRobotRun(
                    mission_id, tuple(steps), tuple(robot_runs), tuple(acquired_ids), "terminal", False,
                    self.runtime.state(mission_id),
                    {"engine": "first_logical_robot_v0", "build": 16, "canonical_spec_modified": False},
                )

            if step.cycle.plans:
                robot_run = execute_logical_robot_plans(
                    step.compilation,
                    step.cycle.plans,
                    self.tools,
                    policy=self.robot_policy,
                )
                robot_runs.append(robot_run)
                known_ids = set(self.runtime.store.evidence_ids(mission_id))
                fresh = tuple(
                    result for result in robot_run.evidence_results if result.result_id not in known_ids
                )
                if not fresh:
                    return FirstLogicalRobotRun(
                        mission_id, tuple(steps), tuple(robot_runs), tuple(acquired_ids),
                        "awaiting_sources", True, self.runtime.state(mission_id),
                        {
                            "engine": "first_logical_robot_v0", "build": 16,
                            "reason": "no_new_external_evidence", "busy_loop_prevented": True,
                            "canonical_spec_modified": False,
                        },
                    )
                self.runtime.observe(mission_id, fresh)
                acquired_ids.extend(result.result_id for result in fresh)
                continue

            if checkpoint.status == "active":
                # Oracle population changed. Ask the runtime again because this is
                # a genuine state transition, not a retry of an identical state.
                continue

            return FirstLogicalRobotRun(
                mission_id, tuple(steps), tuple(robot_runs), tuple(acquired_ids),
                "quiescent", True, self.runtime.state(mission_id),
                {"engine": "first_logical_robot_v0", "build": 16, "canonical_spec_modified": False},
            )

        return FirstLogicalRobotRun(
            mission_id, tuple(steps), tuple(robot_runs), tuple(acquired_ids),
            "max_cycles", True, self.runtime.state(mission_id),
            {
                "engine": "first_logical_robot_v0", "build": 16,
                "bounded_runtime": True, "busy_loop_prevented": True,
                "canonical_spec_modified": False,
            },
        )


def _problem_frame_from_spec(spec: Mapping[str, Any]) -> SemanticProblemFrame:
    problem = spec.get("problem", {})
    mission_id = str(problem.get("mission_id", "")).strip()
    if not mission_id:
        raise FirstLogicalRobotError("robot spec problem requires mission_id")
    queries = tuple(
        ProblemQuery(
            str(item["query_id"]), str(item["subject"]), str(item["predicate"]),
            tuple(str(value) for value in item.get("candidate_values", ())),
            str(item.get("original_text", "")),
        )
        for item in problem.get("queries", ())
    )
    claims = tuple(
        SemanticClaim(
            str(item["subject"]), str(item["predicate"]), str(item["value"]),
            str(item["source_id"]), float(item.get("confidence", 0.75)),
            bool(item.get("polarity", True)), str(item.get("original_text", "")),
        )
        for item in problem.get("claims", ())
    )
    rules = tuple(
        SemanticRule(
            str(item["rule_id"]),
            SemanticAtom(str(item["antecedent"]["subject"]), str(item["antecedent"]["predicate"]), str(item["antecedent"]["value"])),
            SemanticAtom(str(item["consequent"]["subject"]), str(item["consequent"]["predicate"]), str(item["consequent"]["value"])),
            str(item.get("kind", "implies")), str(item.get("relation_class", "logical")),
            float(item.get("confidence", 1.0)), str(item.get("source_id", "spec")),
            str(item.get("original_text", "")),
        )
        for item in problem.get("rules", ())
    )
    ontology_spec = problem.get("ontology", {})
    ontology = OntologyMap(
        subjects=dict(ontology_spec.get("subjects", {})),
        predicates=dict(ontology_spec.get("predicates", {})),
        values=dict(ontology_spec.get("values", {})),
        ontology_id=str(ontology_spec.get("ontology_id", "identity")),
    )
    return SemanticProblemFrame(
        mission_id=mission_id,
        raw_text=str(problem.get("raw_text", "")),
        queries=queries,
        claims=claims,
        rules=rules,
        ontology=ontology,
        unresolved=tuple(str(value) for value in problem.get("unresolved", ())),
        analyzer_id=str(problem.get("analyzer_id", "build16-mvp-spec")),
        provenance={"build16_spec": True, "semantic_invention": False},
    )


def challenge_suite_from_spec(
    runtime: SuperintelligenceRuntime,
    mission_id: str,
    spec: Mapping[str, Any],
) -> OracleChallengeSuite:
    compilation = runtime.compilation(mission_id)
    population_ids = extract_problem_rule_population(compilation).oracle_ids
    challenge = spec.get("challenge", {})
    cases = tuple(
        challenge_case_from_problem(
            compilation,
            population_oracle_ids=population_ids,
            expected_assignments={str(k): str(v) for k, v in item.get("expected_assignments", {}).items()},
            case_id=str(item["case_id"]),
            role=str(item.get("role", "selection")),
            provenance={"build16_spec_case": True},
        )
        for item in challenge.get("cases", ())
    )
    if not cases:
        raise FirstLogicalRobotError("robot spec challenge requires at least one case")
    return OracleChallengeSuite(str(challenge.get("suite_id", f"build16:{mission_id}")), cases)


def failure_observations_from_spec(spec: Mapping[str, Any]) -> tuple[OracleFailureObservation, ...]:
    return tuple(
        OracleFailureObservation(
            observation_id=str(item["observation_id"]),
            kind=str(item["kind"]),
            query_ids=tuple(str(value) for value in item.get("query_ids", ())),
            dimension_ids=tuple(str(value) for value in item.get("dimension_ids", ())),
            severity=float(item.get("severity", 1.0)),
            description=str(item.get("description", "")),
            provenance={"build16_spec_failure": True},
        )
        for item in spec.get("failure_observations", ())
    )


def run_robot_spec(
    spec: Mapping[str, Any],
    *,
    store_path: str | Path,
    tool: Any | None = None,
    max_runtime_cycles: int = 6,
) -> FirstLogicalRobotRun:
    from .intelligence_store import CsvIntelligenceStore

    store = CsvIntelligenceStore(store_path)
    runtime = SuperintelligenceRuntime(store)
    frame = _problem_frame_from_spec(spec)
    mission_file = store.mission_dir(frame.mission_id) / "mission.csv"
    if not mission_file.exists():
        runtime.create_mission(frame)
    challenge = challenge_suite_from_spec(runtime, frame.mission_id, spec)
    robot = FirstLogicalRobot(
        runtime,
        (tool or PublicWebLogicalRobotTool(),),
        config=FirstLogicalRobotConfig(max_runtime_cycles=max_runtime_cycles),
    )
    return robot.run(
        frame.mission_id,
        challenge,
        failure_observations=failure_observations_from_spec(spec),
    )


def main(argv: Sequence[str] | None = None) -> int:
    import argparse

    parser = argparse.ArgumentParser(description="Run the BUILD 16 first logical robot MVP")
    parser.add_argument("spec", help="JSON mission/challenge specification")
    parser.add_argument("--store", default="./intelligence_store", help="human-readable intelligence store directory")
    parser.add_argument("--max-cycles", type=int, default=6, help="maximum runtime cycles in this invocation")
    args = parser.parse_args(argv)

    spec = json.loads(Path(args.spec).read_text(encoding="utf-8"))
    result = run_robot_spec(spec, store_path=args.store, max_runtime_cycles=args.max_cycles)
    print(json.dumps({
        "mission_id": result.mission_id,
        "status": result.status,
        "resumable": result.resumable,
        "runtime_steps": len(result.steps),
        "robot_runs": len(result.robot_runs),
        "acquired_evidence_ids": result.acquired_evidence_ids,
        "oracle_stack_identity": result.final_state.oracle_stack_identity,
        "oracle_count": result.final_state.oracle_count,
        "evidence_count": result.final_state.evidence_count,
        "store_directory": result.final_state.directory,
    }, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
