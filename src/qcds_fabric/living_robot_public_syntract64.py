from __future__ import annotations

from .living_robot_public_syntract63 import living_robot_public_syntract63_html as _base_html


_CSS = r'''
/* BUILD 64: keep the new Syntract capability unmistakably visible on landing. */
.publicSyntractTeaser{max-width:1800px;margin:8px auto 0;padding:0 14px}.publicSyntractTeaserInner{display:flex;align-items:center;gap:10px;flex-wrap:wrap;border:1px solid #416a54;background:linear-gradient(135deg,#0a2118,#0a1c26);border-radius:13px;padding:10px 11px;box-shadow:0 10px 35px #0003}.publicSyntractTeaserCopy{flex:1;min-width:250px}.publicSyntractTeaserKicker{font-size:6.5px;letter-spacing:.14em;text-transform:uppercase;color:#9fdbb4}.publicSyntractTeaserCopy b{display:block;font-size:10px;color:#e4f6ea;margin-top:3px}.publicSyntractTeaserCopy span{display:block;font-size:7.5px;line-height:1.45;color:#8eb6a0;margin-top:2px}.publicSyntractTeaser button{padding:8px 10px;font-size:7.5px;background:#d9f8e4;color:#082117;border-color:#d9f8e4}@media(max-width:700px){.publicSyntractTeaser{padding:0 8px}.publicSyntractTeaser button{width:100%}}
/* BUILD 102: Syntract run actions remain primary without becoming bright light panels. */
.publicSyntractCard>button[data-syntract-demo]{background:#173a2c!important;color:#d9f6e3!important;border-color:#47785e!important;box-shadow:none!important;transition:background .16s ease,border-color .16s ease,color .16s ease!important}.publicSyntractCard>button[data-syntract-demo]:hover{background:#1d4936!important;border-color:#69a57f!important;color:#effff4!important}.publicSyntractCard>button[data-syntract-demo]:focus-visible{outline:2px solid #77c998!important;outline-offset:2px}.publicSyntractCard.q94ActiveRun>button[data-syntract-demo]{background:#1c4433!important;border-color:#67a67e!important;box-shadow:0 0 0 2px #75c99418!important}
/* BUILD 103: discreet documentation drawer beside Technical details. */
.visionDocs{position:relative;flex:0 0 auto}.visionDocs>summary{list-style:none;cursor:pointer;font-size:8.5px;color:#93aaa2;border:1px solid #29495e;background:#091922;border-radius:9px;padding:7px 9px;white-space:nowrap;transition:border-color .16s ease,background .16s ease,color .16s ease}.visionDocs>summary::-webkit-details-marker{display:none}.visionDocs[open]>summary{border-color:#527966;color:#dff7e7;background:#0c2820}.visionDocsBackdrop{display:none;position:fixed;inset:0;z-index:175;background:rgba(1,7,11,.74);backdrop-filter:blur(5px);-webkit-backdrop-filter:blur(5px)}.visionDocs[open]>.visionDocsBackdrop{display:block}.visionDocsPanel{position:fixed;right:24px;top:76px;width:min(600px,calc(100vw - 48px));max-height:calc(100dvh - 100px);overflow:auto;border:1px solid #456d60;border-radius:18px;background:linear-gradient(155deg,#0b2025,#07151d 44%,#061219);box-shadow:0 28px 90px #000d,0 0 0 1px #8ce3b20e;z-index:180;color:#dcecf1}.visionDocsHead{position:sticky;top:0;z-index:2;display:flex;align-items:flex-start;justify-content:space-between;gap:14px;padding:17px;border-bottom:1px solid #294c50;background:linear-gradient(180deg,#0e2927fa,#0a1d22f4);backdrop-filter:blur(8px)}.visionDocsEyebrow{display:block;font-size:6.3px;letter-spacing:.16em;text-transform:uppercase;color:#86cfa3}.visionDocsHead b{display:block;margin-top:5px;font-size:15px;color:#effbf4}.visionDocsHead p{max-width:440px;margin:5px 0 0;font-size:8px;line-height:1.5;color:#91aaa5}.visionDocsClose{flex:0 0 auto;border:1px solid #41665f!important;background:#0a1b20!important;color:#b7cec8!important;border-radius:999px!important;padding:7px 9px!important;font-size:6.6px!important;letter-spacing:.1em!important;white-space:nowrap}.visionDocsBody{padding:14px 17px 17px}.visionDocsGrid{display:grid;grid-template-columns:1fr 1fr;gap:9px}.visionDoc{display:block;text-decoration:none;border:1px solid #294a50;border-radius:12px;background:linear-gradient(145deg,#0b2228,#09191f);padding:12px;min-height:92px;color:inherit;transition:border-color .16s ease,background .16s ease,transform .16s ease}.visionDoc:hover{border-color:#527f6c;background:linear-gradient(145deg,#0d2928,#0a1d22);transform:translateY(-1px)}.visionDocFeatured{border-color:#4b735e;background:linear-gradient(145deg,#0d2922,#091b20)}.visionDoc small{display:block;font-size:6.2px;letter-spacing:.14em;text-transform:uppercase;color:#76c995}.visionDoc b{display:block;margin-top:6px;font-size:10.5px;line-height:1.25;color:#e8f7ed}.visionDoc span{display:block;margin-top:6px;font-size:7.4px;line-height:1.45;color:#88a4aa}.visionDoc em{display:block;margin-top:9px;font-style:normal;font-size:6.4px;letter-spacing:.09em;text-transform:uppercase;color:#a7d7b8}.visionDocsFoot{margin-top:11px;font-size:7px;line-height:1.5;color:#779097}.visionDocsFoot a{color:#9dcbb0;text-decoration:none}.visionDocsFoot a:hover{text-decoration:underline}@media(max-width:900px){.visionDocsPanel{right:14px;top:70px;width:min(600px,calc(100vw - 28px))}}@media(max-width:560px){.visionDocs>summary{font-size:7.5px;padding:7px 8px}.visionDocsPanel{left:10px;right:10px;top:62px;width:auto;max-height:calc(100dvh - 76px);border-radius:15px}.visionDocsHead{padding:14px 13px 12px}.visionDocsHead b{font-size:13px}.visionDocsHead p{font-size:7.5px}.visionDocsBody{padding:12px 13px 14px}.visionDocsGrid{grid-template-columns:1fr}.visionDoc{min-height:0}.visionDocsClose{padding:6px 8px!important}}
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

_DOCS = r'''
<details class="visionDocs" id="visionDocs">
  <summary>THE SYNTRACT VISION</summary>
  <div class="visionDocsBackdrop" id="visionDocsBackdrop" aria-hidden="true"></div>
  <div class="visionDocsPanel" role="dialog" aria-modal="true" aria-labelledby="visionDocsTitle">
    <div class="visionDocsHead">
      <div>
        <span class="visionDocsEyebrow">Documentation</span>
        <b id="visionDocsTitle">The Syntract Vision</b>
        <p>Selected documents for understanding the vision, the QCDS foundation and concrete manifestations.</p>
      </div>
      <button type="button" class="visionDocsClose" id="visionDocsClose">CLOSE ×</button>
    </div>
    <div class="visionDocsBody">
      <div class="visionDocsGrid">
        <a class="visionDoc" target="_blank" rel="noopener noreferrer" href="https://raw.githubusercontent.com/iampathat/thesyntractvision/main/THE_SYNTRACT_VISION_GitHub_CC_BY.pdf">
          <small>Core vision · PDF</small><b>THE SYNTRACT VISION</b><span>The broad vision: QCDS, Syntract, Logical Space, oracles and manifestations.</span><em>OPEN PDF ↗</em>
        </a>
        <a class="visionDoc visionDocFeatured" target="_blank" rel="noopener noreferrer" href="https://raw.githubusercontent.com/iampathat/thesyntractvision/main/THE_SYNTRACT_VISION_ROBOTICS_FINAL_CONFERENCE_EDITION.pdf">
          <small>Robotics · Conference edition</small><b>THE SYNTRACT VISION — ROBOTICS</b><span>The visual and physical Logical Robot bridge, presented as a focused conference edition.</span><em>OPEN PDF ↗</em>
        </a>
        <a class="visionDoc" target="_blank" rel="noopener noreferrer" href="https://raw.githubusercontent.com/iampathat/thesyntractvision/main/QCDS_FABRIC_SPEC_v1.0_CANONICAL.pdf">
          <small>Canonical architecture · PDF</small><b>QCDS FABRIC v1.0</b><span>The locked canonical architecture and invariants behind the QCDS/Syntract system.</span><em>OPEN PDF ↗</em>
        </a>
        <a class="visionDoc" target="_blank" rel="noopener noreferrer" href="https://github.com/iampathat/thesyntractvision/blob/main/START_HERE.md">
          <small>Repository guide</small><b>START HERE</b><span>A concise entry into the living system, its boundaries and how the pieces fit together.</span><em>OPEN GUIDE ↗</em>
        </a>
      </div>
      <div class="visionDocsFoot">More implementation depth remains available in the <a target="_blank" rel="noopener noreferrer" href="https://github.com/iampathat/thesyntractvision">GitHub repository ↗</a>.</div>
    </div>
  </div>
