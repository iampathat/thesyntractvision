from __future__ import annotations

import argparse
from pathlib import Path
from typing import Sequence

from .living_robot_public import living_robot_public_html as _base_html


_CSS = r'''
/* BUILD 105: restrained visual identity. Artwork only; QCDS/Syntract execution is untouched. */
.syntractArtworkMark,.syntractArtworkMini,.syntractArtworkDocMark{
  display:inline-block;
  flex:0 0 auto;
  background:#88dca8;
  -webkit-mask:url('assets/syntract-mark.svg') center/contain no-repeat;
  mask:url('assets/syntract-mark.svg') center/contain no-repeat;
}
header .brand h1{display:flex;align-items:center;gap:9px}
header .brand h1 .syntractArtworkMark{width:22px;height:22px;background:#83e2aa;filter:drop-shadow(0 0 8px #79e5a72a)}

/* The two quiet header actions should read as one intentional pair. */
.visionDocs>summary,.clarityDetails>summary{
  height:34px!important;
  min-height:34px!important;
  box-sizing:border-box!important;
  display:flex!important;
  align-items:center!important;
  justify-content:center!important;
  line-height:1!important;
}
.visionDocs>summary{gap:6px!important}
.visionDocs>summary .syntractArtworkMini{width:12px;height:12px;background:#82cfa0;opacity:.9}

/* Documentation identity: a little air between the green eyebrow and white title. */
.visionDocsTitleRow{display:flex;align-items:flex-start;gap:11px;min-width:0}
.visionDocsTitleCopy{min-width:0}
.visionDocsTitleCopy .visionDocsEyebrow{margin:0}
.visionDocsTitleCopy #visionDocsTitle{margin-top:8px!important}
.visionDocsTitleCopy p{margin-top:6px!important}
.syntractArtworkDocMark{width:30px;height:30px;margin-top:1px;background:#88dca8;opacity:.92}

@media(max-width:560px){
  .visionDocs>summary,.clarityDetails>summary{height:32px!important;min-height:32px!important}
  header .brand h1 .syntractArtworkMark{width:20px;height:20px}
  .syntractArtworkDocMark{width:27px;height:27px}
  .visionDocsTitleCopy #visionDocsTitle{margin-top:7px!important}
}
'''

_SCRIPT = r'''
<script>
/* BUILD 105: identity metadata only. */
(function(){
  const mark=document.querySelector('.publicBuildMark');
  if(mark)mark.textContent='BUILD 105';
})();
</script>
'''

_BRAND_OLD = '<span class="pulse"></span>The Logical Robot'
_BRAND_NEW = '<span class="syntractArtworkMark" aria-hidden="true"></span>The Logical Robot'

_DOC_SUMMARY_OLD = '<summary>THE SYNTRACT VISION</summary>'
_DOC_SUMMARY_NEW = '<summary><span class="syntractArtworkMini" aria-hidden="true"></span><span>THE SYNTRACT VISION</span></summary>'

_DOC_TITLE_OLD = '''<span class="visionDocsEyebrow">Documentation</span>
        <b id="visionDocsTitle">The Syntract Vision</b>
        <p>Selected documents for understanding the vision, the QCDS foundation and concrete manifestations.</p>'''
_DOC_TITLE_NEW = '''<div class="visionDocsTitleRow">
          <span class="syntractArtworkDocMark" aria-hidden="true"></span>
          <div class="visionDocsTitleCopy">
            <span class="visionDocsEyebrow">Documentation</span>
            <b id="visionDocsTitle">The Syntract Vision</b>
            <p>Selected documents for understanding the vision, the QCDS foundation and concrete manifestations.</p>
          </div>
        </div>'''


def living_robot_public_brand105_html(*, static_mode: bool = False) -> str:
    """Add the Syntract artwork identity without changing inference or navigation."""
    html = _base_html(static_mode=static_mode)
    required = (_BRAND_OLD, _DOC_SUMMARY_OLD, _DOC_TITLE_OLD, '</style>', '</body>')
    if any(item not in html for item in required):
        raise RuntimeError('public identity anchors changed; BUILD 105 cannot attach safely')
    html = html.replace(_BRAND_OLD, _BRAND_NEW, 1)
    html = html.replace(_DOC_SUMMARY_OLD, _DOC_SUMMARY_NEW, 1)
    html = html.replace(_DOC_TITLE_OLD, _DOC_TITLE_NEW, 1)
    html = html.replace('</style>', _CSS + '\n</style>', 1)
    html = html.replace('</body>', _SCRIPT + '\n</body>', 1)
    return html


def export_static(path: str | Path) -> Path:
    target = Path(path)
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(living_robot_public_brand105_html(static_mode=True), encoding='utf-8')
    return target


def main(argv: Sequence[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description='Export the BUILD 105 branded public QCDS/Syntract surface.')
    parser.add_argument('--export', required=True, help='Output HTML path')
    args = parser.parse_args(argv)
    export_static(args.export)
    return 0


if __name__ == '__main__':
    raise SystemExit(main())


__all__ = ['living_robot_public_brand105_html', 'export_static']
