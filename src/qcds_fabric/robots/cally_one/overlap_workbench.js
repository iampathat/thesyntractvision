/* Cally.One simultaneous-event workbench.
   Ordinary UI/state projection only; never starts QCDS inference. */
(() => {
  if (window.__callyOverlapWorkbenchV1) return;
  window.__callyOverlapWorkbenchV1 = true;

  const qs = (s, root=document) => root.querySelector(s);
  const qsa = (s, root=document) => [...root.querySelectorAll(s)];
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  let sourceCluster = null;
  let model = null;

  async function readState() {
    try {
      const response = await fetch('/api/state');
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } catch (_) { return {events:[],people:[],entities:[]}; }
  }

  function clock(value) {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return '—';
    return new Intl.DateTimeFormat(undefined,{hour:'2-digit',minute:'2-digit'}).format(d);
  }

  function durationMinutes(item) {
    const start = new Date(item.start).getTime();
    const end = new Date(item.end).getTime();
    return Number.isFinite(start) && Number.isFinite(end) ? Math.max(15,(end-start)/60000) : 60;
  }

  function sourceRows(cluster, snapshot) {
    const byId = new Map((snapshot.events || []).map(item => [String(item.event_id),item]));
    const people = new Map((snapshot.people || []).map(item => [String(item.person_id),item.name || item.label || item.person_id]));
    return qsa('.event[data-event-id]', cluster).map((element,index) => {
      const id = String(element.dataset.eventId || '');
      const item = byId.get(id) || {};
      const start = new Date(item.start || 0);
      const end = new Date(item.end || item.start || 0);
      const names = (item.people || []).map(personId => people.get(String(personId)) || String(personId));
      const column = Number.parseInt(element.dataset.callyOverlapColumn || '',10);
      const fallbackColumn = Number.isFinite(column) ? column : index;
      return {
        id,
        item,
        element,
        column:fallbackColumn,
        start:Number.isNaN(start.getTime()) ? new Date() : start,
        end:Number.isNaN(end.getTime()) ? new Date(Date.now()+3600000) : end,
        title:item.title || qs('b',element)?.textContent?.trim() || 'Händelse',
        location:item.location || '',
        people:names,
        dimensions:item.dimensions && typeof item.dimensions === 'object' ? item.dimensions : {},
      };
    }).sort((a,b) => a.start-b.start || a.end-b.end || a.title.localeCompare(b.title,'sv'));
  }

  function ensureOverlay() {
    let overlay = qs('#callyOverlapWorkbench');
    if (overlay) return overlay;
    overlay = document.createElement('div');
    overlay.id = 'callyOverlapWorkbench';
    overlay.className = 'callyOverlapWorkbench';
    overlay.innerHTML = '<section class="callyOverlapWorkbenchSheet" role="dialog" aria-modal="true" aria-label="Djupvy för samtidiga händelser"></section>';
    document.body.appendChild(overlay);
    overlay.addEventListener('click', event => { if (event.target === overlay) close(); });
    return overlay;
  }

  function close() {
    qs('#callyOverlapWorkbench')?.classList.remove('open');
  }

  function boardWindow(rows) {
    if (!rows.length) return null;
    const starts = rows.map(row => row.start.getTime());
    const ends = rows.map(row => row.end.getTime());
    const min = new Date(Math.min(...starts));
    const max = new Date(Math.max(...ends));
    min.setMinutes(Math.floor(min.getMinutes()/30)*30,0,0);
    max.setMinutes(Math.ceil(max.getMinutes()/30)*30,0,0);
    if (max <= min) max.setTime(min.getTime()+3600000);
    return {min,max,minutes:(max-min)/60000};
  }

  function render() {
    if (!model) return;
    const {overlay,sheet} = model;
    const query = model.query.trim().toLowerCase();
    const filtered = model.rows.filter(row => !query || `${row.title} ${row.location} ${row.people.join(' ')} ${JSON.stringify(row.dimensions)}`.toLowerCase().includes(query));
    const pageSize = model.pageSize;
    const pages = Math.max(1,Math.ceil(filtered.length/pageSize));
    model.page = Math.max(0,Math.min(model.page,pages-1));
    const visible = filtered.slice(model.page*pageSize,(model.page+1)*pageSize);
    const range = boardWindow(visible);
    const viewport = qs('.callyOverlapWorkbenchViewport',sheet);
    const board = qs('.callyOverlapWorkbenchBoard',sheet);
    if (!viewport || !board) return;

    if (!visible.length || !range) {
      board.style.width='100%'; board.style.height='100%';
      board.innerHTML='<div class="callyOverlapWorkbenchEmpty">Inga händelser matchar sökningen.</div>';
      return;
    }

    const scale = model.zoom;
    const pxPerMinute = 1.18*scale;
    const laneWidth = Math.max(170,230*scale);
    const uniqueColumns = [...new Set(visible.map(row => row.column))];
    const columnMap = new Map(uniqueColumns.map((value,index)=>[value,index]));
    const leftGutter = 68;
    const boardWidth = Math.max(viewport.clientWidth-2,leftGutter+uniqueColumns.length*laneWidth+28);
    const boardHeight = Math.max(viewport.clientHeight-2,range.minutes*pxPerMinute+64);
    board.style.width=`${boardWidth}px`;
    board.style.height=`${boardHeight}px`;
    board.style.setProperty('--cally-workbench-hour',`${60*pxPerMinute}px`);

    const hourMarks=[];
    const markStart=new Date(range.min);
    markStart.setMinutes(0,0,0);
    if(markStart<range.min) markStart.setHours(markStart.getHours()+1);
    for(let t=markStart.getTime();t<=range.max.getTime();t+=3600000){
      const top=32+((t-range.min.getTime())/60000)*pxPerMinute;
      hourMarks.push(`<span class="callyOverlapWorkbenchTime" style="top:${top}px">${esc(clock(new Date(t)))}</span>`);
    }

    const cards=visible.map(row=>{
      const top=32+((row.start-range.min)/60000)*pxPerMinute;
      const left=leftGutter+(columnMap.get(row.column)||0)*laneWidth+8;
      const height=Math.max(64,durationMinutes(row.item)*pxPerMinute);
      const width=Math.max(150,laneWidth-16);
      const meta=[`${clock(row.start)}–${clock(row.end)}`,row.people.join(', ')].filter(Boolean).join(' · ');
      const chips=[row.location,...Object.entries(row.dimensions).filter(([key,value])=>!key.startsWith('calendar_')&&value!=null&&value!=='').slice(0,2).map(([key,value])=>`${key}: ${typeof value==='object'?JSON.stringify(value):value}`)].filter(Boolean);
      return `<article class="callyOverlapWorkbenchCard${model.activeId===row.id?' is-active':''}" data-workbench-event="${esc(row.id)}" style="left:${left}px;top:${top}px;width:${width}px;height:${height}px"><time>${esc(clock(row.start))}</time><strong>${esc(row.title)}</strong><div class="callyOverlapWorkbenchCardMeta">${esc(meta)}</div><div class="callyOverlapWorkbenchCardChips">${chips.map(value=>`<span>${esc(value)}</span>`).join('')}</div></article>`;
    }).join('');
    board.innerHTML=hourMarks.join('')+cards;

    qsa('[data-workbench-event]',board).forEach(card=>card.addEventListener('click',()=>{
      model.activeId=String(card.dataset.workbenchEvent||'');
      render();
    }));

    const zoomLabel=qs('[data-workbench-zoom-label]',sheet);
    if(zoomLabel) zoomLabel.textContent=`${Math.round(scale*100)}%`;
    const pager=qs('.callyOverlapWorkbenchPager',sheet);
    if(pager){
      pager.hidden=pages<=1;
      const label=qs('[data-workbench-page-label]',pager);
      if(label) label.textContent=`${filtered.length?model.page*pageSize+1:0}–${Math.min(filtered.length,(model.page+1)*pageSize)} / ${filtered.length}`;
      const prev=qs('[data-workbench-page="prev"]',pager); const next=qs('[data-workbench-page="next"]',pager);
      if(prev) prev.disabled=model.page<=0; if(next) next.disabled=model.page>=pages-1;
    }
  }

  function renderShell() {
    const {sheet,rows}=model;
    sheet.innerHTML=`<header class="callyOverlapWorkbenchHead"><div><div class="callyOverlapWorkbenchKicker">SAMTIDIGHET · DJUPVY</div><h2>${rows.length} samtidiga händelser</h2><p>En riktig tidsaxel med separata lager. Zooma utan att tappa läsbarheten; händelserna ligger kvar på sina faktiska tider.</p></div><div class="callyOverlapWorkbenchHeadActions"><button type="button" data-workbench-back>← Återgå</button><button type="button" class="callyOverlapWorkbenchClose" data-workbench-close aria-label="Stäng">×</button></div></header><div class="callyOverlapWorkbenchTools"><label class="callyOverlapWorkbenchSearch"><span>Sök</span><input data-workbench-search placeholder="Person, plats, händelse, dimension…"></label><div class="callyOverlapWorkbenchZoom"><button type="button" data-workbench-zoom="out" aria-label="Zooma ut">−</button><span data-workbench-zoom-label>100%</span><button type="button" data-workbench-zoom="in" aria-label="Zooma in">+</button></div><div class="callyOverlapWorkbenchPager" hidden><button type="button" data-workbench-page="prev">‹</button><span data-workbench-page-label></span><button type="button" data-workbench-page="next">›</button></div></div><div class="callyOverlapWorkbenchViewport"><div class="callyOverlapWorkbenchBoard"></div></div>`;
    qs('[data-workbench-back]',sheet)?.addEventListener('click',close);
    qs('[data-workbench-close]',sheet)?.addEventListener('click',close);
    qs('[data-workbench-search]',sheet)?.addEventListener('input',event=>{model.query=event.target.value||'';model.page=0;render();});
    qs('[data-workbench-zoom="out"]',sheet)?.addEventListener('click',()=>{model.zoom=Math.max(.55,model.zoom-.15);render();});
    qs('[data-workbench-zoom="in"]',sheet)?.addEventListener('click',()=>{model.zoom=Math.min(2.25,model.zoom+.15);render();});
    qs('[data-workbench-page="prev"]',sheet)?.addEventListener('click',()=>{model.page-=1;render();});
    qs('[data-workbench-page="next"]',sheet)?.addEventListener('click',()=>{model.page+=1;render();});
    render();
  }

  async function open(cluster) {
    sourceCluster=cluster;
    const snapshot=await readState();
    const rows=sourceRows(cluster,snapshot);
    if(!rows.length) return;
    const overlay=ensureOverlay();
    const sheet=qs('.callyOverlapWorkbenchSheet',overlay);
    model={overlay,sheet,rows,query:'',zoom:1,page:0,pageSize:160,activeId:cluster.dataset.callyActiveEvent||rows[0].id};
    renderShell();
    overlay.classList.add('open');
  }

  document.addEventListener('click',event=>{
    const deep=event.target.closest?.('.callyOverlapDeep');
    if(!deep) return;
    const cluster=deep.closest('.callyOverlapCluster');
    if(!cluster) return;
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    void open(cluster);
  },true);

  document.addEventListener('keydown',event=>{
    if(event.key==='Escape'&&qs('#callyOverlapWorkbench.open')) close();
  });
})();
