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

import { typeOf } from './typeOf.js';

const objClone = (obj) => {
  if (obj == null) return obj;
  if (obj instanceof Date) return new Date(obj.getTime());
  if (obj instanceof RegExp) return new RegExp(obj);
  if (obj instanceof Map) {
    const m = new Map();
    for (const [k, v] of obj.entries()) m.set(k, objClone(v));
    return m;
  }

  if (obj instanceof Set) {
    const s = new Set();
    for (const v of obj.values()) s.add(objClone(v));
    return s;
  }

  if (typeOf(obj) === 'array') {
    return obj.map((el) => objClone(el));
  }

  if (typeOf(obj) === 'object') {
    const clone = {};
    const keys = Object.keys(obj);
    for (let i = 0; i < keys.length; i++) {
      clone[keys[i]] = objClone(obj[keys[i]]);
    }
    return clone;
  }

  return obj;
};

export { objClone, objPathResolve, objValueResolve };
