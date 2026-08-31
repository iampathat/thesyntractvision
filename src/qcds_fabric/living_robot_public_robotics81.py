from __future__ import annotations

from .living_robot_public_robotics80 import living_robot_public_robotics80_html as _base_html


_DRAW_ANCHOR = r''' const p=Q75.result?.representative_shortest_path||[];if(p.length){ctx.strokeStyle='#77dba0';ctx.lineWidth=Math.max(3,Math.min(cw,ch)*.18);ctx.lineCap='round';ctx.lineJoin='round';ctx.beginPath();p.forEach(([x,y],i)=>{const px=(x+.5)*cw,py=(y+.5)*ch;i?ctx.lineTo(px,py):ctx.moveTo(px,py)});ctx.stroke()}'''

_DRAW_WITH_ALTERNATIVES = r''' const alternativeRoutes=Q75.result?.alternative_shortest_paths||[];if(alternativeRoutes.length&&Q75.altRouteAlpha>0){ctx.save();ctx.lineWidth=Math.max(1.2,Math.min(cw,ch)*.07);ctx.lineCap='round';ctx.lineJoin='round';ctx.setLineDash([Math.max(2,Math.min(cw,ch)*.10),Math.max(5,Math.min(cw,ch)*.22)]);alternativeRoutes.slice(0,8).forEach((route,index)=>{ctx.strokeStyle='hsla('+((194+index*41)%360)+',78%,72%,'+Q75.altRouteAlpha+')';ctx.beginPath();route.forEach(([x,y],i)=>{const px=(x+.5)*cw,py=(y+.5)*ch;i?ctx.lineTo(px,py):ctx.moveTo(px,py)});ctx.stroke()});ctx.restore()}
 const p=Q75.result?.representative_shortest_path||[];if(p.length){ctx.strokeStyle='#77dba0';ctx.lineWidth=Math.max(3,Math.min(cw,ch)*.18);ctx.lineCap='round';ctx.lineJoin='round';ctx.setLineDash([]);ctx.beginPath();p.forEach(([x,y],i)=>{const px=(x+.5)*cw,py=(y+.5)*ch;i?ctx.lineTo(px,py):ctx.moveTo(px,py)});ctx.stroke()}'''

_SCRIPT = r'''
<script>
/* BUILD 81: briefly reveal other members of the already-inferred shortest-route family. */
Q75.altRouteAlpha=0;
Q75.altRouteFadeFrame=null;

function q81StartAlternativeFade(){
  if(Q75.altRouteFadeFrame)cancelAnimationFrame(Q75.altRouteFadeFrame);
  const routes=Q75.result?.alternative_shortest_paths||[];
  if(!routes.length){Q75.altRouteAlpha=0;return}
  const started=performance.now();
  const holdMs=500;
  const fadeMs=2600;
  Q75.altRouteAlpha=.34;
  const animate=now=>{
    const elapsed=now-started;
    if(elapsed<=holdMs)Q75.altRouteAlpha=.34;
    else Q75.altRouteAlpha=Math.max(0,.34*(1-(elapsed-holdMs)/fadeMs));
    q75DrawWorld();
    if(Q75.altRouteAlpha>0)Q75.altRouteFadeFrame=requestAnimationFrame(animate);
    else Q75.altRouteFadeFrame=null;
  };
  Q75.altRouteFadeFrame=requestAnimationFrame(animate);
}

const q81BaseUpdatePanel=q75UpdatePanel;
q75UpdatePanel=function(){
  q81BaseUpdatePanel();
  q81StartAlternativeFade();
};
</script>
'''


def living_robot_public_robotics81_html(*, static_mode: bool = False) -> str:
    html = _base_html(static_mode=static_mode)
    if html.count(_DRAW_ANCHOR) != 1:
        raise RuntimeError("Robotics route drawing changed; BUILD 81 route-family preview cannot attach")
    html = html.replace(_DRAW_ANCHOR, _DRAW_WITH_ALTERNATIVES, 1)
    html = html.replace(
        '<span class="route">representative shortest route</span>',
        '<span class="route">representative shortest route</span><span class="alternatives">other surviving shortest routes · briefly visible</span>',
        1,
    )
    html = html.replace(
        '</style>',
        '.publicRobotLegend .alternatives:before{background:linear-gradient(90deg,#77bde8,#cf88e8,#e7b76f)}\n</style>',
        1,
    )
    html = html.replace('</body>', _SCRIPT + '\n</body>', 1)
    return html


__all__ = ["living_robot_public_robotics81_html"]
