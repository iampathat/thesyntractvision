from __future__ import annotations

import re
from dataclasses import dataclass
from typing import Any, Mapping


@dataclass(frozen=True)
class LegalQuestionIngress:
    """Question-to-scope translation before legal QCDS Condition Formation.

    The translator is not an answer engine. It may only express what the human is
    asking about as issue/scope terms. Those terms participate in formation of
    the legal Logical Space; statutory/praxis/evidence oracles then filter that
    space and QCDS performs the four canonical phases.
    """

    question: str
    translator_id: str
    recognized: bool
    derived_fact_flags: Mapping[str, bool]
    logical_scope_terms: tuple[str, ...]
    unresolved_reason: str | None = None

    def as_dict(self) -> Mapping[str, object]:
        return {
            "question": self.question,
            "translator_id": self.translator_id,
            "recognized": self.recognized,
            "derived_fact_flags": dict(self.derived_fact_flags),
            "logical_scope_terms": list(self.logical_scope_terms),
            "unresolved_reason": self.unresolved_reason,
            "question_is_answer": False,
            "question_creates_truth": False,
            "translator_role": "form logical scope / select oracle-relevant issue terms",
            "oracle_role": "filter the formed Logical Space",
            "qcds_core_modified": False,
        }


_TRANSLATOR_ID = "swedish_housing_question_ingress_v1"


def _match(text: str, *patterns: str) -> bool:
    return any(re.search(pattern, text, flags=re.IGNORECASE) for pattern in patterns)


def translate_legal_question(case: Mapping[str, Any]) -> tuple[dict[str, Any], LegalQuestionIngress]:
    """Return a case copy whose issue flags may be derived from the question.

    Existing explicit facts are never overwritten. The mapping is deliberately
    conservative and bounded. If the question cannot be classified, the
    structured case remains executable but the ingress is marked unresolved.
    """

    translated = dict(case)
    raw_question = case.get("question", "")
    question = str(raw_question).strip() if raw_question is not None else ""
    facts_raw = case.get("facts", {})
    if not isinstance(facts_raw, Mapping):
        facts_raw = {}
    facts = dict(facts_raw)

    if not question:
        ingress = LegalQuestionIngress(
            question="",
            translator_id=_TRANSLATOR_ID,
            recognized=False,
            derived_fact_flags={},
            logical_scope_terms=(),
            unresolved_reason="no human question supplied; using explicit structured case scope",
        )
        translated["facts"] = facts
        return translated, ingress

    derived: dict[str, bool] = {}
    scope_terms: list[str] = []

    def issue(flag: str, term: str) -> None:
        if flag not in facts:
            facts[flag] = True
            derived[flag] = True
        if term not in scope_terms:
            scope_terms.append(term)

    if _match(question, r"förverk", r"forfeit", r"termination", r"terminate", r"uppsäg"):
        issue("issue_forfeiture", "issue:forfeiture")
    if _match(question, r"besittningsskydd", r"förläng", r"extension", r"renewal", r"renew"):
        issue("issue_extension", "issue:extension")
    if _match(question, r"överlåt", r"transfer"):
        issue("issue_transfer", "issue:transfer")
    if _match(question, r"lägenhetsbyte", r"bostadsbyte", r"apartment exchange", r"exchange"):
        issue("issue_exchange", "issue:exchange")
    if _match(question, r"hyresnivå", r"för hög hyra", r"återbetal", r"rent review", r"excess rent", r"repayment"):
        issue("issue_rent_review", "issue:rent_review")

    # Permission is a question-scope switch in the represented legal corpus, not
    # a factual claim that permission actually exists.
    if _match(question, r"tillstånd.*andra hand", r"andrahand.*tillstånd", r"permission.*sublet", r"permission.*second.hand"):
        if "sublet_permission_requested" not in facts:
            facts["sublet_permission_requested"] = True
            derived["sublet_permission_requested"] = True
        scope_terms.append("sublet:permission_requested")

    # Regime/scope questions need no issue flag; the dates and supplied case
    # facts form the regime space and the statutory oracles discriminate it.
    regime_question = _match(question, r"vilken lag", r"vilket regelverk", r"which law", r"which statute", r"governs", r"legal regime")
    if regime_question:
        scope_terms.append("query:legal_regime")

    recognized = bool(scope_terms)
    ingress = LegalQuestionIngress(
        question=question,
        translator_id=_TRANSLATOR_ID,
        recognized=recognized,
        derived_fact_flags=derived,
        logical_scope_terms=tuple(dict.fromkeys(scope_terms)),
        unresolved_reason=None if recognized else "question not classified by bounded legal translator; no issue scope was invented",
    )
    translated["facts"] = facts
    return translated, ingress


__all__ = ["LegalQuestionIngress", "translate_legal_question"]
