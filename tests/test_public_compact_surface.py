from qcds_fabric.living_robot_public_compact import living_robot_public_compact_html


def test_public_surface_is_compact_and_has_one_current_build_label():
    html = living_robot_public_compact_html(static_mode=True)

    assert '<body class="publicCompact publicViewQcds">' in html
    assert '<span class="publicBuildMark">BUILD 45</span>' in html
    assert 'BUILD 35 · EPHEMERAL LOGICAL SPACE SANDBOX' not in html
    assert 'BUILD 34 · CUSTOM LOGICAL SPACE' not in html

    # Public navigation switches mutually exclusive views instead of navigating to anchors.
    assert 'onclick="publicSelectView(\'qcds\')">TRY QCDS</button>' in html
    assert 'onclick="publicSelectView(\'legal\')">LEGAL ROBOT</button>' in html
    assert 'onclick="publicSelectView(\'advanced\')">ADVANCED</button>' in html
    assert "const PUBLIC_VIEW_CLASSES=['publicViewQcds','publicViewLegal','publicViewAdvanced']" in html
    assert "function publicGo(" not in html
    assert "window.scrollTo({top:0,left:0,behavior:'auto'});" in html

    # Old shortcuts are overridden at the public boundary so they cannot anchor-scroll between views.
    public_script = html.rsplit('<script>', 1)[-1]
    assert "function openLegalRobot(){\n publicSelectView('legal');" in public_script
    assert "function openAdvancedLab(){\n publicSelectView('advanced');" in public_script
    assert "scrollIntoView" not in public_script

    # Historical/advanced surfaces remain available but only participate in layout in Advanced.
    assert 'body.publicCompact:not(.publicViewAdvanced)>.hero' in html
    assert 'body.publicCompact:not(.publicViewAdvanced)>.layout' in html
    assert 'body.publicCompact:not(.publicViewAdvanced)>.learningMoment' in html
    assert 'body.publicCompact:not(.publicViewAdvanced)>.understandBuild' in html
    assert 'body.publicCompact:not(.publicViewAdvanced)>.domainLab' in html
    assert 'body.publicCompact:not(.publicViewAdvanced)>.sessionSandbox' in html
    assert 'body.publicCompact:not(.publicViewQcds) #try-logical-robot' in html
    assert 'body.publicCompact:not(.publicViewLegal) #swedish-legal-robot' in html


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
