import { applyQuery } from './applyQuery.js';
import { evaluateExpression } from './expressions.js';
import { objClone, objValueResolve } from './object.js';
import { typeOf } from './typeOf.js';

const unwindStage = (docs, spec) => {
  const getPath = (source) => {
    if (typeOf(source) === 'string') return { path: source, preserveNull: false };
    if (typeOf(source) === 'object')
      return { path: source.path || source.$path || source.field, preserveNull: !!source.preserveNullAndEmptyArrays };
    return { path: undefined, preserveNull: false };
  };

  const { path: rawPath, preserveNull } = getPath(spec);

  if (!rawPath) return docs;

  const path = rawPath.startsWith('$') ? rawPath.slice(1) : rawPath;
  const out = [];

  for (const doc of docs) {
    const arr = objValueResolve(doc == null ? {} : doc, path);
    if (typeOf(arr) !== 'array') {
      if (preserveNull) {
        const copy = objClone(doc);
        const parts = path.split('.');
        const parent = getParentForPath(copy, parts);
        if (parent != null) parent[parts[parts.length - 1]] = null;
        out.push(copy);
      }
      continue;
    }
    for (const el of arr) {
      const copy = objClone(doc);
      const parts = path.split('.');
      const parent = getParentForPath(copy, parts);
      if (parent != null) parent[parts[parts.length - 1]] = el;
      out.push(copy);
    }
  }
  return out;
};

const getParentForPath = (root, parts) => {
  let acc = root;
  for (const part of parts.slice(0, -1)) {
    if (acc == null) return acc;
    if (!Object.prototype.hasOwnProperty.call(acc, part) || typeOf(acc[part]) !== 'object') acc[part] = {};
    acc = acc[part];
  }
  return acc;
};

const initializeGroupAccumulator = (idValue, spec) => {
  const init = { _id: idValue };
  for (const [outField, expr] of Object.entries(spec)) {
    if (outField === '_id') continue;
    const op = Object.keys(expr)[0];
    if (op === '$sum') init[outField] = 0;
    else if (op === '$push') init[outField] = [];
    else if (op === '$avg') init[outField] = { sum: 0, cnt: 0 };
    else if (op === '$max') init[outField] = undefined;
    else if (op === '$min') init[outField] = undefined;
    else if (op === '$first') init[outField] = undefined;
    else if (op === '$last') init[outField] = undefined;
    else init[outField] = null;
  }
  return init;
};

const getValueFromSpec = (doc, valSpec) => {
  if (typeOf(valSpec) === 'number') return valSpec;
  if (typeOf(valSpec) === 'string' && valSpec.startsWith('$')) return objValueResolve(doc, valSpec.slice(1));
  return evaluateExpression(valSpec, doc);
};

const updateGroupAccumulator = (groupAccumulator, doc, spec) => {
  for (const [outField, expr] of Object.entries(spec)) {
    if (outField === '_id') continue;
    const op = Object.keys(expr)[0];
    const valSpec = expr[op];
    if (op === '$sum') {
      const v = getValueFromSpec(doc, valSpec);
      groupAccumulator[outField] = (groupAccumulator[outField] || 0) + (Number(v) || 0);
    } else if (op === '$push') {
      const v = getValueFromSpec(doc, valSpec);
      groupAccumulator[outField].push(v);
    } else if (op === '$avg') {
      const v = getValueFromSpec(doc, valSpec);
      const num = Number(v);
      if (!Number.isNaN(num)) {
        groupAccumulator[outField].sum += num;
        groupAccumulator[outField].cnt += 1;
      }
    } else if (op === '$max') {
      const v = getValueFromSpec(doc, valSpec);
      if (groupAccumulator[outField] === undefined || v > groupAccumulator[outField]) groupAccumulator[outField] = v;
    } else if (op === '$min') {
      const v = getValueFromSpec(doc, valSpec);
      if (groupAccumulator[outField] === undefined || v < groupAccumulator[outField]) groupAccumulator[outField] = v;
    } else if (op === '$first') {
      if (groupAccumulator[outField] === undefined) {
        const v = getValueFromSpec(doc, valSpec);
        groupAccumulator[outField] = v;
      }
    } else if (op === '$last') {
      const v = getValueFromSpec(doc, valSpec);
      groupAccumulator[outField] = v;
    }
  }
};