</details>
'''

_DOCS_SCRIPT = r'''
<script>
/* BUILD 103: documentation is a reading surface only. It never touches QCDS execution. */
(function(){
  function mountVisionDocs(){
    const docs=document.getElementById('visionDocs');
    const technical=document.getElementById('clarityDetails');
    const header=docs?.closest('header');
    const close=document.getElementById('visionDocsClose');
    const backdrop=document.getElementById('visionDocsBackdrop');
    if(!docs)return;
    const shut=()=>{docs.open=false};
    close?.addEventListener('click',shut);
    backdrop?.addEventListener('click',shut);
    docs.addEventListener('toggle',()=>{
      if(docs.open){if(technical)technical.open=false;header?.classList.add('publicTechnicalDetailsOpen');setTimeout(()=>close?.focus(),0)}
      else if(!technical?.open)header?.classList.remove('publicTechnicalDetailsOpen');
    });
    technical?.addEventListener('toggle',()=>{if(technical.open){docs.open=false}else if(!docs.open)header?.classList.remove('publicTechnicalDetailsOpen')});
    document.addEventListener('keydown',event=>{if(event.key==='Escape'&&docs.open){event.preventDefault();shut()}});
    const mark=document.querySelector('.publicBuildMark');if(mark)mark.textContent='BUILD 103';
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mountVisionDocs);else mountVisionDocs();
})();
</script>
'''


def living_robot_public_syntract64_html(*, static_mode: bool = False) -> str:
    html = _base_html(static_mode=static_mode)
    nav = '<button type="button" data-public-view="syntract" onclick="publicSelectView(\'syntract\')">SYNTRACTS</button>'
    anchor = '</section>\n<div class="publicCapabilityStrip">'
    details_anchor = '<details class="clarityDetails" id="clarityDetails">'
    if "</style>" not in html or nav not in html or anchor not in html or details_anchor not in html or "</body>" not in html:
        raise RuntimeError("public Syntract/docs surface changed; BUILD 103 cannot attach safely")
    html = html.replace("</style>", _CSS + "\n</style>", 1)
    html = html.replace(nav, '<button type="button" data-public-view="syntract" onclick="publicSelectView(\'syntract\')">SYNTRACTS · NEW</button>', 1)
    html = html.replace(anchor, '</section>\n' + _TEASER + '\n<div class="publicCapabilityStrip">', 1)
    html = html.replace(details_anchor, _DOCS + '\n  ' + details_anchor, 1)
    html = html.replace("</body>", _DOCS_SCRIPT + "\n</body>", 1)
    return html


__all__ = ["living_robot_public_syntract64_html"]
