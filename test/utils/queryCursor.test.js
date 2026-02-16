import Qar from '../../src/qar.js';
import { QueryCursor } from '../../src/utils/queryCursor.js';

describe('QueryCursor - basic chainable API', () => {
  const users = new Qar([
    { id: 1, name: 'Zoe', lastName: 'Zed', age: 30 },
    { id: 2, name: 'Amy', lastName: 'Alpha', age: 20 },
    { id: 3, name: 'Ben', lastName: 'Beta', age: 25 },
  ]);

  test('sort then limit returns array', () => {
    const results = users
      .find({ age: { $gte: 18 } })
      .sort({ lastName: 1 })
      .limit(2)
      .toArray();
    expect(Array.isArray(results)).toBe(true);
    expect(results.map((r) => r.id)).toEqual([2, 3]);
  });

  test('find with projection returns projected items', () => {
    const slim = users.find({ age: { $gte: 18 } }, { name: 1, id: 1, _id: 0 }).toArray();
    expect(Array.isArray(slim)).toBe(true);
    expect(slim[0]).toHaveProperty('name');
    expect(slim[0]).toHaveProperty('id');
  });
});

describe('QueryCursor - additional branch tests', () => {
  test('constructor handles falsy items and query', () => {
    const qc = QueryCursor.from(null, null, null);
    const out = qc.toArray();
    expect(Array.isArray(out)).toBe(true);
    expect(out).toEqual([]);
  });

  test('project with non-object leaves previous projection', () => {
    const items = [{ id: 1, a: 1 }];
    const qc = QueryCursor.from(items, {}, { id: 1 });
    qc.project(true); // non-object should keep current projection
    const res = qc.toArray();
    expect(res[0]).toHaveProperty('id');
    expect(res[0]).not.toHaveProperty('a');
  });

  test('skip with negative value becomes zero', () => {
    const items = [{ id: 1 }, { id: 2 }];
    const qc = QueryCursor.from(items, {}, null).skip(-5);
    const res = qc.toArray();
    expect(res.length).toBe(2);
  });

  test('skip with non-numeric string becomes zero', () => {
    const items = [{ id: 1 }, { id: 2 }];
    // @ts-ignore
    const qc = QueryCursor.from(items, {}, null).skip('abc');
    expect(qc._skip).toBe(0);
  });

  test('limit with string numeric sets numeric limit', () => {
    const items = [{ id: 1 }, { id: 2 }, { id: 3 }];
    const qc = QueryCursor.from(items, {}, null).limit('2');
    const res = qc.toArray();
    expect(res.length).toBe(2);
  });

  test('limit with 0 returns empty slice', () => {
    const items = [{ id: 1 }, { id: 2 }];
    const qc = QueryCursor.from(items, {}, null).limit(0);
    const res = qc.toArray();
    expect(res).toEqual([]);
  });

  test('sort direction -1 and default path', () => {
    const items = [
      { id: 1, v: 1 },
      { id: 2, v: 2 },
    ];
    const desc = QueryCursor.from(items, {}, null).sort({ v: -1 }).toArray();
    expect(desc[0].v).toBe(2);
    const other = QueryCursor.from(items, {}, null).sort({ v: 0 }).toArray();
    expect(other[0].v).toBe(1);
  });

  test('project(spec) sets projection and skip(n) works', () => {
    const items = [
      { id: 1, a: 1 },
      { id: 2, a: 2 },
      { id: 3, a: 3 },
    ];
    const qc = QueryCursor.from(items, {}, null).project({ id: 1 }).skip(1);
    const out = qc.toArray();
    expect(out.length).toBe(2);
    expect(out[0]).toHaveProperty('id');
    expect(out[0]).not.toHaveProperty('a');
  });

  test('static from returns a QueryCursor instance', () => {
    const items = [{ id: 1 }];
    const qc = QueryCursor.from(items, { id: 1 }, null);
    expect(typeof qc.toArray).toBe('function');
    expect(qc.toArray()).toEqual(items);
  });

  test('sort comparator falls through and returns 0 for equal keys', () => {
    const items = [
      { id: 1, v: 5 },
      { id: 2, v: 5 },
    ];
    const res = QueryCursor.from(items, {}, null).sort({ v: 1 }).toArray();
    // order should remain stable when comparator returns 0
    expect(res.map((r) => r.id)).toEqual([1, 2]);
  });

  test('sort with null spec clears sort and works', () => {
    const items = [
      { id: 1, name: null },
      { id: 2, name: 'A' },
    ];
    const res = QueryCursor.from(items, {}, null).sort(null).toArray();
    expect(Array.isArray(res)).toBe(true);
    expect(res.length).toBe(2);
  });

  test('limit(null) returns array immediately', () => {
    const items = [{ id: 1 }, { id: 2 }];
    const arr = QueryCursor.from(items, {}, null).limit(null);
    expect(Array.isArray(arr)).toBe(true);
    expect(arr).toEqual(items);
  });

  test('sort comparator handles va==null && vb==null, va==null, vb==null branches', () => {
    // both null
    const bothNull = [
      { id: 1, x: null },
      { id: 2, x: null },
    ];
    const r1 = QueryCursor.from(bothNull, {}, null).sort({ x: 1 }).toArray();
    expect(r1.map((r) => r.id)).toEqual([1, 2]);

    // va null, vb defined
    const vaNull = [
      { id: 1, x: null },
      { id: 2, x: 'a' },
    ];
    const r2 = QueryCursor.from(vaNull, {}, null).sort({ x: 1 }).toArray();
    expect(r2[0].id).toBe(1);

    // vb null, va defined
    const vbNull = [
      { id: 1, x: 'a' },
      { id: 2, x: null },
    ];
    const r3 = QueryCursor.from(vbNull, {}, null).sort({ x: 1 }).toArray();
    // nulls are sorted before defined values per implementation
    expect(r3[0].id).toBe(2);
  });

  test('sort() with no args uses default spec and returns array', () => {
    const items = [
      { id: 1, v: 2 },
      { id: 2, v: 1 },
    ];
    const res = QueryCursor.from(items, {}, null).sort().toArray();
    expect(Array.isArray(res)).toBe(true);
    expect(res.length).toBe(2);
  });
});

// Additional targeted defensive-branch tests (kept in same file to ensure one test file per source file)
test('`_applySortToDocuments` returns docs unchanged when no sort spec', () => {
  const q = new QueryCursor([{ a: 1 }]);
  const docs = [{ a: 1 }];
  // default _sortSpec is null — should early-return original value
  expect(q._applySortToDocuments(docs)).toBe(docs);
});

test('`_applySortToDocuments` returns non-array inputs unchanged when sort spec present', () => {
  const q = new QueryCursor([{ a: 1 }]);
  q._sortSpec = { a: 1 };
  const notArray = null;
  expect(q._applySortToDocuments(notArray)).toBe(notArray);
});
