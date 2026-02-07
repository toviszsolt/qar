import { objClone, objPathResolve, objValueResolve } from '../../src/utils/object.js';

describe('objPathResolve', () => {
  const cases = [
    [{ a: { b: 2 } }, 'a.b', 2],
    [{ a: { b: { c: 3 } } }, 'a.b.c', 3],
    [{}, 'x', undefined],
    [undefined, 'a.b', undefined],
    [{ foo: 'bar' }, '', { foo: 'bar' }],
  ];

  test.concurrent.each(cases)('%p, %s -> %p', async (obj, path, expected) => {
    // @ts-ignore
    expect(objPathResolve(obj, path)).toEqual(expected);
  });
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

describe('objValueResolve', () => {
  const cases = [
    [{ a: 1 }, 'a', 1],
    [{ a: { b: 2 } }, 'a.b', 2],
    [{}, '', undefined],
    [undefined, 'a', undefined],
  ];

  test.concurrent.each(cases)('%p, %s -> %p', async (obj, key, expected) => {
    // @ts-ignore
    expect(objValueResolve(obj, key)).toEqual(expected);
  });
});

describe('objClone', () => {
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
});
