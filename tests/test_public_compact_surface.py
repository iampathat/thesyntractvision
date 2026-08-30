from qcds_fabric.living_robot_public_compact import living_robot_public_compact_html


def test_public_surface_is_compact_and_has_one_current_build_label():
    html = living_robot_public_compact_html(static_mode=True)

    assert '<body class="publicCompact">' in html
    assert '<span class="publicBuildMark">BUILD 45</span>' in html
    assert 'BUILD 35 · EPHEMERAL LOGICAL SPACE SANDBOX' not in html
    assert 'BUILD 34 · CUSTOM LOGICAL SPACE' not in html

    # The long historical surfaces remain available, but are folded by default.
    assert 'body.publicCompact:not(.publicAdvancedOpen)>.hero' in html
    assert 'body.publicCompact:not(.publicAdvancedOpen)>.layout' in html
    assert 'body.publicCompact:not(.publicAdvancedOpen)>.learningMoment' in html
    assert 'body.publicCompact:not(.publicAdvancedOpen)>.understandBuild' in html
    assert 'body.publicCompact:not(.publicAdvancedOpen)>.domainLab' in html
    assert 'body.publicCompact:not(.publicAdvancedOpen)>.sessionSandbox' in html
    assert 'publicToggleAdvanced()' in html


def test_public_surface_exposes_current_capacity_without_changing_qcds_boundary():
    html = living_robot_public_compact_html(static_mode=True)

    assert 'Browser</strong> · 18 live emulation dimensions' in html
    assert 'MacBook</strong> · 20' in html
    assert 'Central</strong> · 22' in html
    assert 'Quantum Full Space</strong> · no semantic projection' in html
    assert 'Swarm</strong> · QCDS uncertainty → oracle re-entry' in html
    assert 'Central fabric</strong> · parallel / sequential / hybrid' in html

    # The canonical four-phase legal QCDS presentation is still present.
    assert '1 · CONDITION FORMATION' in html
    assert '2 · CONDITIONAL EVOLUTION' in html
    assert '3 · 2^N INFERENCE' in html
    assert '4 · TRUTH ALIGNMENT' in html
