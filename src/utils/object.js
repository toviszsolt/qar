import { typeOf } from './typeOf.js';

const isSafeKey = (key) => {
  return key !== '__proto__' && key !== 'constructor' && key !== 'prototype';
};

const objValueResolve = (obj = {}, key = '') => {
  if (key.includes('.')) return objPathResolve(obj, key);
  return obj[key];
};

const objPathResolve = (obj = {}, path = '') => {
  if (!path) return obj;

  obj = obj || {};

  const properties = path.split('.');
  const result = properties.reduce((cur, prop) => {
    if (cur == null) return undefined;
    return cur[prop];
  }, obj);

  return result;
};

const getByPath = (obj, path) => {
  const parts = path.split('.');
  return parts.reduce((acc, p) => {
    if (acc == null || !Object.prototype.hasOwnProperty.call(acc, p)) return undefined;
    return acc[p];
  }, obj);
};

const setByPath = (obj, path, value, strict = false) => {
  const parts = path.split('.');
  const last = parts.pop();
  if (!isSafeKey(last)) return;
  let cur = obj;

  for (const part of parts) {
    if (!isSafeKey(part)) {
      if (strict) return;
      cur = obj;
      break;
    }
    if (cur == null) return;
    if (cur[part] == null || typeOf(cur[part]) !== 'object') cur[part] = {};
    cur = cur[part];
  }

  if (cur != null) cur[last] = value;
};

const getParentForPath = (root, parts) => {
  let acc = root;
  for (const part of parts.slice(0, -1)) {
    if (acc == null) return acc;
    if (!isSafeKey(part)) return acc;
    if (!Object.prototype.hasOwnProperty.call(acc, part) || typeOf(acc[part]) !== 'object') acc[part] = {};
    acc = acc[part];
  }
  return acc;
};

const sortDocuments = (docs, spec) => {
  if (!spec || typeOf(docs) !== 'array') return docs;
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

const objClone = (obj) => {
  if (obj == null) {
    return obj;
  }

  if (typeOf(obj) === 'array') {
    return obj.map((el) => objClone(el));
  }

  if (isPlainObject(obj)) {
    const clone = {};
    const keys = Object.keys(obj);
    for (let i = 0; i < keys.length; i++) {
      const key = keys[i];
      clone[key] = objClone(obj[key]);
    }
    return clone;
  }

  return obj;
};

const isPlainObject = (value) => {
  const type = typeOf(value);
  if (type !== 'object') return false;
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
};

const deepEqual = (a, b) => {
  if (a === b) return true;
  if (a == null || b == null) return a === b;

  const typeA = typeOf(a);
  const typeB = typeOf(b);
  if (typeA !== typeB) return false;

  if (typeA === 'array') {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (!deepEqual(a[i], b[i])) return false;
    }
    return true;
  }

  if (typeA === 'object') {
    const keysA = Object.keys(a);
    const keysB = Object.keys(b);
    if (keysA.length !== keysB.length) return false;
    for (const key of keysA) {
      if (!Object.prototype.hasOwnProperty.call(b, key)) return false;
      if (!deepEqual(a[key], b[key])) return false;
    }
    return true;
  }

  if (typeA === 'date') {
    return a.getTime() === b.getTime();
  }

  return false;
};

export { isSafeKey, objClone, objPathResolve, objValueResolve, getByPath, setByPath, getParentForPath, sortDocuments, deepEqual, isPlainObject };
