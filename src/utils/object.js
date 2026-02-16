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
  if (obj == null) {
    return obj;
  }

  if (obj instanceof Date) {
    return new Date(obj.getTime());
  }

  if (obj instanceof RegExp) {
    return new RegExp(obj);
  }

  if (obj instanceof Map) {
    const objectMap = new Map();
    for (const [k, v] of obj.entries()) objectMap.set(k, objClone(v));
    return objectMap;
  }

  if (obj instanceof Set) {
    const objectSet = new Set();
    for (const v of obj.values()) objectSet.add(objClone(v));
    return objectSet;
  }

  if (typeOf(obj) === 'array') {
    return obj.map((el) => objClone(el));
  }

  if (typeOf(obj) === 'object') {
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

export { objClone, objPathResolve, objValueResolve };
