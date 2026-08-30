from qcds_fabric.robots.legal.sweden_housing.question_ingress import translate_legal_question


def test_forfeiture_question_forms_issue_scope_without_answering_it() -> None:
    case = {
        "case_id": "question-ingress",
        "question": "Can the tenancy be forfeited because of this unauthorized second-hand sublet?",
        "facts": {"second_hand_let": True},
    }

    translated, ingress = translate_legal_question(case)

    assert ingress.recognized is True
    assert ingress.logical_scope_terms == ("issue:forfeiture",)
    assert ingress.derived_fact_flags == {"issue_forfeiture": True}
    assert translated["facts"]["issue_forfeiture"] is True
    assert translated["facts"]["second_hand_let"] is True
    assert translated["question_scope_terms"] == ["issue:forfeiture"]
    assert ingress.as_dict()["question_creates_truth"] is False
    assert ingress.as_dict()["oracle_role"] == "filter the formed Logical Space"


def test_unknown_question_is_preserved_without_invented_scope() -> None:
    case = {
        "case_id": "unknown-question",
        "question": "What hidden cosmic property decides this tenancy?",
        "facts": {"residential_use": True},
    }

    translated, ingress = translate_legal_question(case)

    assert ingress.recognized is False
    assert ingress.logical_scope_terms == ()
    assert ingress.derived_fact_flags == {}
    assert ingress.unresolved_reason
    assert translated["question_scope_terms"] == []
    assert translated["facts"] == {"residential_use": True}


def test_question_never_overwrites_explicit_case_fact() -> None:
    case = {
        "case_id": "explicit-scope",
        "question": "Can the tenancy be forfeited?",
        "facts": {"issue_forfeiture": False},
    }

    translated, ingress = translate_legal_question(case)

    assert ingress.recognized is True
    assert ingress.logical_scope_terms == ("issue:forfeiture",)
    assert ingress.derived_fact_flags == {}
    assert translated["facts"]["issue_forfeiture"] is False
