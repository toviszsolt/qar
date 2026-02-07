import { applyQuery } from './applyQuery.js';
import { evaluateExpression } from './expressions.js';
import { objClone, objValueResolve } from './object.js';
import { typeOf } from './typeOf.js';

const unwindStage = (docs, spec) => {
  const getPath = (s) => {
    if (typeOf(s) === 'string') return { path: s, preserveNull: false };
    if (typeOf(s) === 'object')
      return { path: s.path || s.$path || s.field, preserveNull: !!s.preserveNullAndEmptyArrays };
    return { path: undefined, preserveNull: false };
  };

  const { path: rawPath, preserveNull } = getPath(spec);
  if (!rawPath) return docs;
  const path = rawPath.startsWith('$') ? rawPath.slice(1) : rawPath;

  const out = [];
  for (const d of docs) {
    const arr = objValueResolve(d == null ? {} : d, path);
    if (typeOf(arr) !== 'array') {
      if (preserveNull) {
        const copy = objClone(d);
        const parts = path.split('.');
        const parent = getParentForPath(copy, parts);
        if (parent != null) parent[parts[parts.length - 1]] = null;
        out.push(copy);
      }
      continue;
    }
    for (const el of arr) {
      const copy = objClone(d);
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
  for (const p of parts.slice(0, -1)) {
    if (acc == null) return acc;
    if (!Object.prototype.hasOwnProperty.call(acc, p) || typeOf(acc[p]) !== 'object') acc[p] = {};
    acc = acc[p];
  }
  return acc;
};

const groupStage = (docs, spec) => {
  const groups = new Map();
  for (const d of docs) {
    // compute id
    const idVal =
      spec._id === null
        ? null
        : typeOf(spec._id) === 'string' && spec._id.startsWith('$')
          ? objValueResolve(d, spec._id.slice(1))
          : typeOf(spec._id) === 'object'
            ? evaluateExpression(spec._id, d)
            : spec._id;

    const keyStr = typeOf(idVal) === 'object' ? JSON.stringify(idVal) : String(idVal);
    if (!groups.has(keyStr)) {
      const init = { _id: idVal };
      // initialize accumulators
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
      groups.set(keyStr, init);
    }
    const acc = groups.get(keyStr);
    for (const [outField, expr] of Object.entries(spec)) {
      if (outField === '_id') continue;
      const op = Object.keys(expr)[0];
      const valSpec = expr[op];
      if (op === '$sum') {
        const v =
          typeOf(valSpec) === 'number'
            ? valSpec
            : typeOf(valSpec) === 'string' && valSpec.startsWith('$')
              ? objValueResolve(d, valSpec.slice(1))
              : evaluateExpression(valSpec, d);
        acc[outField] = (acc[outField] || 0) + (Number(v) || 0);
      } else if (op === '$push') {
        const v =
          typeOf(valSpec) === 'string' && valSpec.startsWith('$')
            ? objValueResolve(d, valSpec.slice(1))
            : evaluateExpression(valSpec, d);
        acc[outField].push(v);
      } else if (op === '$avg') {
        const v =
          typeOf(valSpec) === 'number'
            ? valSpec
            : typeOf(valSpec) === 'string' && valSpec.startsWith('$')
              ? objValueResolve(d, valSpec.slice(1))
              : evaluateExpression(valSpec, d);
        const num = Number(v);
        if (!Number.isNaN(num)) {
          acc[outField].sum += num;
          acc[outField].cnt += 1;
        }
      } else if (op === '$max') {
        const v =
          typeOf(valSpec) === 'string' && valSpec.startsWith('$')
            ? objValueResolve(d, valSpec.slice(1))
            : evaluateExpression(valSpec, d);
        if (acc[outField] === undefined || v > acc[outField]) acc[outField] = v;
      } else if (op === '$min') {
        const v =
          typeOf(valSpec) === 'string' && valSpec.startsWith('$')
            ? objValueResolve(d, valSpec.slice(1))
            : evaluateExpression(valSpec, d);
        if (acc[outField] === undefined || v < acc[outField]) acc[outField] = v;
      } else if (op === '$first') {
        if (acc[outField] === undefined) {
          const v =
            typeOf(valSpec) === 'string' && valSpec.startsWith('$')
              ? objValueResolve(d, valSpec.slice(1))
              : evaluateExpression(valSpec, d);
          acc[outField] = v;
        }
      } else if (op === '$last') {
        const v =
          typeOf(valSpec) === 'string' && valSpec.startsWith('$')
            ? objValueResolve(d, valSpec.slice(1))
            : evaluateExpression(valSpec, d);
        acc[outField] = v;
      }
    }
  }
  // finalize avg
  const out = [];
  for (const v of groups.values()) {
    for (const [k, val] of Object.entries(v)) {
      const specItem = spec[k];
      if (!specItem) continue;
      const op = Object.keys(specItem)[0];
      if (op === '$avg') {
        v[k] = val.cnt === 0 ? null : val.sum / val.cnt;
      }
    }
    out.push(v);
  }
  return out;
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
  // spec values can be 1/0 or expression objects
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
    // exclusion
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
  const nn = Math.max(0, parseInt(n, 10) || 0);
  return docs.slice(0, nn);
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
