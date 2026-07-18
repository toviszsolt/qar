import { validateDatabaseLike, isPlainObject } from '../../src/utils/validate.js';

describe('validateDatabaseLike', () => {
  test('allows null and undefined', () => {
    expect(() => validateDatabaseLike(null, '/test')).not.toThrow();
    expect(() => validateDatabaseLike(undefined, '/test')).not.toThrow();
  });

  test('allows primitives', () => {
    expect(() => validateDatabaseLike('string', '/test')).not.toThrow();
    expect(() => validateDatabaseLike(123, '/test')).not.toThrow();
    expect(() => validateDatabaseLike(true, '/test')).not.toThrow();
    expect(() => validateDatabaseLike(false, '/test')).not.toThrow();
    expect(() => validateDatabaseLike(0, '/test')).not.toThrow();
    expect(() => validateDatabaseLike('', '/test')).not.toThrow();
  });

  test('allows arrays (recursive)', () => {
    expect(() => validateDatabaseLike([], '/test')).not.toThrow();
    expect(() => validateDatabaseLike([1, 2, 3], '/test')).not.toThrow();
    expect(() => validateDatabaseLike([{ a: 1 }, [2, 3]], '/test')).not.toThrow();
  });

  test('allows plain objects (recursive)', () => {
    expect(() => validateDatabaseLike({}, '/test')).not.toThrow();
    expect(() => validateDatabaseLike({ a: 1 }, '/test')).not.toThrow();
    expect(() => validateDatabaseLike({ a: { b: [1, 2] } }, '/test')).not.toThrow();
    expect(() => validateDatabaseLike(Object.create(null), '/test')).not.toThrow();
  });

  test('throws on Date', () => {
    expect(() => validateDatabaseLike(new Date(), '/items/0')).toThrow(TypeError);
    expect(() => validateDatabaseLike(new Date(), '/items/0')).toThrow('Date not allowed');
  });

  test('throws on RegExp', () => {
    expect(() => validateDatabaseLike(/abc/, '/items/0')).toThrow('RegExp not allowed');
  });

  test('throws on Map', () => {
    expect(() => validateDatabaseLike(new Map(), '/items/0')).toThrow('Map not allowed');
  });

  test('throws on Set', () => {
    expect(() => validateDatabaseLike(new Set(), '/items/0')).toThrow('Set not allowed');
  });

  test('throws on Function', () => {
    expect(() => validateDatabaseLike(() => {}, '/items/0')).toThrow('Function not allowed');
  });

  test('throws on Symbol', () => {
    expect(() => validateDatabaseLike(Symbol('x'), '/items/0')).toThrow('Symbol not allowed');
  });

  test('throws on class instance', () => {
    class Custom {}
    expect(() => validateDatabaseLike(new Custom(), '/items/0')).toThrow('Custom not allowed');
  });

  test('throws on Promise', () => {
    expect(() => validateDatabaseLike(Promise.resolve(), '/items/0')).toThrow('Promise not allowed');
  });

  test('error message includes path', () => {
    expect(() => validateDatabaseLike(new Date(), '/users/3/createdAt'))
      .toThrow('/users/3/createdAt: Date not allowed');
  });

  test('error message for root', () => {
    expect(() => validateDatabaseLike(new Date(), ''))
      .toThrow('(root): Date not allowed');
  });

  test('handles object without constructor', () => {
    const obj = Object.create(null);
    obj.date = new Date();
    expect(() => validateDatabaseLike(obj, '/items/0'))
      .toThrow('/items/0/date: Date not allowed');
  });

  test('function without name triggers fallback', () => {
    const anonFn = function() {};
    expect(() => validateDatabaseLike(anonFn, '/items/0'))
      .toThrow('/items/0: Function not allowed');
  });

  test('throws on object with no constructor (edge case)', () => {
    // Non-plain object with undefined constructor
    const obj = Object.create(Date.prototype);
    Object.defineProperty(obj, 'constructor', { value: undefined, configurable: true });
    expect(() => validateDatabaseLike(obj, '/items/0'))
      .toThrow('/items/0: date not allowed');
  });
});

describe('isPlainObject', () => {
  test('returns true for plain objects', () => {
    expect(isPlainObject({})).toBe(true);
    expect(isPlainObject({ a: 1 })).toBe(true);
    expect(isPlainObject(Object.create(null))).toBe(true);
  });

  test('returns false for null/undefined', () => {
    expect(isPlainObject(null)).toBe(false);
    expect(isPlainObject(undefined)).toBe(false);
  });

  test('returns false for arrays', () => {
    expect(isPlainObject([])).toBe(false);
    expect(isPlainObject([1, 2])).toBe(false);
  });

  test('returns false for primitives', () => {
    expect(isPlainObject('str')).toBe(false);
    expect(isPlainObject(123)).toBe(false);
    expect(isPlainObject(true)).toBe(false);
  });

  test('returns false for Date, RegExp, Map, Set', () => {
    expect(isPlainObject(new Date())).toBe(false);
    expect(isPlainObject(/abc/)).toBe(false);
    expect(isPlainObject(new Map())).toBe(false);
    expect(isPlainObject(new Set())).toBe(false);
  });

  test('returns false for class instances', () => {
    class Custom {}
    expect(isPlainObject(new Custom())).toBe(false);
  });

  test('returns false for Function', () => {
    expect(isPlainObject(() => {})).toBe(false);
  });
});