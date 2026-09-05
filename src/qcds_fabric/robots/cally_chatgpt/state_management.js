/* Cally.One dimension/person state management — Cally.One Tribute License 1.0 */
(() => {
  let managementState = {people:[], entities:[], relations:[], dimension_states:[]};
  let retiredDimensions = new Set();
  let dimensionByKey = new Map();

  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const qs = (selector, root=document) => root.querySelector(selector);
  const qsa = (selector, root=document) => [...root.querySelectorAll(selector)];
  const language = () => (navigator.language || 'en').toLowerCase().startsWith('sv') ? 'sv' : 'en';

  async function readState() {
    const response = await fetch('/api/state');
    const body = await response.json();
    if (!response.ok) throw new Error(body.error || `HTTP ${response.status}`);
    managementState = body;
    if (!Array.isArray(managementState.people)) managementState.people = [];
    if (!Array.isArray(managementState.entities)) managementState.entities = [];
    if (!Array.isArray(managementState.relations)) managementState.relations = [];
    if (!Array.isArray(managementState.dimension_states)) managementState.dimension_states = [];
    retiredDimensions = new Set(managementState.dimension_states.filter(item => item.status !== 'active' || item.hidden).map(item => item.key));
    dimensionByKey = new Map(managementState.dimension_states.map(item => [item.key, item]));
    installDimensionSemantics();
    return managementState;
  }

  async function post(path, payload) {
    const response = await fetch(path, {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(payload)});
    const body = await response.json();
    if (!response.ok) throw new Error(body.error || `HTTP ${response.status}`);
    if (body.state) managementState = body.state;
    await readState();
    return body;
  }

  function installDimensionSemantics() {
    if (typeof window.dimensionKeys === 'function' && !window.dimensionKeys.__callyStateDimensions) {
      const original = window.dimensionKeys;
      const wrapped = function(...args) {
        return original.apply(this,args).filter(key => !retiredDimensions.has(String(key)));
      };
      wrapped.__callyStateDimensions = true;
      window.dimensionKeys = wrapped;
    }
    if (typeof window.dimLabel === 'function' && !window.dimLabel.__callyStateDimensions) {
      const original = window.dimLabel;
      const wrapped = function(key) {
        const item = dimensionByKey.get(String(key));
        const labels = item?.labels || {};
        return labels[language()] || labels.en || labels.sv || item?.label || original.call(this,key);
      };
      wrapped.__callyStateDimensions = true;
      window.dimLabel = wrapped;
    }
    if (typeof window.resolveDimension === 'function' && !window.resolveDimension.__callyStateDimensions) {
      const original = window.resolveDimension;
      const wrapped = function(raw) {
        const value = String(raw || '').trim().toLowerCase();
        for (const item of managementState.dimension_states || []) {
          const names = [item.key,item.label,...Object.values(item.labels || {}),...(item.aliases || [])].map(x => String(x || '').trim().toLowerCase());
          if (names.includes(value)) return item.key;
        }
        return original.call(this,raw);
      };
      wrapped.__callyStateDimensions = true;
      window.resolveDimension = wrapped;
    }
  }

  function overlay() {
    let element = qs('#callyManagementOverlay');
    if (element) return element;
    element = document.createElement('div');
    element.id = 'callyManagementOverlay';
    element.className = 'manageOverlay';
    element.innerHTML = '<div class="manageSheet"><div id="callyManagementBody"></div></div>';
    element.addEventListener('click', event => { if (event.target === element) closeOverlay(); });
    document.body.appendChild(element);
    return element;
  }

  function showOverlay(html) {
    const element = overlay();
    qs('#callyManagementBody', element).innerHTML = html;
    element.classList.add('open');
    qs('[data-manage-close]', element)?.addEventListener('click', closeOverlay);
    return element;
  }

  function closeOverlay() {
    qs('#callyManagementOverlay')?.classList.remove('open');
  }

  function dimensionLabel(item) {
    const labels = item.labels || {};
    return labels[language()] || labels.sv || labels.en || item.label || item.key;
  }

  function dimensionKindText(item) {
    const kind = item.value_kind || 'scalar';
    if (kind === 'entity:person') return 'Rich person states';
    if (kind.startsWith('entity:')) return `Rich ${kind.slice(7)} states`;
    if (kind === 'event') return 'Rich event states';
    if (kind.startsWith('temporal:')) return 'Temporal state';
    return 'State values';
  }

  function renderDimensions() {
    const host = qs('#dimensionManagerList');
    if (!host) return;
    const query = (qs('#dimensionManagerSearch')?.value || '').trim().toLowerCase();
    const showRetired = !!qs('#showRetiredDimensions')?.checked;
    const items = (managementState.dimension_states || []).filter(item => {
      if (!showRetired && item.status !== 'active') return false;
      const hay = `${item.key} ${item.label} ${JSON.stringify(item.labels || {})} ${(item.aliases || []).join(' ')}`.toLowerCase();
      return !query || hay.includes(query);
    });
    host.innerHTML = items.length ? items.map(item => `
      <div class="dimensionStateCard ${item.status !== 'active' ? 'retired' : ''}" data-dimension-card="${esc(item.key)}">
        <div class="dimensionStateMain">
          <div class="dimensionStateTop"><b>${esc(dimensionLabel(item))}</b>${item.preferred ? '<span class="stateBadge">common</span>' : ''}${item.rich_editor ? '<span class="stateBadge strong">rich</span>' : ''}${item.status !== 'active' ? '<span class="stateBadge muted">retired</span>' : ''}</div>
          <div class="dimensionStateKey">${esc(item.key)} · ${esc(dimensionKindText(item))} · ${esc(item.usage)} states</div>
          ${(item.aliases || []).length ? `<div class="dimensionAliases">Aliases: ${esc(item.aliases.join(', '))}</div>` : ''}
        </div>
        <div class="dimensionStateActions">
          ${item.key === 'person' ? '<button data-manage-people>People</button>' : ''}
          <button data-edit-dimension="${esc(item.key)}">✎</button>
          <button data-retire-dimension="${esc(item.key)}">${item.status === 'active' ? 'Remove' : 'Restore'}</button>
        </div>
      </div>`).join('') : '<div class="manageEmpty">No matching dimensions.</div>';

    qsa('[data-edit-dimension]', host).forEach(button => button.onclick = () => openDimensionEditor(button.dataset.editDimension));
    qsa('[data-retire-dimension]', host).forEach(button => button.onclick = async () => {
      const item = dimensionByKey.get(button.dataset.retireDimension);
      if (!item) return;
      try {
        await post('/api/dimension/retire', {key:item.key, retired:item.status === 'active'});
        renderDimensions();
        window.render?.();
        window.toast?.(item.status === 'active' ? 'Dimension removed from active views; existing state preserved' : 'Dimension restored');
      } catch (error) { window.toast?.(error.message || String(error)); }
    });
    qs('[data-manage-people]', host)?.addEventListener('click', openPeopleManager);
  }

  async function openDimensionManager() {
    await readState();
    const element = showOverlay(`
      <div class="manageHead"><div><div class="manageEyebrow">CALENDAR SPACE</div><h2>Dimensions are states</h2><p>Change labels and aliases freely. “Remove” retires a dimension from active projections; it does not destroy historical state.</p></div><button data-manage-close>×</button></div>
      <div class="manageToolbar"><input id="dimensionManagerSearch" placeholder="Search dimensions…"><label class="manageCheck"><input type="checkbox" id="showRetiredDimensions"> Show retired</label><button class="managePrimary" id="addDimensionState">+ Dimension</button></div>
      <div id="dimensionManagerList" class="dimensionManagerList"></div>`);
    qs('#dimensionManagerSearch', element).addEventListener('input', renderDimensions);
    qs('#showRetiredDimensions', element).addEventListener('change', renderDimensions);
    qs('#addDimensionState', element).onclick = () => openDimensionEditor(null);
    renderDimensions();
  }

  async function openDimensionEditor(key) {
    await readState();
    const item = key ? dimensionByKey.get(key) : null;
    const labels = item?.labels || {};
    const valueKinds = ['scalar','entity:person','entity:organization','entity:resource','entity:thing','event','temporal:day','language-state'];
    const element = showOverlay(`
      <div class="manageHead"><div><div class="manageEyebrow">DIMENSION STATE</div><h2>${item ? 'Edit dimension' : 'New dimension'}</h2><p>The canonical key is identity. Labels and aliases are language/state representations around that identity.</p></div><button data-manage-close>×</button></div>
      <div class="manageForm">
        <label>Canonical key<input id="dimKey" value="${esc(item?.key || '')}" ${item ? 'readonly' : ''} placeholder="e.g. equipment_status"></label>
        <div class="manageTwo"><label>Svenska<input id="dimSv" value="${esc(labels.sv || item?.label || '')}"></label><label>English<input id="dimEn" value="${esc(labels.en || '')}"></label></div>
        <label>Aliases<input id="dimAliases" value="${esc((item?.aliases || []).join(', '))}" placeholder="Comma separated"></label>
        <label>State/value semantics<select id="dimValueKind">${valueKinds.map(kind => `<option value="${kind}" ${item?.value_kind === kind ? 'selected' : ''}>${kind}</option>`).join('')}</select></label>
        <label class="manageCheck"><input id="dimPreferred" type="checkbox" ${item?.preferred ? 'checked' : ''}> Suggest this dimension frequently</label>
        ${item?.rich_editor ? '<div class="manageNotice">This is a rich state dimension: its values have their own properties and relations.</div>' : ''}
        <button id="saveDimensionState" class="managePrimary">Save dimension state</button>
      </div>`);
    qs('#saveDimensionState', element).onclick = async () => {
      try {
        const canonical = qs('#dimKey').value.trim();
        if (!canonical) return;
        const sv = qs('#dimSv').value.trim();
        const en = qs('#dimEn').value.trim();
        const aliases = qs('#dimAliases').value.split(',').map(x => x.trim()).filter(Boolean);
        await post('/api/dimension', {
          key:canonical,
          label:sv || en || canonical,
          labels:{sv:sv || en || canonical,en:en || sv || canonical},
          aliases,
          value_kind:qs('#dimValueKind').value,
          preferred:!!qs('#dimPreferred').checked,
          rich_editor:item?.rich_editor || qs('#dimValueKind').value.startsWith('entity:') || qs('#dimValueKind').value === 'event',
          system:item?.system || false,
        });
        await openDimensionManager();
        window.render?.();
        window.toast?.('Dimension state saved');
      } catch (error) { window.toast?.(error.message || String(error)); }
    };
  }

  function personEntity(personId) {
    return (managementState.entities || []).find(item => item.entity_id === personId && item.kind === 'person') || null;
  }

  function membership(personId) {
    return (managementState.relations || []).find(item => item.subject_id === personId && item.predicate === 'member_of') || null;
  }

  function orgLabel(orgId) {
    return (managementState.entities || []).find(item => item.entity_id === orgId)?.label || '';
  }

  function personIsArchived(person) {
    return !!person?.dimensions?.archived || person?.dimensions?.status === 'archived';
  }

  function renderPeopleManager() {
    const host = qs('#peopleManagerList');
    if (!host) return;
    const query = (qs('#peopleManagerSearch')?.value || '').trim().toLowerCase();
    const people = (managementState.people || []).filter(person => {
      const member = membership(person.person_id);
      const hay = `${person.name} ${orgLabel(member?.object_id)} ${member?.dimensions?.role || ''} ${member?.dimensions?.team || ''} ${JSON.stringify(person.dimensions || {})}`.toLowerCase();
      return !query || hay.includes(query);
    }).sort((a,b) => a.name.localeCompare(b.name));
    host.innerHTML = people.length ? people.map(person => {
      const member = membership(person.person_id);
      const archived = personIsArchived(person);
      return `<div class="personStateCard ${archived ? 'retired' : ''}">
        <div><div class="personStateTitle"><b>${esc(person.name)}</b>${archived ? '<span class="stateBadge muted">archived</span>' : ''}</div><div class="personStateMeta">${esc(orgLabel(member?.object_id) || 'No organization')}${member?.dimensions?.team ? ` · ${esc(member.dimensions.team)}` : ''}${member?.dimensions?.role ? ` · ${esc(member.dimensions.role)}` : ''}</div></div>
        <div class="personStateActions"><button data-edit-person="${esc(person.person_id)}">✎</button><button data-archive-person="${esc(person.person_id)}">${archived ? 'Restore' : 'Archive'}</button></div>
      </div>`;
    }).join('') : '<div class="manageEmpty">No matching people.</div>';
    qsa('[data-edit-person]', host).forEach(button => button.onclick = () => openPersonEditor(button.dataset.editPerson));
    qsa('[data-archive-person]', host).forEach(button => button.onclick = async () => {
      const person = (managementState.people || []).find(item => item.person_id === button.dataset.archivePerson);
      if (!person) return;
      try {
        await post('/api/person/archive', {person_id:person.person_id, archived:!personIsArchived(person)});
        renderPeopleManager();
        window.render?.();
        window.toast?.(personIsArchived(person) ? 'Person restored' : 'Person archived; historical state preserved');
      } catch (error) { window.toast?.(error.message || String(error)); }
    });
  }

  async function openPeopleManager() {
    await readState();
    const element = showOverlay(`
      <div class="manageHead"><div><div class="manageEyebrow">PERSON DIMENSION</div><h2>People</h2><p>Person is a rich state dimension. Each person can carry properties and relations such as organization, team, role, language and arbitrary future dimensions.</p></div><button data-manage-close>×</button></div>
      <div class="manageToolbar"><input id="peopleManagerSearch" placeholder="Search people, organization, team…"><button class="managePrimary" id="addManagedPerson">+ Person</button></div>
      <div id="peopleManagerList" class="peopleManagerList"></div>`);
    qs('#peopleManagerSearch', element).addEventListener('input', renderPeopleManager);
    qs('#addManagedPerson', element).onclick = () => openPersonEditor(null);
    renderPeopleManager();
  }

  function appendPersonDimensionRow(host, key='', value='') {
    const row = document.createElement('div');
    row.className = 'manageDimRow';
    row.innerHTML = `<input class="managePersonDimKey" placeholder="Dimension" value="${esc(key)}"><input class="managePersonDimValue" placeholder="State" value="${esc(value)}"><button type="button">×</button>`;
    qs('button', row).onclick = () => row.remove();
    host.appendChild(row);
  }

  async function openPersonEditor(personId) {
    await readState();
    const person = personId ? (managementState.people || []).find(item => item.person_id === personId) : null;
    const member = person ? membership(person.person_id) : null;
    const organizations = (managementState.entities || []).filter(item => item.kind === 'organization').sort((a,b) => a.label.localeCompare(b.label));
    const element = showOverlay(`
      <div class="manageHead"><div><div class="manageEyebrow">PERSON STATE</div><h2>${person ? 'Edit person' : 'Add person'}</h2><p>Rich handling, same ontology: the person and every property/relation are states in Calendar Space.</p></div><button data-manage-close>×</button></div>
      <div class="manageForm">
        <label>Name<input id="managePersonName" value="${esc(person?.name || '')}" autofocus></label>
        <label>Organization<input id="managePersonOrg" list="managePersonOrgList" value="${esc(orgLabel(member?.object_id))}" placeholder="None / existing / new"><datalist id="managePersonOrgList">${organizations.map(item => `<option value="${esc(item.label)}"></option>`).join('')}</datalist></label>
        <div class="manageTwo"><label>Role<input id="managePersonRole" value="${esc(member?.dimensions?.role || '')}"></label><label>Team / group<input id="managePersonTeam" value="${esc(member?.dimensions?.team || '')}"></label></div>
        <div><div class="manageFieldLabel">Additional person state dimensions</div><div id="managePersonDims"></div><button type="button" class="manageSecondary" id="addManagedPersonDim">+ Dimension</button></div>
        <button class="managePrimary" id="saveManagedPerson">Save person state</button>
      </div>`);
    const dimHost = qs('#managePersonDims', element);
    Object.entries(person?.dimensions || {}).filter(([key]) => !['archived','status'].includes(key)).forEach(([key,value]) => appendPersonDimensionRow(dimHost,key,typeof value === 'object' ? JSON.stringify(value) : value));
    qs('#addManagedPersonDim', element).onclick = () => appendPersonDimensionRow(dimHost);
    qs('#saveManagedPerson', element).onclick = async () => {
      try {
        const name = qs('#managePersonName').value.trim();
        if (!name) return;
        let orgName = qs('#managePersonOrg').value.trim();
        let org = organizations.find(item => item.label.toLowerCase() === orgName.toLowerCase());
        if (orgName && !org) {
          const created = await post('/api/entity', {kind:'organization', label:orgName, dimensions:{}});
          org = created.entity;
        }
        const dimensions = {};
        qsa('.manageDimRow', dimHost).forEach(row => {
          const key = qs('.managePersonDimKey', row).value.trim();
          const value = qs('.managePersonDimValue', row).value.trim();
          if (key && value) dimensions[key] = value;
        });
        if (personIsArchived(person)) {
          dimensions.archived = true;
          dimensions.status = 'archived';
        }
        await post('/api/person', {
          person_id:person?.person_id || undefined,
          name,
          dimensions,
          organization_id:org?.entity_id || '',
          role:qs('#managePersonRole').value.trim(),
          team:qs('#managePersonTeam').value.trim(),
        });
        await openPeopleManager();
        window.load?.();
        window.toast?.('Person state saved');
      } catch (error) { window.toast?.(error.message || String(error)); }
    };
  }

  function enhanceResolveExplanation() {
    const button = qs('#inferBtn');
    if (!button) return;
    button.textContent = 'Resolve with QCDS';
    button.title = 'Evaluate represented alternative states against Calendar Space constraints through the shared QCDS/Syntract core.';
    if (!qs('#qcdsResolveMeaning')) {
      const note = document.createElement('span');
      note.id = 'qcdsResolveMeaning';
      note.className = 'resolveMeaning';
      note.textContent = 'Find coherent represented state across Calendar Space';
      button.insertAdjacentElement('afterend', note);
    }
  }

  function injectDirectoryManagers() {
    const tools = qs('.directoryTools');
    if (!tools || qs('#manageDimensionStates', tools)) return;
    const actions = qs('.stateActions', tools) || tools;
    const dimensions = document.createElement('button');
    dimensions.id = 'manageDimensionStates';
    dimensions.textContent = 'Dimensions';
    dimensions.onclick = openDimensionManager;
    const people = document.createElement('button');
    people.id = 'managePersonStates';
    people.textContent = 'Manage people';
    people.onclick = openPeopleManager;
    actions.appendChild(dimensions);
    actions.appendChild(people);
  }

  function bootManagement() {
    readState().catch(() => {});
    const observer = new MutationObserver(() => {
      injectDirectoryManagers();
      enhanceResolveExplanation();
      installDimensionSemantics();
    });
    observer.observe(document.body, {childList:true, subtree:true});
    injectDirectoryManagers();
    enhanceResolveExplanation();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bootManagement, {once:true});
  else bootManagement();
})();
