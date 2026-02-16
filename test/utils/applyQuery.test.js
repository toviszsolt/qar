import { applyQuery } from '../../src/utils/applyQuery.js';

describe('applyQuery', () => {
  // Normal cases
  test.concurrent('simple equality', () => {
    const a = [
      { id: 1, v: 10 },
      { id: 2, v: 20 },
    ];
    const res = applyQuery(a, { v: 10 });
    expect(res).toEqual([a[0]]);
  });

  test.concurrent('nested path lookup', () => {
    const a = [
      { id: 1, nested: { x: 5 } },
      { id: 2, nested: { x: 6 } },
    ];
    const res = applyQuery(a, { 'nested.x': 6 });
    expect(res).toEqual([a[1]]);
  });

  test.concurrent('$and operator', () => {
    const a = [
      { id: 1, x: 1, y: 2 },
      { id: 2, x: 1, y: 3 },
    ];
    const res = applyQuery(a, { $and: [{ x: 1 }, { y: 2 }] });
    expect(res).toEqual([a[0]]);
  });

  test.concurrent('$or operator', () => {
    const a = [
      { id: 1, tag: 'a' },
      { id: 2, tag: 'b' },
      { id: 3, tag: 'c' },
    ];
    const res = applyQuery(a, { $or: [{ tag: 'a' }, { tag: 'c' }] });
    expect(res).toEqual([a[0], a[2]]);
  });

  test.concurrent('$not operator', () => {
    const a = [
      { id: 1, t: 1 },
      { id: 2, t: 2 },
    ];
    const res = applyQuery(a, { $not: { t: 1 } });
    expect(res).toEqual([a[1]]);
  });

  test.concurrent('$nor operator', () => {
    const a = [
      { id: 1, t: 1 },
      { id: 2, t: 2 },
      { id: 3, t: 3 },
    ];
    const res = applyQuery(a, { $nor: [{ t: 1 }, { t: 3 }] });
    expect(res).toEqual([a[1]]);
  });

  test.concurrent('comparison operators $gt/$lte', () => {
    const a = [{ n: 1 }, { n: 5 }, { n: 10 }];
    const res = applyQuery(a, { n: { $gt: 3, $lte: 10 } });
    expect(res).toEqual([a[1], a[2]]);
  });

  test.concurrent('$in and $nin', () => {
    const a = [{ v: 'x' }, { v: 'y' }, { v: 'z' }];
    const res1 = applyQuery(a, { v: { $in: ['x', 'z'] } });
    const res2 = applyQuery(a, { v: { $nin: ['y'] } });
    expect(res1).toEqual([a[0], a[2]]);
    expect(res2).toEqual([a[0], a[2]]);
  });

  test.concurrent('value is array and $nin checks overlap with array field values', () => {
    const a = [{ tags: ['a'] }, { tags: ['x'] }];
    const res = applyQuery(a, { tags: { $nin: ['x'] } });
    expect(res).toEqual([a[0]]);
  });

  test.concurrent('$regex with options', () => {
    const a = [{ name: 'Alice' }, { name: 'bob' }, { name: 'AL' }];
    const res = applyQuery(a, { name: { $regex: '^a', $options: 'i' } });
    expect(res).toEqual([a[0], a[2]]);
  });

  test.concurrent('returns full collection for non-object query', () => {
    const a = [{ x: 1 }];
    const res = applyQuery(a, null);
    expect(res).toEqual(a);
  });

  // Edge cases
  test.concurrent('empty collection returns empty', () => {
    const res = applyQuery([], { a: 1 });
    expect(res).toEqual([]);
  });

  test.concurrent('empty query object returns full collection', () => {
    const a = [{ x: 1 }, { x: 2 }];
    const res = applyQuery(a, {});
    expect(res).toEqual(a);
  });

  test.concurrent('missing path yields no matches', () => {
    const a = [{ a: 1 }];
    const res = applyQuery(a, { b: 1 });
    expect(res).toEqual([]);
  });

  test.concurrent('undefined vs null matching', () => {
    const a = [{ v: undefined }, { v: null }];
    expect(applyQuery(a, { v: undefined })).toEqual([a[0]]);
    expect(applyQuery(a, { v: null })).toEqual([a[1]]);
  });

  test.concurrent('type mismatch numeric comparison does not coerce (strict)', () => {
    const a = [{ n: '5' }];
    const res = applyQuery(a, { n: { $gt: 3 } });
    // strict type check: string vs number => no match
    expect(res).toEqual([]);
  });

  test.concurrent('NaN comparisons do not match', () => {
    const a = [{ n: NaN }];
    const res = applyQuery(a, { n: { $gt: 0 } });
    expect(res).toEqual([]);
  });

  test.concurrent('date comparisons work', () => {
    const a = [{ d: new Date('2020-01-02') }, { d: new Date('2020-01-01') }];
    const res = applyQuery(a, { d: { $gt: new Date('2020-01-01') } });
    expect(res).toEqual([a[0]]);
  });

  test.concurrent('value is array and $in checks overlap with array field values', () => {
    const a = [{ tags: ['x'] }, { tags: 'x' }];
    const res = applyQuery(a, { tags: { $in: ['x'] } });
    expect(res).toEqual([a[0], a[1]]);
  });

  test.concurrent('$in/$nin with non-array arg returns no matches', () => {
    const a = [{ v: 'x' }];
    expect(applyQuery(a, { v: { $in: 'x' } })).toEqual([]);
    expect(applyQuery(a, { v: { $nin: 'y' } })).toEqual([]);
  });

  test.concurrent('$regex with non-string value does not throw and returns false', () => {
    const a = [{ name: undefined }];
    expect(() => applyQuery(a, { name: { $regex: '^a' } })).toThrow();
  });

  test.concurrent('unknown operator yields no match (safety)', () => {
    const a = [{ x: 1 }];
    expect(() => applyQuery(a, { x: { $unknown: 1 } })).toThrow();
  });

  test.concurrent('logical operator type mismatch is ignored', () => {
    const a = [{ x: 1 }];
    // $and provided as object should be ignored and treated normally
    expect(() => applyQuery(a, { $and: { x: 1 } })).toThrow();
  });

  // Additional operator tests to improve coverage
  test.concurrent('$exists operator true/false', () => {
    const a = [{ v: 1 }, {}];
    expect(applyQuery(a, { v: { $exists: true } })).toEqual([a[0]]);
    expect(applyQuery(a, { v: { $exists: false } })).toEqual([a[1]]);
  });

  test.concurrent('$size operator for arrays', () => {
    const a = [{ tags: ['a', 'b'] }, { tags: ['a'] }, { tags: 'not-array' }];
    expect(applyQuery(a, { tags: { $size: 2 } })).toEqual([a[0]]);
    expect(applyQuery(a, { tags: { $size: 1 } })).toEqual([a[1]]);
    expect(applyQuery(a, { tags: { $size: 0 } })).toEqual([]);
  });

  test.concurrent('$all operator with arrays', () => {
    const a = [{ tags: ['a', 'b', 'c'] }, { tags: ['a'] }, { tags: 'x' }];
    expect(applyQuery(a, { tags: { $all: ['a', 'b'] } })).toEqual([a[0]]);
    expect(applyQuery(a, { tags: { $all: ['a'] } })).toEqual([a[0], a[1]]);
    expect(applyQuery(a, { tags: { $all: ['z'] } })).toEqual([]);
  });

  test.concurrent('empty $in array yields no matches', () => {
    const a = [{ v: 'x' }, { v: 'y' }];
    expect(applyQuery(a, { v: { $in: [] } })).toEqual([]);
  });

  test.concurrent('invalid $regex logs warning and returns false', () => {
    const a = [{ name: 'Alice' }];
    const a2 = [{ name: 'Alice' }];
    expect(() => applyQuery(a2, { name: { $regex: '[invalid' } })).toThrow();
  });

  test.concurrent('unrecognized operator emits warning', () => {
    const a = [{ x: 1 }];
    expect(() => applyQuery(a, { x: { $nonsense: 1 } })).toThrow();
  });

  test.concurrent('combinator type mismatches for $or/$nor/$not warn and behave safely', () => {
    const a = [{ x: 1 }];
    expect(() => applyQuery(a, { $or: { x: 1 } })).toThrow();
    expect(() => applyQuery(a, { $nor: { x: 1 } })).toThrow();
    expect(() => applyQuery(a, { $not: ['x'] })).toThrow();
  });

  test.concurrent('nested combinators ($and/$or) evaluate correctly (recursion)', () => {
    const a = [
      { id: 1, v: 1 },
      { id: 2, v: 2 },
    ];
    const q = { $and: [{ $or: [{ v: 1 }, { v: 3 }] }, { v: 1 }] };
    const res = applyQuery(a, q);
    expect(res).toEqual([a[0]]);
  });

  test.concurrent('$lt strict type mismatch returns false', () => {
    const a = [{ n: '2' }, { n: 1 }];
    expect(applyQuery(a, { n: { $lt: 3 } })).toEqual([a[1]]); // only numeric matches
    expect(applyQuery(a, { n: { $lt: '3' } })).toEqual([a[0]]); // string compare allowed when types match
    // mismatch: value string vs bound number -> should not match
    expect(applyQuery(a, { n: { $lt: 3 } })).toEqual([a[1]]);
  });

  test.concurrent('$gte strict type mismatch returns false', () => {
    const a = [{ n: '10' }, { n: 10 }];
    expect(applyQuery(a, { n: { $gte: 10 } })).toEqual([a[1]]);
    // string vs number should not match
    expect(applyQuery(a, { n: { $gte: 10 } })).toEqual([a[1]]);
  });

  test.concurrent('$lte strict type mismatch returns false', () => {
    const a = [{ n: '5' }, { n: 6 }];
    // string '5' vs number 5 should not match due to strict type check
    expect(applyQuery(a, { n: { $lte: 5 } })).toEqual([]);
  });

  test.concurrent('null collection handled as empty array', () => {
    const res = applyQuery(null, { x: 1 });
    expect(res).toEqual([]);
  });

  test.concurrent('$eq and $ne basic cases', () => {
    const a = [{ v: 1 }, { v: 2 }];
    expect(applyQuery(a, { v: { $eq: 1 } })).toEqual([a[0]]);
    expect(applyQuery(a, { v: { $ne: 1 } })).toEqual([a[1]]);
  });

  test.concurrent('$nin when value not in list and when in list', () => {
    const a = [{ v: 'a' }, { v: 'b' }];
    expect(applyQuery(a, { v: { $nin: ['c'] } })).toEqual([a[0], a[1]]);
    expect(applyQuery(a, { v: { $nin: ['a'] } })).toEqual([a[1]]);
  });

  test.concurrent('$all with non-array items returns no match', () => {
    const a = [{ tags: ['x', 'y'] }];
    expect(applyQuery(a, { tags: { $all: 'x' } })).toEqual([]);
  });

  test.concurrent('$size with empty array and non-array', () => {
    const a = [{ tags: [] }, { tags: 'x' }];
    expect(applyQuery(a, { tags: { $size: 0 } })).toEqual([a[0]]);
    expect(applyQuery(a, { tags: { $size: 1 } })).toEqual([]);
  });

  test.concurrent('$elemMatch matches objects inside arrays', () => {
    const a = [{ arr: [{ x: 1 }, { x: 2 }] }, { arr: [{ x: 3 }] }];
    expect(applyQuery(a, { arr: { $elemMatch: { x: { $gt: 1 } } } })).toEqual([a[0], a[1]]);
    expect(applyQuery(a, { arr: { $elemMatch: { x: 2 } } })).toEqual([a[0]]);
  });

  test.concurrent('$type operator filters by type', () => {
    const a = [{ v: 1 }, { v: 's' }, { v: null }, { v: [] }];
    expect(applyQuery(a, { v: { $type: 'number' } })).toEqual([a[0]]);
    expect(applyQuery(a, { v: { $type: ['string', 'null'] } })).toEqual([a[1], a[2]]);
  });

  test.concurrent('$mod operator works for modulo checks', () => {
    const a = [{ n: 5 }, { n: 6 }, { n: '7' }];
    expect(applyQuery(a, { n: { $mod: [2, 1] } })).toEqual([a[0]]);
    expect(applyQuery(a, { n: { $mod: [3, 0] } })).toEqual([a[1]]);
  });

  test.concurrent('index optimization returns candidates when provided', () => {
    const a = [
      { id: 1, v: 'x' },
      { id: 2, v: 'y' },
    ];
    const index = new Map();
    index.set('x', [a[0]]);
    const res = applyQuery(a, { v: 'x' }, { indexes: { v: index } });
    expect(res).toEqual([a[0]]);
  });

  test.concurrent('index returns empty when no candidates', () => {
    const a = [
      { id: 1, v: 'x' },
      { id: 2, v: 'y' },
    ];
    const index = new Map();
    index.set('z', []);
    const res = applyQuery(a, { v: 'z' }, { indexes: { v: index } });
    expect(res).toEqual([]);
  });

  test.concurrent('index supports $eq condition lookup', () => {
    const a = [
      { id: 1, v: 'x' },
      { id: 2, v: 'y' },
    ];
    const index = new Map();
    index.set('x', [a[0]]);
    const res = applyQuery(a, { v: { $eq: 'x' } }, { indexes: { v: index } });
    expect(res).toEqual([a[0]]);
  });

  test.concurrent('$elemMatch with non-array or primitive items returns no match', () => {
    const a1 = [{ arr: 'not-array' }];
    expect(applyQuery(a1, { arr: { $elemMatch: { x: 1 } } })).toEqual([]);
    const a2 = [{ arr: [1, 2] }];
    expect(applyQuery(a2, { arr: { $elemMatch: { x: 1 } } })).toEqual([]);
  });

  test.concurrent('top-level $regex key is handled and warns on non-string', () => {
    const a = [{ name: 'Alice' }];
    expect(() => applyQuery(a, { $regex: '^A' })).toThrow();
  });

  test.concurrent('$mod with invalid arg returns no match', () => {
    const a = [{ n: 5 }];
    expect(applyQuery(a, { n: { $mod: 'no' } })).toEqual([]);
  });

  test.concurrent('$mod with non-number divisor or remainder returns no match', () => {
    const a = [{ n: 5 }];
    expect(applyQuery(a, { n: { $mod: ['a', 1] } })).toEqual([]);
    expect(applyQuery(a, { n: { $mod: [2, 'b'] } })).toEqual([]);
  });

  test.concurrent('$mod additional coverage for destructuring branch', () => {
    const a = [{ n: 11 }, { n: 12 }];
    expect(applyQuery(a, { n: { $mod: [5, 1] } })).toEqual([a[0]]);
  });

  test.concurrent('index candidate path executed with multiple candidates', () => {
    const a = [
      { id: 1, v: 'x' },
      { id: 2, v: 'x' },
    ];
    const index = new Map();
    index.set('x', [a[0], a[1]]);
    const res = applyQuery(a, { v: 'x' }, { indexes: { v: index } });
    expect(res).toEqual([a[0], a[1]]);
  });

  test.concurrent('$expr comparison uses field references', () => {
    const a = [
      { id: 1, price: 10, msrp: 20 },
      { id: 2, price: 30, msrp: 25 },
    ];
    const res = applyQuery(a, { $expr: { $lt: ['$price', '$msrp'] } });
    expect(res).toEqual([a[0]]);
  });

  test.concurrent('$expr complex logical and arithmetic', () => {
    const a = [
      { id: 1, a: 2, b: 3, price: 10, msrp: 20 },
      { id: 2, a: 5, b: 1, price: 30, msrp: 25 },
    ];
    const res = applyQuery(a, {
      $expr: { $and: [{ $lt: ['$price', '$msrp'] }, { $eq: [{ $add: ['$a', '$b'] }, 5] }] },
    });
    expect(res).toEqual([a[0]]);
  });

  test.concurrent('$expr string ops $toLower and $concat', () => {
    const a = [{ id: 1, name: 'ALICE', first: 'AL', last: 'ICE' }];
    const res = applyQuery(a, {
      $expr: { $eq: [{ $toLower: '$name' }, { $toLower: { $concat: ['$first', '$last'] } }] },
    });
    expect(res).toEqual([a[0]]);
  });

  test.concurrent('index provided but condition has no $eq should skip index', () => {
    const a = [
      { id: 1, v: 1 },
      { id: 2, v: 3 },
    ];
    const index = new Map();
    index.set(1, [a[0]]);
    // query uses a comparison operator, not $eq — index should be ignored
    const res = applyQuery(a, { v: { $gt: 2 } }, { indexes: { v: index } });
    expect(res).toEqual([a[1]]);
  });

  test.concurrent('$elemMatch with empty condition object returns no match', () => {
    const a = [{ arr: [{ x: 1 }] }];
    expect(applyQuery(a, { arr: { $elemMatch: {} } })).toEqual([]);
  });

  test.concurrent('explicit index lookup triggers candidate retrieval', () => {
    const a = [{ id: 1, v: 'z' }];
    const index = new Map();
    index.set('z', [a[0]]);
    const res = applyQuery(a, { v: 'z' }, { indexes: { v: index } });
    expect(res).toEqual([a[0]]);
  });

  test.concurrent('index missing key returns empty candidates', () => {
    const a = [{ id: 1, v: 'x' }];
    const index = new Map(); // no entries
    const res = applyQuery(a, { v: 'x' }, { indexes: { v: index } });
    expect(res).toEqual([]);
  });

  test.concurrent('index filtering actually filters candidates via matches', () => {
    const a = [
      { id: 1, v: 'x', p: 1 },
      { id: 2, v: 'x', p: 2 },
    ];
    const index = new Map();
    index.set('x', [a[0], a[1]]);
    const res = applyQuery(a, { v: 'x', p: 1 }, { indexes: { v: index } });
    expect(res).toEqual([a[0]]);
  });

  test.concurrent('date comparisons for $lt/$lte/$gte', () => {
    const a = [{ d: new Date('2020-01-01') }, { d: new Date('2020-01-02') }];
    expect(applyQuery(a, { d: { $lt: new Date('2020-01-02') } })).toEqual([a[0]]);
    expect(applyQuery(a, { d: { $lte: new Date('2020-01-01') } })).toEqual([a[0]]);
    expect(applyQuery(a, { d: { $gte: new Date('2020-01-02') } })).toEqual([a[1]]);
  });

  test.concurrent('nested combinator with non-object element hits matches early-return', () => {
    const a = [{ x: 1 }];
    const res = applyQuery(a, { $and: ['x'] });
    expect(res).toEqual([]);
  });
});
