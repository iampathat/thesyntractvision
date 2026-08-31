from qcds_fabric.living_robot_public import PUBLIC_BUILD, living_robot_public_html


def test_final_router_owns_top_navigation_after_feature_wrappers():
    html = living_robot_public_html(static_mode=True)
    assert int(PUBLIC_BUILD) >= 78
    assert "one top menu, one visible work surface" in html
    assert "window.publicSelectView=function(requested)" in html
    assert html.rfind("window.publicSelectView=function(requested)") > html.rfind("function publicSelectView(view)")
    assert "document.body.dataset.publicView=view" in html
    assert "if(view==='robotics' && typeof window.q75Activate==='function')" in html


def test_each_primary_view_has_one_explicit_surface_contract():
    html = living_robot_public_html(static_mode=True)
    for view in ("qcds", "legal", "robotics", "syntract", "advanced"):
        assert f'data-public-view="{view}"' in html
    for surface in ("try-logical-robot", "public-legal-question", "public-robotics", "public-syntracts"):
        assert f'#{surface}' in html
    assert "body.publicCompact.publicViewQcds #try-logical-robot{display:block!important}" in html
    assert "body.publicCompact.publicViewRobotics #public-robotics{display:block!important}" in html
    assert "body.publicCompact.publicViewSyntract #public-syntracts{display:block!important}" in html
    assert "body.publicCompact #public-syntract-teaser" in html
    assert "body.publicCompact .publicCapabilityStrip{display:none!important}" in html


def test_final_router_does_not_scroll_on_menu_selection():
    html = living_robot_public_html(static_mode=True)
    start = html.rfind("/* BUILD 78: final router")
    end = html.find("</script>", start)
    router = html[start:end]
    assert "scrollTo" not in router
