from __future__ import annotations

from dataclasses import asdict, dataclass
from typing import Any, Mapping, Sequence

from .models import BaseBundle
from .oracle_space import OracleSpace
from .oracles import DistributionOracle, ExactOracle, MaskOracle, OracleStack
from .semantic import EvidenceOracle, OneHotOracle


class OracleSpaceTransportError(ValueError):
    """Raised when an oracle-space payload cannot be transported without invention."""


def _json_value(value: Any) -> Any:
    if isinstance(value, Mapping):
        return {str(key): _json_value(item) for key, item in value.items()}
    if isinstance(value, (tuple, list)):
        return [_json_value(item) for item in value]
    if value is None or isinstance(value, (str, int, float, bool)):
        return value
    return str(value)


def _encode_oracle(oracle: Any) -> Mapping[str, Any]:
    if isinstance(oracle, ExactOracle):
        return {
            "type": "exact",
            "oracle_id": oracle.oracle_id,
            "target": dict(oracle.target),
            "weight": oracle.weight,
        }
    if isinstance(oracle, MaskOracle):
        return {
            "type": "mask",
            "oracle_id": oracle.oracle_id,
            "mask": dict(oracle.mask),
            "weight": oracle.weight,
        }
    if isinstance(oracle, EvidenceOracle):
        return {
            "type": "evidence",
            "oracle_id": oracle.oracle_id,
            "dimension_id": oracle.dimension_id,
            "expected_value": oracle.expected_value,
            "confidence": oracle.confidence,
            "source_id": oracle.source_id,
            "claim_text": oracle.claim_text,
            "strength": oracle.strength,
        }
    if isinstance(oracle, OneHotOracle):
        return {
            "type": "one_hot",
            "oracle_id": oracle.oracle_id,
            "dimension_ids": list(oracle.dimension_ids),
        }
    if isinstance(oracle, DistributionOracle):
        return {
            "type": "distribution",
            "oracle_id": oracle.oracle_id,
            "dimension_ids": list(oracle.dimension_ids),
            "power": oracle.power,
            "probabilities": [
                {"state": list(state), "probability": probability}
                for state, probability in oracle.probabilities.items()
            ],
        }
    raise OracleSpaceTransportError(
        f"oracle {type(oracle).__name__!r} has no registered portable codec; "
        "provide an explicit domain transport rather than silently weakening it"
    )


def _decode_oracle(payload: Mapping[str, Any]) -> Any:
    kind = str(payload.get("type", ""))
    oracle_id = str(payload.get("oracle_id", ""))
    if kind == "exact":
        return ExactOracle(oracle_id, dict(payload.get("target", {})), weight=float(payload.get("weight", 1.0)))
    if kind == "mask":
        return MaskOracle(oracle_id, dict(payload.get("mask", {})), weight=float(payload.get("weight", 1.0)))
    if kind == "evidence":
        return EvidenceOracle(
            oracle_id=oracle_id,
            dimension_id=str(payload["dimension_id"]),
            expected_value=int(payload["expected_value"]),
            confidence=float(payload["confidence"]),
            source_id=str(payload["source_id"]),
            claim_text=str(payload.get("claim_text", "")),
            strength=float(payload.get("strength", 1.0)),
        )
    if kind == "one_hot":
        return OneHotOracle(oracle_id, tuple(str(value) for value in payload.get("dimension_ids", ())))
    if kind == "distribution":
        probabilities = {
            tuple(int(value) for value in row["state"]): float(row["probability"])
            for row in payload.get("probabilities", ())
        }
        return DistributionOracle(
            oracle_id=oracle_id,
            dimension_ids=tuple(str(value) for value in payload.get("dimension_ids", ())),
            probabilities=probabilities,
            power=float(payload.get("power", 1.0)),
        )
    raise OracleSpaceTransportError(f"unsupported oracle codec type {kind!r}")


def export_oracle_space(space: OracleSpace) -> Mapping[str, Any]:
    """Export a JSON-safe envelope of the same oracle manifestation."""
    return {
        "schema": "qcds-oracle-space-transfer-v1",
        "space_id": space.space_id,
        "universe_id": space.universe_id,
        "source_host_kind": space.host_kind,
        "bundle": {
            "bundle_id": space.bundle.bundle_id,
            "dimension_ids": list(space.bundle.dimension_ids),
            "values": list(space.bundle.values),
            "provenance": _json_value(space.bundle.provenance),
            "semantic_domain": _json_value(space.bundle.semantic_domain),
        },
        "oracle_stack": {
            "stack_id": space.oracle_stack.stack_id,
            "version": space.oracle_stack.version,
            "oracles": [_encode_oracle(oracle) for oracle in space.oracle_stack.oracles],
        },
        "provenance": _json_value(space.provenance),
        "syntract_ids": list(space.syntract_ids),
        "truth_promoted_by_transfer": False,
        "qcds_semantics_changed_by_transfer": False,
    }


def import_oracle_space(payload: Mapping[str, Any], *, host_kind: str = "external") -> OracleSpace:
    """Reconstruct an oracle space without inventing or dropping oracle semantics."""
    if payload.get("schema") != "qcds-oracle-space-transfer-v1":
        raise OracleSpaceTransportError("unsupported oracle-space transfer schema")
    bundle_payload = payload.get("bundle")
    stack_payload = payload.get("oracle_stack")
    if not isinstance(bundle_payload, Mapping) or not isinstance(stack_payload, Mapping):
        raise OracleSpaceTransportError("transfer payload requires bundle and oracle_stack objects")

    bundle = BaseBundle(
        bundle_id=str(bundle_payload["bundle_id"]),
        dimension_ids=tuple(str(value) for value in bundle_payload.get("dimension_ids", ())),
        values=tuple(bundle_payload.get("values", ())),
        provenance=dict(bundle_payload.get("provenance", {})),
        semantic_domain=dict(bundle_payload.get("semantic_domain", {})),
    )
    raw_oracles = stack_payload.get("oracles", ())
    if not isinstance(raw_oracles, Sequence):
        raise OracleSpaceTransportError("oracle_stack.oracles must be a sequence")
    oracles = tuple(_decode_oracle(row) for row in raw_oracles if isinstance(row, Mapping))
    if len(oracles) != len(raw_oracles):
        raise OracleSpaceTransportError("every transported oracle must be an object")
    stack = OracleStack(
        stack_id=str(stack_payload["stack_id"]),
        version=str(stack_payload["version"]),
        oracles=oracles,
    )
    return OracleSpace(
        space_id=str(payload["space_id"]),
        universe_id=str(payload["universe_id"]),
        bundle=bundle,
        oracle_stack=stack,
        host_kind=host_kind,
        provenance={
            **dict(payload.get("provenance", {})),
            "transport_schema": "qcds-oracle-space-transfer-v1",
            "transport_source_host_kind": str(payload.get("source_host_kind", "external")),
            "truth_promoted_by_transfer": False,
            "qcds_semantics_changed_by_transfer": False,
        },
        syntract_ids=tuple(str(value) for value in payload.get("syntract_ids", ())),
    )


__all__ = [
    "OracleSpaceTransportError",
    "export_oracle_space",
    "import_oracle_space",
]
