import { evaluateExpression } from './expressions.js';
import { objValueResolve } from './object.js';
import { typeOf } from './typeOf.js';

const throwError = (...args) => {
  throw new Error(args.join(' '));
};

const OPERATORS = Object.freeze({
  $eq: (value, expected) => value === expected,

  $ne: (value, expected) => value !== expected,

  $in: (value, list) => {
    if (typeOf(list) !== 'array') return false;
    if (typeOf(value) === 'array') return value.some((v) => list.includes(v));
    return list.includes(value);
  },

  $nin: (value, list) => {
    if (typeOf(list) !== 'array') return false;
    if (typeOf(value) === 'array') return !value.some((v) => list.includes(v));
    return !list.includes(value);
  },

  $exists: (value, shouldExist) => (value !== undefined) === shouldExist,

  $size: (value, size) => typeOf(value) === 'array' && value.length === size,

  $all: (value, items) => {
    if (typeOf(value) !== 'array' || typeOf(items) !== 'array') return false;
    return items.every((item) => value.includes(item));
  },

  $elemMatch: (value, condition) => {
    if (typeOf(value) !== 'array' || typeOf(condition) !== 'object') return false;
    const keys = Object.keys(condition);
    if (keys.length === 0) return false;
    return value.some((item) => {
      if (typeOf(item) !== 'object') return false;
      for (const k of keys) {
        const v = objValueResolve(item, k);
        if (!evaluateCondition(v, condition[k])) return false;
      }
      return true;
    });
  },

  $type: (value, expectedType) => {
    if (typeOf(expectedType) === 'array') return expectedType.some((t) => typeOf(value) === t);
    return typeOf(value) === expectedType;
  },

  $mod: (value, arr) => {
    if (typeOf(value) !== 'number' || typeOf(arr) !== 'array' || arr.length < 2) return false;
    const divisor = arr[0];
    const remainder = arr[1];
    if (typeOf(divisor) !== 'number' || typeOf(remainder) !== 'number') return false;
    return value % divisor === remainder;
  },

  $lt: (value, bound) => {
    if (typeOf(value) === 'date' && typeOf(bound) === 'date') return value.getTime() < bound.getTime();
    if (typeOf(value) !== typeOf(bound)) return false;
    return value < bound;
  },

  $lte: (value, bound) => {
    if (typeOf(value) === 'date' && typeOf(bound) === 'date') return value.getTime() <= bound.getTime();
    if (typeOf(value) !== typeOf(bound)) return false;
    return value <= bound;
  },

  $gt: (value, bound) => {
    if (typeOf(value) === 'date' && typeOf(bound) === 'date') return value.getTime() > bound.getTime();
    if (typeOf(value) !== typeOf(bound)) return false;
    return value > bound;
  },

  $gte: (value, bound) => {
    if (typeOf(value) === 'date' && typeOf(bound) === 'date') return value.getTime() >= bound.getTime();
    if (typeOf(value) !== typeOf(bound)) return false;
    return value >= bound;
  },

  $regex: (value, pattern, opts) => {
    try {
      return new RegExp(pattern, opts).test(String(value));
    } catch (e) {
      throwError('[applyQuery] invalid $regex pattern:', pattern, 'error:', e && e.message);
      return false;
    }
  },
});

const evaluateCondition = (value, condition) => {
  if (typeOf(condition) !== 'object') {
    return value === condition;
  }

  const operatorKeys = Object.keys(condition).filter((k) => Object.prototype.hasOwnProperty.call(OPERATORS, k));

  if (operatorKeys.length === 0) {
    throwError('[applyQuery] no recognized operators in condition:', condition);
    return false;
  }

  return operatorKeys.every((operatorKey) => {
    if (operatorKey === '$regex') {
      return OPERATORS[operatorKey](value, condition[operatorKey], condition.$options);
    } else {
      return OPERATORS[operatorKey](value, condition[operatorKey]);
    }
  });
};

const matches = (el, query) => {
  if (typeOf(query) !== 'object') return false;
  if (typeOf(query.$and) === 'array') return query.$and.every((q) => matches(el, q));
  if (typeOf(query.$or) === 'array') return query.$or.some((q) => matches(el, q));
  if (typeOf(query.$not) === 'object') return !matches(el, query.$not);
  if (typeOf(query.$nor) === 'array') return !query.$nor.some((q) => matches(el, q));
  if (query.$expr !== undefined) return Boolean(evaluateExpression(query.$expr, el));

  for (const key of Object.keys(query)) {
    const condition = query[key];
    const value = objValueResolve(el, key);

    if (
      (key === '$regex' ||
        (typeOf(condition) === 'object' && Object.prototype.hasOwnProperty.call(condition, '$regex'))) &&
      typeOf(value) !== 'string'
    ) {
      throwError('[applyQuery] $regex used on non-string value, skipping match');
      return false;
    }

    if (!evaluateCondition(value, condition)) return false;
  }
  return true;
};

const applyQuery = (collection = [], query, options = {}) => {
  const dataSet = collection || [];

  if (typeOf(query) !== 'object') return dataSet;

  if (query.$and !== undefined && typeOf(query.$and) !== 'array') {
    throwError('[applyQuery] $and should be an array, ignoring as combinator:', query.$and);
  }

  if (query.$or !== undefined && typeOf(query.$or) !== 'array') {
    throwError('[applyQuery] $or should be an array, ignoring as combinator:', query.$or);
  }

  if (query.$nor !== undefined && typeOf(query.$nor) !== 'array') {
    throwError('[applyQuery] $nor should be an array, ignoring as combinator:', query.$nor);
  }

  if (query.$not !== undefined && typeOf(query.$not) !== 'object') {
    throwError('[applyQuery] $not should be an object, ignoring as combinator:', query.$not);
  }

  const indexes = options && options.indexes;

  if (indexes && typeOf(indexes) === 'object') {
    const topLevelKeys = Object.keys(query).filter((k) => !['$and', '$or', '$not', '$nor'].includes(k));

    if (topLevelKeys.length === 1) {
      const key = topLevelKeys[0];
      const condition = query[key];
      const lookupValue =
        typeOf(condition) !== 'object'
          ? condition
          : Object.prototype.hasOwnProperty.call(condition, '$eq')
            ? condition.$eq
            : undefined;

      if (lookupValue !== undefined && indexes[key] instanceof Map) {
        const idx = indexes[key];
        const candidates = idx.get(lookupValue) || [];
        const results = candidates.filter((el) => matches(el, query));
        return results;
      }
    }
  }

  return dataSet.filter((el) => matches(el, query));
};

export { applyQuery, evaluateCondition };
