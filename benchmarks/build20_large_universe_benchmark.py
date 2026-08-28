from __future__ import annotations

import hashlib
import json
import os
import platform
import subprocess
import sys
import tempfile
import time
from pathlib import Path

from qcds_fabric.logical_transform import LogicalSpaceResolver
from qcds_fabric.logical_universe import CsvLogicalUniverseStore
from qcds_fabric.logical_universe_runner import LogicalUniverseMvpRunner


TOTAL_BINDINGS = 50_000
HUMANS = 40_000
CONTROLS = TOTAL_BINDINGS - HUMANS
REALITY_MIRROR = 1_000
UNIVERSE_ID = "benchmark-lawbook-50k"
AUTHORITY = "benchmark-authority"


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def git_sha() -> str:
    env_sha = os.environ.get("GITHUB_SHA", "").strip()
    if env_sha:
        return env_sha
    try:
        return subprocess.check_output(
            ["git", "rev-parse", "HEAD"], text=True, stderr=subprocess.DEVNULL
        ).strip()
    except Exception:
        return "unknown"


def cpu_model() -> str:
    try:
        for line in Path("/proc/cpuinfo").read_text(encoding="utf-8").splitlines():
            if line.lower().startswith("model name"):
                return line.split(":", 1)[1].strip()
    except OSError:
        pass
    return platform.processor() or "unknown"


def universe_spec() -> dict:
    return {
        "universe_id": UNIVERSE_ID,
        "mode": "declared",
        "description": "Synthetic 50k BUILD 20 benchmark universe",
        "authority": AUTHORITY,
        "provenance": {
            "benchmark": "build20_large_universe",
            "synthetic": True,
            "external_truth_claim": False,
        },
    }


def seed_bindings() -> list[dict]:
    rows: list[dict] = []
    for index in range(HUMANS):
        rows.append(
            {
                "binding_id": f"human-{index:05d}",
                "terms": [f"person_{index:05d}", "human"],
                "source_id": "benchmark:synthetic",
                "confidence": 1.0,
                "provenance": {"synthetic": True, "class": "human"},
            }
        )
    for index in range(CONTROLS):
        rows.append(
            {
                "binding_id": f"dog-{index:05d}",
                "terms": [f"dog_{index:05d}", "dog"],
                "source_id": "benchmark:synthetic",
                "confidence": 1.0,
                "provenance": {"synthetic": True, "class": "control"},
            }
        )
    return rows


def rule_one() -> dict:
    return {
        "candidate_id": "human-legal-v1",
        "rule_id": "human-legal",
        "match_terms": ["human"],
        "emit_terms": ["legal_person"],
        "source_id": "declared:benchmark-authority",
        "confidence": 1.0,
        "promote": True,
        "approval_source": AUTHORITY,
        "override_blast": True,
        "provenance": {"synthetic": True, "benchmark": "build20_large_universe"},
    }


def rule_two() -> dict:
    return {
        "candidate_id": "legal-protected-v1",
        "rule_id": "legal-protected",
        "match_terms": ["legal_person"],
        "emit_terms": ["protected_subject"],
        "source_id": "declared:benchmark-authority",
        "confidence": 1.0,
        "promote": True,
        "approval_source": AUTHORITY,
        "override_blast": True,
        "provenance": {"synthetic": True, "benchmark": "build20_large_universe"},
    }


def timed(callable_):
    started = time.perf_counter()
    value = callable_()
    return value, time.perf_counter() - started


