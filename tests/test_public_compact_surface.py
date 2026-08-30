from qcds_fabric.living_robot_public_compact import living_robot_public_compact_html


def test_public_surface_is_compact_question_first_and_has_one_current_build_label():
    html = living_robot_public_compact_html(static_mode=True)

    assert '<body class="publicCompact publicViewQcds publicLegalAsk">' in html
    assert '<span class="publicBuildMark">BUILD 47</span>' in html
    assert 'BUILD 35 · EPHEMERAL LOGICAL SPACE SANDBOX' not in html
    assert 'BUILD 34 · CUSTOM LOGICAL SPACE' not in html

    # Main navigation is intentionally small and switches real views.
    assert 'onclick="publicSelectView(\'qcds\')">TRY QCDS</button>' in html
    assert 'onclick="publicSelectView(\'legal\')">LEGAL ROBOT</button>' in html
    assert 'onclick="publicSelectView(\'advanced\')">ADVANCED</button>' in html
    assert '>LEGAL DETAILS</button>' not in html
    assert '>ALL CASES</button>' not in html
    assert "const PUBLIC_VIEW_CLASSES=['publicViewQcds','publicViewLegal','publicViewAdvanced']" in html
    assert "function publicGo(" not in html

    # Legal Robot is question-first. Cases are examples, not the architecture.
    assert 'LEGAL LOGICAL ROBOT · QUESTION INGRESS' in html
    assert 'Ask one question. Let the translator form the logical problem.' in html
    assert 'id="publicLegalQuestionText"' in html
    assert 'id="publicLegalContext"' in html
    assert 'onclick="publicRunLegalQuestion()">RUN QUESTION →</button>' in html
    assert 'data-legal-mode="ask"' in html
    assert 'data-legal-mode="examples"' in html
    assert 'data-legal-mode="details"' in html
    assert 'question + material/facts → translator → Logical Space → oracle filters / emulated oracle filters' in html

    # Ask view suppresses the old wall of rule/praxis questions by default.
    assert 'body.publicCompact.publicLegalAsk #swedish-legal-robot .legalExplain' in html
    assert 'body.publicCompact.publicLegalAsk #swedish-legal-robot .legalCaseGrid' in html
    assert 'body.publicCompact.publicLegalAsk:not(.publicShowRunDetails) #swedish-legal-robot .legalResult .legalStage' in html

    # Historical/advanced surfaces remain available but only participate in layout in Advanced.
    assert 'body.publicCompact:not(.publicViewAdvanced)>.hero' in html
    assert 'body.publicCompact:not(.publicViewAdvanced)>.layout' in html
    assert 'body.publicCompact:not(.publicViewAdvanced)>.learningMoment' in html
    assert 'body.publicCompact:not(.publicViewAdvanced)>.understandBuild' in html
    assert 'body.publicCompact:not(.publicViewAdvanced)>.domainLab' in html
    assert 'body.publicCompact:not(.publicViewAdvanced)>.sessionSandbox' in html
    assert 'body.publicCompact:not(.publicViewQcds) #try-logical-robot' in html
    assert 'body.publicCompact:not(.publicViewLegal) #public-legal-question' in html
    assert 'body.publicCompact:not(.publicViewLegal) #swedish-legal-robot' in html


def test_public_surface_exposes_oracle_and_quantum_boundary_without_changing_qcds():
    html = living_robot_public_compact_html(static_mode=True)

    assert 'ONE QCDS · QUESTION → LOGICAL SPACE → ORACLE FILTERS' in html
    assert 'Browser</strong> · resource-bounded emulation' in html
    assert 'MacBook</strong> · larger local emulation' in html
    assert 'Central</strong> · high-capacity emulation' in html
    assert 'Quantum Full Space</strong> · no semantic projection' in html
    assert 'Swarm</strong> · QCDS uncertainty → oracle re-entry' in html
    assert 'Central fabric</strong> · parallel / sequential / hybrid' in html

    # The canonical four-phase legal QCDS presentation is still present.
    assert '1 · CONDITION FORMATION' in html
    assert '2 · CONDITIONAL EVOLUTION' in html
    assert '3 · 2^N INFERENCE' in html
    assert '4 · TRUTH ALIGNMENT' in html
