/* Transport/state shell. QCDS inference remains in the packaged Python core and is loaded lazily. */
let coreReady = null;
let packageUrl = null;
let callyState = normalizeCallyState(null);

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function normalizeCallyState(value) {
  const state = value && typeof value === 'object' ? clone(value) : {};
  for (const key of ['people', 'events', 'conflicts', 'entities', 'relations', 'dimension_states', 'state_conflicts', 'planning_states']) {
    if (!Array.isArray(state[key])) state[key] = [];
  }
  if (!state.dimensions || typeof state.dimensions !== 'object' || Array.isArray(state.dimensions)) state.dimensions = {};
  if (!state.state_model || typeof state.state_model !== 'object') state.state_model = {};
  if (!state.provenance || typeof state.provenance !== 'object') state.provenance = {};
  state.product = state.product || 'Cally.One';
  state.space_id = state.space_id || 'cally-one';
  return state;
}

function idFor(prefix) {
  if (self.crypto && typeof self.crypto.randomUUID === 'function') return `${prefix}:${self.crypto.randomUUID()}`;
  return `${prefix}:${Date.now()}:${Math.random().toString(36).slice(2)}`;
}

function upsert(items, key, value) {
  const index = items.findIndex(item => item && item[key] === value[key]);
  if (index >= 0) items[index] = {...items[index], ...value};
  else items.push(value);
  return index >= 0 ? items[index] : value;
}

function relationId(subjectId, predicate, objectId) {
  return `${subjectId}|${predicate}|${objectId}`;
}

function resultFor(action, result = null) {
  return {
    product: 'Cally.One',
    logical_robot: true,
    action,
    result,
    state: clone(callyState),
  };
}

function localCallyRun(payload) {
  const action = String((payload && payload.action) || 'state');
  const body = payload && payload.payload && typeof payload.payload === 'object' ? payload.payload : {};

  if (action === 'hydrate') {
    callyState = normalizeCallyState(payload && payload.state);
    return resultFor(action);
  }
  if (action === 'state') return resultFor(action);

  if (action === 'person') {
    const personId = String(body.person_id || body.entity_id || idFor('person'));
    const name = String(body.name || body.label || 'Person');
    const person = upsert(callyState.people, 'person_id', {
      ...body,
      person_id: personId,
      entity_id: String(body.entity_id || personId),
      name,
    });
    const entityId = person.entity_id || personId;
    const existingEntity = callyState.entities.find(item => item.entity_id === entityId) || {};
    upsert(callyState.entities, 'entity_id', {
      ...existingEntity,
      entity_id: entityId,
      kind: 'person',
      label: name,
      dimensions: {
        ...(existingEntity.dimensions || {}),
        ...(body.dimensions || {}),
        ...(body.role ? {role: body.role} : {}),
        ...(body.team ? {team: body.team} : {}),
        archived: Boolean(body.archived),
      },
    });
    callyState.relations = callyState.relations.filter(item => !(item.subject_id === entityId && item.predicate === 'member_of'));
    if (body.organization_id) {
      const objectId = String(body.organization_id);
      callyState.relations.push({
        relation_id: relationId(entityId, 'member_of', objectId),
        subject_id: entityId,
        predicate: 'member_of',
        object_id: objectId,
        dimensions: {...(body.role ? {role: body.role} : {}), ...(body.team ? {team: body.team} : {})},
      });
    }
    return resultFor(action, {person: clone(person)});
  }

  if (action === 'person_archive') {
    const personId = String(body.person_id || '');
    const archived = body.archived !== false;
    const person = callyState.people.find(item => item.person_id === personId || item.entity_id === personId);
    if (!person) throw new Error('person not found');
    person.archived = archived;
    person.dimensions = {...(person.dimensions || {}), archived};
    const entity = callyState.entities.find(item => item.entity_id === (person.entity_id || personId));
    if (entity) entity.dimensions = {...(entity.dimensions || {}), status: archived ? 'archived' : 'active', archived};
    return resultFor(action, {person: clone(person)});
  }

  if (action === 'entity') {
    const entityId = String(body.entity_id || idFor(String(body.kind || 'entity')));
    const entity = upsert(callyState.entities, 'entity_id', {
      ...body,
      entity_id: entityId,
      kind: String(body.kind || 'thing'),
      label: String(body.label || body.name || 'State'),
      dimensions: {...(body.dimensions || {})},
    });
    return resultFor(action, {entity: clone(entity)});
  }

  if (action === 'relation') {
    const subjectId = String(body.subject_id || '');
    const predicate = String(body.predicate || '');
    const objectId = String(body.object_id || '');
    const id = String(body.relation_id || relationId(subjectId, predicate, objectId) || idFor('relation'));
    const relation = upsert(callyState.relations, 'relation_id', {
      ...body,
      relation_id: id,
      subject_id: subjectId,
      predicate,
      object_id: objectId,
      dimensions: {...(body.dimensions || {})},
    });
    return resultFor(action, {relation: clone(relation)});
  }

  if (action === 'dimension') {
    const key = String(body.key || body.dimension_key || '');
    if (!key) throw new Error('dimension key required');
    const dimension = upsert(callyState.dimension_states, 'key', {
      ...body,
      key,
      status: body.retired ? 'retired' : String(body.status || 'active'),
    });
    return resultFor(action, {dimension: clone(dimension)});
  }

  if (action === 'dimension_retire') {
    const key = String(body.key || '');
    const dimension = callyState.dimension_states.find(item => item.key === key);
    if (!dimension) throw new Error('dimension not found');
    dimension.status = body.retired === false ? 'active' : 'retired';
    return resultFor(action, {dimension: clone(dimension)});
  }

  if (action === 'event') {
    const eventId = String(body.event_id || idFor('event'));
    const existing = callyState.events.find(item => item.event_id === eventId) || {};
    const event = upsert(callyState.events, 'event_id', {
      ...existing,
      ...body,
      event_id: eventId,
      people: Array.isArray(body.people) ? body.people.map(String) : (Array.isArray(existing.people) ? existing.people : []),
      constraints: {...(existing.constraints || {}), ...(body.constraints || {})},
    });
    callyState.relations = callyState.relations.filter(item => !(item.subject_id === eventId && item.predicate === 'participant'));
    for (const personId of event.people || []) {
      callyState.relations.push({
        relation_id: relationId(eventId, 'participant', String(personId)),
        subject_id: eventId,
        predicate: 'participant',
        object_id: String(personId),
        dimensions: {state: 'active'},
      });
    }
    return resultFor(action, {event: clone(event), conflicts: [], planning_states: []});
  }

  if (action === 'move') {
    const eventId = String(body.event_id || '');
    const event = callyState.events.find(item => item.event_id === eventId);
    if (!event) throw new Error('event not found');
    if (body.start != null) event.start = String(body.start);
    if (body.end != null) event.end = String(body.end);
    if (Array.isArray(body.people)) event.people = body.people.map(String);
    return resultFor(action, {event: clone(event), conflicts: [], planning_states: []});
  }

  if (action === 'delete') {
    const eventId = String(body.event_id || '');
    callyState.events = callyState.events.filter(item => item.event_id !== eventId);
    callyState.relations = callyState.relations.filter(item => item.subject_id !== eventId && item.object_id !== eventId);
    return resultFor(action, {deleted: eventId});
  }

  throw new Error(`unknown local Cally.One action: ${action}`);
}

