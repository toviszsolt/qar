import { typeOf } from './typeOf.js';

const isPlainObject = (value) => {
  if (typeOf(value) !== 'object') return false;
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
};

const validateDatabaseLike = (value, path = '') => {
  const type = typeOf(value);

  if (['null', 'undefined', 'string', 'number', 'boolean'].includes(type)) return;

  if (type === 'array') {
    for (let i = 0; i < value.length; i++) {
      validateDatabaseLike(value[i], `${path}/${i}`);
    }
    return;
  }

  if (isPlainObject(value)) {
    for (const key of Object.keys(value)) {
      validateDatabaseLike(value[key], `${path}/${key}`);
    }
    return;
  }

  const constructorName = value.constructor?.name ?? type;
  throw new TypeError(
    `${path || '(root)'}: ${constructorName} not allowed (database-like types only: null, undefined, string, number, boolean, Array, plain Object)`,
  );
};

export { isPlainObject, validateDatabaseLike };
