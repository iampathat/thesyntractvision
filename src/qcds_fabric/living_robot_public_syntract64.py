from __future__ import annotations

from .living_robot_public_syntract63 import living_robot_public_syntract63_html as _base_html


_CSS = r'''
/* BUILD 64: keep the new Syntract capability unmistakably visible on landing. */
.publicSyntractTeaser{max-width:1800px;margin:8px auto 0;padding:0 14px}.publicSyntractTeaserInner{display:flex;align-items:center;gap:10px;flex-wrap:wrap;border:1px solid #416a54;background:linear-gradient(135deg,#0a2118,#0a1c26);border-radius:13px;padding:10px 11px;box-shadow:0 10px 35px #0003}.publicSyntractTeaserCopy{flex:1;min-width:250px}.publicSyntractTeaserKicker{font-size:6.5px;letter-spacing:.14em;text-transform:uppercase;color:#9fdbb4}.publicSyntractTeaserCopy b{display:block;font-size:10px;color:#e4f6ea;margin-top:3px}.publicSyntractTeaserCopy span{display:block;font-size:7.5px;line-height:1.45;color:#8eb6a0;margin-top:2px}.publicSyntractTeaser button{padding:8px 10px;font-size:7.5px;background:#d9f8e4;color:#082117;border-color:#d9f8e4}@media(max-width:700px){.publicSyntractTeaser{padding:0 8px}.publicSyntractTeaser button{width:100%}}

/* BUILD 102: Syntract demo actions should read as actions, not illuminated panels. */
.publicSyntractCard button{
  background:#173a2c;
  color:#d9f6e4;
  border-color:#4f8c6b;
  box-shadow:none;
}
.publicSyntractCard button:hover,
.publicSyntractCard button:focus-visible{
  background:#1d4736;
  color:#effff4;
  border-color:#6caf86;
  box-shadow:0 0 0 2px #75d79a14;
}
.publicSyntractCard button:disabled{
  background:#132c23;
  color:#8db7a0;
  border-color:#355f49;
  box-shadow:none;
}
@media(max-width:700px){
  .publicSyntractCard.q94ActiveRun>button{
    border-color:#6caf86;
    box-shadow:0 0 0 2px #75d79a10;
  }
}
'''

_TEASER = r'''
<section class="publicSyntractTeaser" id="public-syntract-teaser">
  <div class="publicSyntractTeaserInner">
    <div class="publicSyntractTeaserCopy">
      <div class="publicSyntractTeaserKicker">NEW CAPABILITY · PARALLEL SYNTRACTS</div>
      <b>Syntracts can now enter QCDS together and bind a higher-order Syntract.</b>
      <span>DNA + protein + cell + patient + drug · investigation evidence domains · robot + environment + mission + safety + people.</span>
    </div>
    <button type="button" onclick="publicSelectView('syntract')">OPEN SYNTRACT DEMOS →</button>
  </div>
</section>
'''


def living_robot_public_syntract64_html(*, static_mode: bool = False) -> str:
    html = _base_html(static_mode=static_mode)
    nav = '<button type="button" data-public-view="syntract" onclick="publicSelectView(\'syntract\')">SYNTRACTS</button>'
    anchor = '</section>\n<div class="publicCapabilityStrip">'
    if "</style>" not in html or nav not in html or anchor not in html:
        raise RuntimeError("public Syntract surface changed; BUILD 64 visibility layer cannot attach safely")
    html = html.replace("</style>", _CSS + "\n</style>", 1)
    html = html.replace(nav, '<button type="button" data-public-view="syntract" onclick="publicSelectView(\'syntract\')">SYNTRACTS · NEW</button>', 1)
    html = html.replace(anchor, '</section>\n' + _TEASER + '\n<div class="publicCapabilityStrip">', 1)
    return html


__all__ = ["living_robot_public_syntract64_html"]