def main() -> int:
    total_started = time.perf_counter()
    with tempfile.TemporaryDirectory(prefix="qcds-build20-benchmark-") as tmp:
        root = Path(tmp)
        runner = LogicalUniverseMvpRunner(root)
        seeds = seed_bindings()

        seed_result, seed_seconds = timed(
            lambda: runner.run(
                {
                    "universe": universe_spec(),
                    "seed_bindings": seeds,
                    "rules": [],
                    "queries": [],
                }
            )
        )

        store = CsvLogicalUniverseStore(root)
        law_space = store.space(UNIVERSE_ID)
        base_path = law_space.path
        hash_after_seed = sha256(base_path)
        base_size_bytes = base_path.stat().st_size

        first_rule_result, rule_one_seconds = timed(
            lambda: LogicalUniverseMvpRunner(root).run(
                {
                    "universe": universe_spec(),
                    "seed_bindings": [],
                    "rules": [rule_one()],
                    "queries": [],
                }
            )
        )
        second_rule_result, rule_two_seconds = timed(
            lambda: LogicalUniverseMvpRunner(root).run(
                {
                    "universe": universe_spec(),
                    "seed_bindings": [],
                    "rules": [rule_two()],
                    "queries": [],
                }
            )
        )

        hash_after_rules = sha256(base_path)

        def resolve_counts() -> dict[str, int]:
            fresh_store = CsvLogicalUniverseStore(root)
            resolver = LogicalSpaceResolver(
                fresh_store.space(UNIVERSE_ID), fresh_store.rules(UNIVERSE_ID)
            )
            counts = {
                "human": 0,
                "dog": 0,
                "legal_person": 0,
                "protected_subject": 0,
                "dog_with_protected_subject": 0,
            }
            for binding in fresh_store.space(UNIVERSE_ID).bindings():
                resolved = resolver.resolve_binding(binding)
                terms = set(resolved.resolved_terms)
                if "human" in terms:
                    counts["human"] += 1
                if "dog" in terms:
                    counts["dog"] += 1
                if "legal person" in terms:
                    counts["legal_person"] += 1
                if "protected subject" in terms:
                    counts["protected_subject"] += 1
                    if "dog" in terms:
                        counts["dog_with_protected_subject"] += 1
            return counts

        counts, first_resolve_seconds = timed(resolve_counts)
        hash_after_resolve = sha256(base_path)

        restart_result, restart_ingest_seconds = timed(
            lambda: LogicalUniverseMvpRunner(root).run(
                {
                    "universe": universe_spec(),
                    "seed_bindings": seeds,
                    "rules": [rule_one(), rule_two()],
                    "queries": [],
                }
            )
        )
        restart_counts, restart_resolve_seconds = timed(resolve_counts)
        hash_after_restart = sha256(base_path)

        reality_spec = {
            "universe": {
                "universe_id": "reality",
                "mode": "observed",
                "description": "Isolation control for BUILD 20 benchmark",
            },
            "seed_bindings": [
                {
                    "binding_id": f"reality-human-{index:04d}",
                    "terms": [f"reality_person_{index:04d}", "human"],
                    "source_id": "benchmark:synthetic",
                    "confidence": 1.0,
                    "provenance": {"synthetic": True, "isolation_control": True},
                }
                for index in range(REALITY_MIRROR)
            ],
            "rules": [],
            "queries": [],
        }
        _, reality_seed_seconds = timed(lambda: LogicalUniverseMvpRunner(root).run(reality_spec))

        reality_store = CsvLogicalUniverseStore(root)
        reality_resolver = LogicalSpaceResolver(
            reality_store.space("reality"), reality_store.rules("reality")
        )
        reality_protected = 0
        for binding in reality_store.space("reality").bindings():
            if "protected subject" in set(reality_resolver.resolve_binding(binding).resolved_terms):
                reality_protected += 1

        rule1 = first_rule_result.rule_outcomes[0]
        rule2 = second_rule_result.rule_outcomes[0]

        assertions = {
            "seed_count_exact": seed_result.base_binding_count == TOTAL_BINDINGS,
            "human_count_exact": counts["human"] == HUMANS,
            "control_count_exact": counts["dog"] == CONTROLS,
            "rule1_global_projection_exact": counts["legal_person"] == HUMANS,
            "rule2_chained_projection_exact": counts["protected_subject"] == HUMANS,
            "controls_not_affected": counts["dog_with_protected_subject"] == 0,
            "base_hash_unchanged_after_rules": hash_after_seed == hash_after_rules,
            "base_hash_unchanged_after_resolution": hash_after_seed == hash_after_resolve,
            "restart_added_no_duplicate_bindings": restart_result.added_bindings == 0,
            "restart_reused_both_rules": all(
                outcome.get("status") == "already_active"
                for outcome in restart_result.rule_outcomes
            ),
            "restart_counts_identical": restart_counts == counts,
            "base_hash_unchanged_after_restart": hash_after_seed == hash_after_restart,
            "reality_isolated": reality_protected == 0,
            "both_rules_were_quarantined_before_override": (
                "changed_fraction_exceeds_policy" in rule1.get("drift_reasons", [])
                and "changed_bindings_exceed_policy" in rule1.get("drift_reasons", [])
                and "changed_fraction_exceeds_policy" in rule2.get("drift_reasons", [])
                and "changed_bindings_exceed_policy" in rule2.get("drift_reasons", [])
            ),
        }
        passed = all(assertions.values())

        result = {
            "benchmark": "BUILD 20 Large Logical Universe Overlay",
            "status": "PASS" if passed else "FAIL",
            "git_sha": git_sha(),
            "package": "qcds-fabric 1.11.0",
            "environment": {
                "python": sys.version.split()[0],
                "platform": platform.platform(),
                "machine": platform.machine(),
                "cpu_model": cpu_model(),
                "logical_cpu_count": os.cpu_count(),
                "runner_os": os.environ.get("RUNNER_OS", "unknown"),
                "runner_arch": os.environ.get("RUNNER_ARCH", "unknown"),
            },
            "workload": {
                "base_bindings": TOTAL_BINDINGS,
                "human_bindings": HUMANS,
                "control_bindings": CONTROLS,
                "reality_isolation_bindings": REALITY_MIRROR,
                "active_rules": 2,
                "rule_chain": [
                    "human => legal_person",
                    "legal_person => protected_subject",
                ],
            },
            "governance": {
                "rule1_changed_bindings": rule1.get("changed_bindings"),
                "rule1_changed_fraction": rule1.get("changed_fraction"),
                "rule1_drift_reasons": rule1.get("drift_reasons"),
                "rule2_changed_bindings": rule2.get("changed_bindings"),
                "rule2_changed_fraction": rule2.get("changed_fraction"),
                "rule2_drift_reasons": rule2.get("drift_reasons"),
                "promotion_mode": "declared authority + explicit blast-radius override",
            },
            "resolved_counts": counts,
            "restart_counts": restart_counts,
            "reality_protected_subject_count": reality_protected,
            "storage": {
                "base_logical_space_bytes": base_size_bytes,
                "sha256_after_seed": hash_after_seed,
                "sha256_after_rules": hash_after_rules,
                "sha256_after_resolve": hash_after_resolve,
                "sha256_after_restart": hash_after_restart,
                "derived_logic_materialized_into_base_space": False,
            },
            "timings_seconds": {
                "seed_50000": round(seed_seconds, 6),
                "propose_promote_rule1": round(rule_one_seconds, 6),
                "propose_promote_rule2": round(rule_two_seconds, 6),
                "resolve_50000_first_pass": round(first_resolve_seconds, 6),
                "restart_reingest_dedupe": round(restart_ingest_seconds, 6),
                "resolve_50000_after_restart": round(restart_resolve_seconds, 6),
                "reality_seed_1000": round(reality_seed_seconds, 6),
                "total": round(time.perf_counter() - total_started, 6),
            },
            "assertions": assertions,
            "claim_boundary": {
                "semantic_test": True,
                "classical_python_benchmark": True,
                "quantum_advantage_claim": False,
                "asi_agi_claim": False,
                "instantaneous_scaling_claim": False,
            },
        }

        print(json.dumps(result, indent=2, sort_keys=True))
        return 0 if passed else 1


if __name__ == "__main__":
    raise SystemExit(main())
