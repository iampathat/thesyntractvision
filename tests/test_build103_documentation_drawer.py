from qcds_fabric.living_robot_public import living_robot_public_html


def test_build103_documentation_drawer_is_discreet_and_read_only() -> None:
    html = living_robot_public_html(static_mode=True)

    assert 'id="visionDocs"' in html
    assert '<summary>THE SYNTRACT VISION</summary>' in html
    assert 'id="visionDocsBackdrop"' in html
    assert 'id="visionDocsClose"' in html
    assert 'Selected documents for understanding the vision' in html

    robotics = 'https://raw.githubusercontent.com/iampathat/thesyntractvision/main/THE_SYNTRACT_VISION_ROBOTICS_FINAL_CONFERENCE_EDITION.pdf'
    vision = 'https://raw.githubusercontent.com/iampathat/thesyntractvision/main/THE_SYNTRACT_VISION_GitHub_CC_BY.pdf'
    canonical = 'https://raw.githubusercontent.com/iampathat/thesyntractvision/main/QCDS_FABRIC_SPEC_v1.0_CANONICAL.pdf'
    for url in (robotics, vision, canonical):
        assert f'href="{url}"' in html

    assert html.count('target="_blank" rel="noopener noreferrer"') >= 5
    assert 'ROBOTICS · CONFERENCE EDITION' in html.upper()
    assert 'QCDS FABRIC v1.0' in html
    assert 'START HERE' in html

    # Documentation is a presentation-only surface. It must never create an
    # alternate inference path or touch the QCDS worker/runtime.
    docs_script = html.split('/* BUILD 103: documentation is a reading surface only.', 1)[1]
    assert 'robotics_playground_run' not in docs_script
    assert 'syntract_demo_run' not in docs_script
    assert 'q75WorkerRun' not in docs_script
    assert 'q63WorkerRun' not in docs_script
    assert 'problem_to_syntract' not in docs_script

    # The two top-right drawers must not stack over one another.
    assert "if(technical)technical.open=false" in docs_script
    assert "if(technical.open){docs.open=false}" in docs_script
    assert "if(event.key==='Escape'&&docs.open)" in docs_script