async function initializeCore() {
  if (coreReady) return coreReady;
  if (!packageUrl) throw new Error('QCDS package URL has not been initialized.');
  coreReady = (async () => {
    self.__qcds_core_started = true;
    importScripts('https://cdn.jsdelivr.net/pyodide/v0.27.7/full/pyodide.js');
    const pyodide = await loadPyodide();
    const response = await fetch(packageUrl, {cache: 'no-store'});
    if (!response.ok) throw new Error('Could not load qcds_fabric core package: HTTP ' + response.status);
    const archive = new Uint8Array(await response.arrayBuffer());
    pyodide.unpackArchive(archive, 'zip');
    pyodide.runPython("import sys\nif '/' not in sys.path: sys.path.insert(0, '/')\nfrom qcds_fabric.session_sandbox_core import run_session_json\nfrom qcds_fabric.pick_a_world_core import run_pick_world_case_json\nfrom qcds_fabric.robotics_playground_system import run_robotics_playground_json\nfrom qcds_fabric.robots.cally_one.runtime_v3 import run_cally_one_json\nfrom qcds_fabric.robots.legal.sweden_housing.robot import run_case_json as run_swedish_housing_case_json\nfrom qcds_fabric.robots.legal.sweden_housing.quick_question import run_public_question_json as run_swedish_housing_question_json\nfrom qcds_fabric.syntract_parallel_demos import run_syntract_demo_json");
    self.__qcds_pyodide = pyodide;
    return pyodide;
  })();
  return coreReady;
}

function pythonRun(pyodide, payload, expression) {
  pyodide.globals.set('__payload_json', JSON.stringify(payload || {}));
  try {
    return JSON.parse(String(pyodide.runPython(expression)));
  } finally {
    pyodide.globals.delete('__payload_json');
  }
}

async function inferCally(payload) {
  const pyodide = await initializeCore();
  pythonRun(pyodide, {action: 'hydrate', state: callyState}, "run_cally_one_json(__payload_json)");
  const output = pythonRun(pyodide, payload, "run_cally_one_json(__payload_json)");
  if (output && output.state) callyState = normalizeCallyState(output.state);
  return output;
}

self.__qcds_core_started = false;

self.onmessage = async (event) => {
  const msg = event.data || {};
  try {
    if (msg.type === 'init') {
      packageUrl = msg.packageUrl;
      self.postMessage({type: 'ready'});
      return;
    }
    if (msg.type !== 'run' && msg.type !== 'pick_world_run' && msg.type !== 'robotics_playground_run' && msg.type !== 'cally_one_run' && msg.type !== 'legal_run' && msg.type !== 'legal_question_run' && msg.type !== 'syntract_demo_run') return;

    if (msg.type === 'cally_one_run') {
      const action = String((msg.payload && msg.payload.action) || 'state');
      const output = action === 'infer' ? await inferCally(msg.payload || {}) : localCallyRun(msg.payload || {});
      self.postMessage({id: msg.id, result: output});
      return;
    }

    const pyodide = await initializeCore();
    let expression;
    if (msg.type === 'pick_world_run') expression = "run_pick_world_case_json(__payload_json)";
    else if (msg.type === 'robotics_playground_run') expression = "run_robotics_playground_json(__payload_json)";
    else if (msg.type === 'legal_run') expression = "run_swedish_housing_case_json(__payload_json)";
    else if (msg.type === 'legal_question_run') expression = "run_swedish_housing_question_json(__payload_json)";
    else if (msg.type === 'syntract_demo_run') expression = "run_syntract_demo_json(__payload_json)";
    else expression = "run_session_json(__payload_json)";
    self.postMessage({id: msg.id, result: pythonRun(pyodide, msg.payload || {}, expression)});
  } catch (error) {
    self.postMessage({id: msg.id, error: String(error && error.message ? error.message : error)});
  }
};