const finalizeGroupResults = (groups, spec) => {
  const out = [];
  for (const groupValue of groups.values()) {
    for (const [k, val] of Object.entries(groupValue)) {
      const specItem = spec[k];
      if (!specItem) continue;
      const op = Object.keys(specItem)[0];
      if (op === '$avg') {
        groupValue[k] = val.cnt === 0 ? null : val.sum / val.cnt;
      }
    }
    out.push(groupValue);
  }
  return out;
};

const groupStage = (docs, spec) => {
  const groups = new Map();
  for (const d of docs) {
    const idValue =
      spec._id === null
        ? null
        : typeOf(spec._id) === 'string' && spec._id.startsWith('$')
          ? objValueResolve(d, spec._id.slice(1))
          : typeOf(spec._id) === 'object'
            ? evaluateExpression(spec._id, d)
            : spec._id;

    const keyStr = typeOf(idValue) === 'object' ? JSON.stringify(idValue) : String(idValue);
    if (!groups.has(keyStr)) {
      groups.set(keyStr, initializeGroupAccumulator(idValue, spec));
    }
    const groupAccumulator = groups.get(keyStr);
    updateGroupAccumulator(groupAccumulator, d, spec);
  }
  return finalizeGroupResults(groups, spec);
};

const sortStage = (docs, spec) => {
  if (typeOf(spec) !== 'object') return docs;
  const keys = Object.keys(spec);
  return docs.slice().sort((a, b) => {
    for (const k of keys) {
      const dir = spec[k] === -1 ? -1 : 1;
      const va = objValueResolve(a, k);
      const vb = objValueResolve(b, k);
      if (va == null && vb == null) continue;
      if (va == null) return -1 * dir;
      if (vb == null) return 1 * dir;
      if (va < vb) return -1 * dir;
      if (va > vb) return 1 * dir;
    }
    return 0;
  });
};

const projectStage = (docs, spec) => {
  return docs.map((d) => {
    if (typeOf(spec) !== 'object') return { ...d };
    const hasInclude = Object.keys(spec).some((k) => spec[k] === 1);
    const out = {};
    if (hasInclude) {
      for (const [k, v] of Object.entries(spec)) {
        if (v === 1) {
          const val = objValueResolve(d, k);
          if (val !== undefined) out[k] = val;
        } else if (typeOf(v) === 'string' && v.startsWith('$')) {
          out[k] = objValueResolve(d, v.slice(1));
        } else if (typeOf(v) === 'object') {
          out[k] = evaluateExpression(v, d);
        }
      }
      return out;
    }
    for (const key of Object.keys(d)) out[key] = d[key];
    for (const [k, v] of Object.entries(spec)) {
      if (v === 0) delete out[k];
      else if (typeOf(v) === 'string' && v.startsWith('$')) {
        out[k] = objValueResolve(d, v.slice(1));
      } else if (typeOf(v) === 'object') out[k] = evaluateExpression(v, d);
    }
    return out;
  });
};

const limitStage = (docs, n) => {
  const normalizedLimit = Math.max(0, parseInt(String(n), 10) || 0);
  return docs.slice(0, normalizedLimit);
};

const aggregate = (docs = [], pipeline = []) => {
  const initial = typeOf(docs) === 'array' ? docs.slice() : [];
  return pipeline.reduce((cur, stage) => {
    const key = Object.keys(stage)[0];
    const spec = stage[key];
    if (key === '$match') return applyQuery(cur, spec);
    if (key === '$unwind') return unwindStage(cur, spec);
    if (key === '$group') return groupStage(cur, spec);
    if (key === '$sort') return sortStage(cur, spec);
    if (key === '$project') return projectStage(cur, spec);
    if (key === '$limit') return limitStage(cur, spec);
    return cur;
  }, initial);
};

export { aggregate, getParentForPath };
