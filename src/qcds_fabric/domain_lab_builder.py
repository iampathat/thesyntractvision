from __future__ import annotations

import re
from pathlib import Path
from typing import Any, Mapping

from .logical_space import LogicalBinding
from .logical_universe import CsvLogicalUniverseStore, LogicalUniverse


_DOMAIN_ID = re.compile(r"^[a-z0-9][a-z0-9-]{0,63}$")
_ALLOWED_MODES = {"simulation", "declared"}


class CustomDomainLabError(ValueError):
    pass


def _required_text(payload: Mapping[str, Any], key: str, *, maximum: int = 4000) -> str:
    value = str(payload.get(key, "")).strip()
    if not value:
        raise CustomDomainLabError(f"{key} is required")
    if len(value) > maximum:
        raise CustomDomainLabError(f"{key} is too long")
    return value


def normalize_custom_domain_pack(payload: Mapping[str, Any]) -> dict[str, Any]:
    # Validate a user-authored Logical Space pack without granting it truth authority.
    domain_id = _required_text(payload, "domain_id", maximum=64).lower()
    if not _DOMAIN_ID.fullmatch(domain_id):
        raise CustomDomainLabError("domain_id must use lowercase letters, numbers and hyphens")

    starter_rules = payload.get("starter_rules", [])
    if not isinstance(starter_rules, list):
        raise CustomDomainLabError("starter_rules must be a list")
    if starter_rules:
        raise CustomDomainLabError("custom Logical Spaces must start with zero supplied solution rules")

    boundary = payload.get("truth_boundary", {})
    if boundary is not None and not isinstance(boundary, Mapping):
        raise CustomDomainLabError("truth_boundary must be an object")
    boundary = dict(boundary or {})
    for forbidden in ("external_truth_claim", "solution_rule_supplied", "starting_lab_modifies_reality"):
        if bool(boundary.get(forbidden, False)):
            raise CustomDomainLabError(f"{forbidden} cannot be true in a custom starter space")

    universe_mode = str(payload.get("universe_mode", "simulation")).strip().lower()
    if universe_mode not in _ALLOWED_MODES:
        raise CustomDomainLabError("universe_mode must be simulation or declared")

    raw_observations = payload.get("observations")
    if not isinstance(raw_observations, list) or not raw_observations:
        raise CustomDomainLabError("at least one starter observation is required")
    if len(raw_observations) > 500:
        raise CustomDomainLabError("maximum 500 starter observations")

    observations: list[dict[str, Any]] = []
    seen_ids: set[str] = set()
    for index, raw in enumerate(raw_observations, start=1):
        if not isinstance(raw, Mapping):
            raise CustomDomainLabError(f"observation {index} must be an object")

        binding_id = str(raw.get("binding_id") or f"{domain_id}-{index:03d}").strip()
        if not binding_id or len(binding_id) > 160:
            raise CustomDomainLabError(f"observation {index} has an invalid binding_id")
        if binding_id in seen_ids:
            raise CustomDomainLabError(f"duplicate binding_id: {binding_id}")
        seen_ids.add(binding_id)

        raw_terms = raw.get("terms")
        if not isinstance(raw_terms, (list, tuple)):
            raise CustomDomainLabError(f"observation {index} terms must be a list")
        terms = tuple(str(term).strip() for term in raw_terms if str(term).strip())
        if len(terms) < 2:
            raise CustomDomainLabError(f"observation {index} needs at least two terms")
        if len(terms) > 64 or any(len(term) > 240 for term in terms):
            raise CustomDomainLabError(f"observation {index} exceeds term bounds")

        source_id = str(raw.get("source_id") or f"user:{domain_id}:{index:03d}").strip()
        if not source_id or len(source_id) > 300:
            raise CustomDomainLabError(f"observation {index} has an invalid source_id")

        try:
            confidence = float(raw.get("confidence", 1.0))
        except (TypeError, ValueError) as exc:
            raise CustomDomainLabError(f"observation {index} confidence must be numeric") from exc
        if confidence < 0.0 or confidence > 1.0:
            raise CustomDomainLabError(f"observation {index} confidence must be between 0 and 1")

        observations.append(
            {
                "binding_id": binding_id,
                "terms": terms,
                "source_id": source_id,
                "confidence": confidence,
            }
        )

    return {
        "domain_id": domain_id,
        "universe_id": f"domain-lab-custom-{domain_id}",
        "title": _required_text(payload, "title", maximum=120),
        "tagline": str(payload.get("tagline") or "Custom open Logical Space.").strip()[:240],
        "audience": str(payload.get("audience") or "Domain experts").strip()[:240],
        "universe_mode": universe_mode,
        "description": _required_text(payload, "description"),
        "challenge": _required_text(payload, "challenge"),
        "learning_target": _required_text(payload, "learning_target"),
        "explore_prompt": _required_text(payload, "explore_prompt"),
        "observations": observations,
        "starter_rules": [],
        "truth_boundary": {
            "external_truth_claim": False,
            "solution_rule_supplied": False,
            "starting_lab_modifies_reality": False,
        },
    }


class CustomDomainLabService:
    # BUILD 34: start user-authored Logical Spaces in a bounded custom namespace.

    def __init__(self, root: str | Path = "./intelligence_store") -> None:
        self.root = Path(root)
        self.root.mkdir(parents=True, exist_ok=True)
        self.universes = CsvLogicalUniverseStore(self.root)

    def start(self, payload: Mapping[str, Any]) -> dict[str, Any]:
        pack = normalize_custom_domain_pack(payload)
        universe_id = str(pack["universe_id"])
        existing = self.universes.get(universe_id)
        created = False
        if existing is None:
            self.universes.create(
                LogicalUniverse(
                    universe_id=universe_id,
                    mode=str(pack["universe_mode"]),
                    description=str(pack["description"]),
                    authority="",
                    provenance={
                        "domain_lab": pack["domain_id"],
                        "custom_pack": True,
                        "starter_pack": True,
                        "external_truth_claim": False,
                        "solution_rule_supplied": False,
                    },
                )
            )
            created = True

        space = self.universes.space(universe_id)
        added = space.append(
            [
                LogicalBinding(
                    str(item["binding_id"]),
                    tuple(item["terms"]),
                    str(item["source_id"]),
                    float(item["confidence"]),
                    provenance={
                        "domain_lab": pack["domain_id"],
                        "custom_pack": True,
                        "starter_observation": True,
                        "external_truth_claim": False,
                    },
                )
                for item in pack["observations"]
            ]
        )

        return {
            "domain_id": pack["domain_id"],
            "universe_id": universe_id,
            "universe_mode": pack["universe_mode"],
            "created": created,
            "custom": True,
            "added_observations": added,
            "base_binding_count": len(space.bindings()),
            "active_rule_count": len(self.universes.rules(universe_id).rules(active_only=True)),
            "challenge": pack["challenge"],
            "learning_target": pack["learning_target"],
            "truth_effect_on_reality": 0,
            "solution_rule_supplied": False,
        }
