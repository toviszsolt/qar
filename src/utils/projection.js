import { evaluateCondition } from './applyQuery.js';
import { objValueResolve } from './object.js';
import { typeOf } from './typeOf.js';

const setByPath = (obj, path, value) => {
  const parts = path.split('.');
  const last = parts[parts.length - 1];
  const parent = parts.slice(0, -1).reduce((acc, p) => {
    if (acc == null) return acc;
    if (!Object.prototype.hasOwnProperty.call(acc, p) || typeOf(acc[p]) !== 'object') acc[p] = {};
    return acc[p];
  }, obj);
  if (parent != null) parent[last] = value;
};

const getByPath = (obj, path) => {
  const parts = path.split('.');
  return parts.reduce((acc, p) => {
    if (acc == null || !Object.prototype.hasOwnProperty.call(acc, p)) return undefined;
    return acc[p];
  }, obj);
};

const collectArrayFieldConditions = (query, arrayField, acc = []) => {
  if (!query || typeOf(query) !== 'object') return acc;
  if (typeOf(query.$and) === 'array') {
    for (const q of query.$and) collectArrayFieldConditions(q, arrayField, acc);
    return acc;
  }

  for (const key of Object.keys(query)) {
    if (key === '$and' || key === '$or' || key === '$not' || key === '$nor') continue;
    if (
      key === arrayField &&
      query[key] &&
      typeOf(query[key]) === 'object' &&
      Object.prototype.hasOwnProperty.call(query[key], '$elemMatch')
    ) {
      acc.push({ type: 'elemMatch', cond: query[key].$elemMatch });
    }
    if (key.startsWith(arrayField + '.')) {
      const sub = key.slice(arrayField.length + 1);
      acc.push({ type: 'subfield', subfield: sub, cond: query[key] });
    }
  }
  return acc;
};

const makePositionalPredicate = (query, arrayField) => {
  const conds = collectArrayFieldConditions(query, arrayField);
  if (conds.length === 0) return null;
  return (elem) => {
    for (const c of conds) {
      if (c.type === 'elemMatch') {
        if (typeOf(c.cond) !== 'object') return false;
        const keys = Object.keys(c.cond);
        if (keys.length === 0) return false;
        for (const k of keys) {
          const v = objValueResolve(elem, k);
          if (!evaluateCondition(v, c.cond[k])) return false;
        }
      } else if (c.type === 'subfield') {
        const v = objValueResolve(elem, c.subfield);
        if (!evaluateCondition(v, c.cond)) return false;
      }
    }
    return true;
  };
};

const elementMatchesCondition = (elem, cond) => {
  if (!cond || typeOf(cond) !== 'object') return false;
  const keys = Object.keys(cond);
  if (keys.length === 0) return false;
  for (const k of keys) {
    const v = objValueResolve(elem, k);
    if (!evaluateCondition(v, cond[k])) return false;
  }
  return true;
};

const projectItem = (item = {}, projection, query = null) => {
  if (!projection || typeOf(projection) !== 'object') return { ...item };

  const keys = Object.keys(projection);
  const hasExclude = keys.some((k) => projection[k] === 0);
  const hasInclude = keys.some((k) => {
    const v = projection[k];
    if (v === 1) return true;
    if (typeOf(v) === 'object') {
      return Object.prototype.hasOwnProperty.call(v, '$slice') || Object.prototype.hasOwnProperty.call(v, '$elemMatch');
    }
    return false;
  });

  const mode = hasInclude ? 'include' : hasExclude ? 'exclude' : 'exclude';
  const result = {};

  if (mode === 'include') {
    for (const key of keys) {
      if (key === '_id' && projection._id === 0) continue;

      const spec = projection[key];

      if (key.endsWith('.$')) {
        const arrayField = key.slice(0, -2);
        const arr = getByPath(item, arrayField);
        if (typeOf(arr) === 'array') {
          const pred = makePositionalPredicate(query, arrayField);
          if (pred) {
            const found = arr.find((el) => pred(el));
            if (found !== undefined) setByPath(result, arrayField, [found]);
          }
        }
        continue;
      }

      if (spec === 1) {
        const v = getByPath(item, key);
        if (v !== undefined) setByPath(result, key, v);
      } else if (typeOf(spec) === 'object' && Object.prototype.hasOwnProperty.call(spec, '$elemMatch')) {
        const arr = getByPath(item, key);
        if (typeOf(arr) === 'array') {
          const found = arr.find((el) => elementMatchesCondition(el, spec.$elemMatch));
          if (found !== undefined) setByPath(result, key, [found]);
        }
      } else if (typeOf(spec) === 'object' && Object.prototype.hasOwnProperty.call(spec, '$slice')) {
        const v = getByPath(item, key);
        if (v !== undefined) {
          const n = spec.$slice;
          const sliced =
            typeOf(v) === 'array' ? (typeOf(n) !== 'number' || n === 0 ? [] : n > 0 ? v.slice(0, n) : v.slice(n)) : v;
          setByPath(result, key, sliced);
        }
      }
    }

    if (projection._id !== 0 && Object.prototype.hasOwnProperty.call(item, '_id')) result._id = item._id;
    return result;
  }

  for (const key of Object.keys(item)) result[key] = item[key];

  for (const key of keys) {
    const spec = projection[key];
    if (spec === 0) {
      const parts = key.split('.');
      if (parts.length === 1) delete result[key];
      else {
        const last = parts.pop();
        const parentPath = parts.join('.');
        const parent = getByPath(result, parentPath);
        if (parent && Object.prototype.hasOwnProperty.call(parent, last)) delete parent[last];
      }
    }
  }
  return result;
};

const projectCollection = (items = [], projection, query = null) => {
  if (typeOf(items) !== 'array') return items;
  if (!projection || typeOf(projection) !== 'object') return items.map((it) => ({ ...it }));
  return items.map((it) => projectItem(it, projection, query));
};

export { getByPath, projectCollection, projectItem, setByPath };
