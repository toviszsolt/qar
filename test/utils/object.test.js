import {
  getByPath,
  getParentForPath,
  isSafeKey,
  objClone,
  objPathResolve,
  objValueResolve,
  setByPath,
  sortDocuments,
} from '../../src/utils/object.js';

describe('object helpers', () => {
  test('setByPath tolerates null root without throwing', () => {
    expect(() => setByPath(null, 'a.b', 1)).not.toThrow();
  });

  test('getByPath returns undefined for missing path', () => {
    expect(getByPath({}, 'missing.path')).toBeUndefined();
  });

  const pathResolveCases = [
    [{ a: { b: 2 } }, 'a.b', 2],
    [{ a: { b: { c: 3 } } }, 'a.b.c', 3],
    [{}, 'x', undefined],
    [undefined, 'a.b', undefined],
    [{ foo: 'bar' }, '', { foo: 'bar' }],
  ];

  test.concurrent.each(pathResolveCases)('%p, %s -> %p', async (obj, path, expected) => {
    // @ts-ignore
    expect(objPathResolve(obj, path)).toEqual(expected);
  });

  test('objPathResolve returns undefined when intermediate property is null', () => {
    const obj = { a: null };
    expect(objPathResolve(obj, 'a.b')).toBeUndefined();
  });

  test('objPathResolve handles null/undefined roots', () => {
    // function defaults obj to {} when undefined, so empty path returns {}
    expect(objPathResolve(undefined, '')).toEqual({});
    expect(objPathResolve(undefined, 'a')).toBeUndefined();
    expect(objPathResolve(null, 'a')).toBeUndefined();
  });

  const pathValueCases = [
    [{ a: 1 }, 'a', 1],
    [{ a: { b: 2 } }, 'a.b', 2],
    [{}, '', undefined],
    [undefined, 'a', undefined],
  ];

  test.concurrent.each(pathValueCases)('%p, %s -> %p', async (obj, key, expected) => {
    // @ts-ignore
    expect(objValueResolve(obj, key)).toEqual(expected);
  });

  test('returns primitives and null/undefined unchanged', () => {
    expect(objClone(1)).toBe(1);
    expect(objClone('a')).toBe('a');
    expect(objClone(true)).toBe(true);
    expect(objClone(null)).toBeNull();
    expect(objClone(undefined)).toBeUndefined();
  });

  test('deep clones arrays and nested objects', () => {
    const original = [1, { a: 2 }, [3]];
    const c = objClone(original);
    expect(c).toEqual(original);
    expect(c).not.toBe(original);
    // mutate original nested value
    // @ts-ignore
    original[1].a = 99;
    expect(c[1].a).toBe(2);
  });

  test('deep clones plain objects', () => {
    const original = { x: { y: 1 }, z: [1, 2] };
    const c = objClone(original);
    expect(c).toEqual(original);
    expect(c).not.toBe(original);
    original.x.y = 5;
    expect(c.x.y).toBe(1);
  });

  test('clones Date and RegExp instances', () => {
    const d = new Date('2020-01-01T00:00:00Z');
    const r = /ab/i;
    const original = { d, r };
    const c = objClone(original);
    expect(c.d).toEqual(d);
    expect(c.d).not.toBe(d);
    expect(c.r.toString()).toBe(r.toString());
    expect(c.r).not.toBe(r);
  });

  test('clones Map and Set deeply', () => {
    const map = new Map();
    map.set('k', { v: 1 });
    const set = new Set();
    const obj = { a: 1 };
    set.add(obj);
    const original = { map, set };
    const c = objClone(original);
    expect(c.map instanceof Map).toBe(true);
    expect(c.set instanceof Set).toBe(true);
    expect(c.map.get('k')).toEqual({ v: 1 });
    expect(c.map.get('k')).not.toBe(map.get('k'));
    // set membership: extract value from clone set
    const [clonedObj] = Array.from(c.set.values());
    expect(clonedObj).toEqual(obj);
    expect(clonedObj).not.toBe(obj);
  });

  test('rejects __proto__, constructor, prototype', () => {
    expect(isSafeKey('__proto__')).toBe(false);
    expect(isSafeKey('constructor')).toBe(false);
    expect(isSafeKey('prototype')).toBe(false);
  });

  test('accepts normal keys', () => {
    expect(isSafeKey('name')).toBe(true);
    expect(isSafeKey('address.zip')).toBe(true);
    expect(isSafeKey('0')).toBe(true);
    expect(isSafeKey('')).toBe(true);
  });

  test('getParentForPath helper handles null root, missing and non-object props', () => {
    expect(getParentForPath(null, ['a', 'b'])).toBeNull();
    const obj = {};
    const p = getParentForPath(obj, ['a', 'b']);
    expect(p).toBeDefined();
    expect(Object.prototype.hasOwnProperty.call(obj, 'a')).toBe(true);
    const obj2 = { a: 5 };
    // @ts-ignore
    const p2 = getParentForPath(obj2, ['a', 'b']);
    expect(Object.prototype.hasOwnProperty.call(obj2, 'a')).toBe(true);
    expect(typeof obj2.a).toBe('object');
  });

  test('getParentForPath rejects __proto__ intermediate key', () => {
    const obj = {};
    const res = getParentForPath(obj, ['__proto__', 'polluted']);
    expect(res).toBe(obj);
    expect({}.polluted).toBeUndefined();
  });

  test('sortDocuments returns docs unchanged when no sort spec', () => {
    const docs = [{ a: 1 }];
    expect(sortDocuments(docs, null)).toBe(docs);
    // {} is a valid spec (with no keys) so it returns a new sorted array
    expect(sortDocuments(docs, {})).toEqual(docs);
  });

  test('sortDocuments returns non-array inputs unchanged when sort spec present', () => {
    expect(sortDocuments(null, { a: 1 })).toBeNull();
    expect(sortDocuments(undefined, { a: 1 })).toBeUndefined();
    expect(sortDocuments('not-array', { a: 1 })).toBe('not-array');
  });
});
