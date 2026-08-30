from __future__ import annotations

from .living_robot_public_syntract64 import living_robot_public_syntract64_html as _base_html


_HIDE_DUPLICATE_LEGAL_CSS = r'''
/* BUILD 66: Legal Robot is a top-level work surface, not a duplicate QCDS seed. */
#legal-world-card{display:none!important}
'''

_SEED_REPLACEMENTS = (
    (
        "biology",
        "observations:['signal=high','stress=low','nutrient=rich','dna_damage=low','energy=high','oxygen=normal','growth_factor=present','mitochondria=stable'],constraints:{signal:'high',stress:'low',nutrient:'rich',dna_damage:'low',energy:'high',oxygen:'normal',growth_factor:'present',mitochondria:'stable'}",
        "observations:['signal=high','stress=low','nutrient=limited','dna_damage=low','energy=medium','oxygen=normal','growth_factor=present','mitochondria=stable'],constraints:{signal:'high',stress:'low',nutrient:'limited',dna_damage:'low',energy:'medium',oxygen:'normal',growth_factor:'present',mitochondria:'stable'}",
    ),
    (
        "robotics",
        "observations:['obstacle=low','battery=high','traction=good','visibility=good','deadline=tight','localization=strong','surface=dry','human_zone=clear'],constraints:{obstacle:'low',battery:'high',traction:'good',visibility:'good',deadline:'tight',localization:'strong',surface:'dry',human_zone:'clear'}",
        "observations:['obstacle=medium','battery=high','traction=good','visibility=good','deadline=loose','localization=strong','surface=dry','human_zone=clear'],constraints:{obstacle:'medium',battery:'high',traction:'good',visibility:'good',deadline:'loose',localization:'strong',surface:'dry',human_zone:'clear'}",
    ),
    (
        "materials",
        "observations:['temperature=high','oxidation=low','lattice=dense','coating=intact','load=medium','fatigue=low','moisture=low','defects=low'],constraints:{temperature:'high',oxidation:'low',lattice:'dense',coating:'intact',load:'medium',fatigue:'low',moisture:'low',defects:'low'}",
        "observations:['temperature=high','oxidation=medium','lattice=dense','coating=worn','load=medium','fatigue=medium','moisture=low','defects=low'],constraints:{temperature:'high',oxidation:'medium',lattice:'dense',coating:'worn',load:'medium',fatigue:'medium',moisture:'low',defects:'low'}",
    ),
    (
        "software",
        "observations:['latency=high','queue=growing','cpu=medium','memory=stable','database=slow','errors=medium','connections=high','retries=growing'],constraints:{latency:'high',queue:'growing',cpu:'medium',memory:'stable',database:'slow',errors:'medium',connections:'high',retries:'growing'}",
        "observations:['latency=extreme','queue=growing','cpu=high','memory=unstable','database=slow','errors=high','connections=dropping','retries=storm'],constraints:{latency:'extreme',queue:'growing',cpu:'high',memory:'unstable',database:'slow',errors:'high',connections:'dropping',retries:'storm'}",
    ),
)

_OLD_ROWS = "const rows=result.baseline||[],lead=rows.length?rows[0]:null;"
_NEW_ROWS = "const rows=result.baseline||[],lead=rows.length?rows[0]:null,runnerUp=rows.length>1?rows[1]:null,tied=!!(lead&&runnerUp&&Math.abs(Number(lead.probability)-Number(runnerUp.probability))<0.0005);"

_OLD_SUMMARY = "summary.textContent=lead?('The translated oracle logic currently leaves '+lead.value+' with the largest probability mass at '+q38Pct(lead.probability)+' inside this represented Logical Space. This is not an external-world probability.'):'No candidate distribution was returned.';"
_NEW_SUMMARY = "summary.textContent=lead?(tied?('The translated oracle logic leaves '+lead.value+' and '+runnerUp.value+' effectively tied at '+q38Pct(lead.probability)+' inside this represented Logical Space. The uncertainty remains explicit; this is not an external-world probability.'):('The translated oracle logic currently leaves '+lead.value+' with the largest probability mass at '+q38Pct(lead.probability)+' inside this represented Logical Space. This is not an external-world probability.')):'No candidate distribution was returned.';"


def _replace_once(html: str, old: str, new: str, label: str) -> str:
    count = html.count(old)
    if count != 1:
        raise RuntimeError(f"public quick-case contract changed for {label}: expected 1 match, found {count}")
    return html.replace(old, new, 1)


def living_robot_public_casefix66_html(*, static_mode: bool = False) -> str:
    """Public-only demo repair without changing QCDS inference semantics.

    The quick cases now exercise different represented evidence patterns instead
    of each giving one candidate a perfect 8/8 match. Swedish Law remains a
    top-level Legal Robot work surface and is hidden from the QCDS seed grid.
    """

    html = _base_html(static_mode=static_mode)
    for label, old, new in _SEED_REPLACEMENTS:
        html = _replace_once(html, old, new, label)
    html = _replace_once(html, _OLD_ROWS, _NEW_ROWS, "quick-result tie detection")
    html = _replace_once(html, _OLD_SUMMARY, _NEW_SUMMARY, "quick-result summary")
    if "</style>" not in html:
        raise RuntimeError("public style block missing; duplicate Legal Robot seed cannot be hidden")
    html = html.replace("</style>", _HIDE_DUPLICATE_LEGAL_CSS + "\n</style>", 1)
    return html


__all__ = ["living_robot_public_casefix66_html"]
