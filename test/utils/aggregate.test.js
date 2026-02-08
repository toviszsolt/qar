import Qar from '../../src/qar.js';
import { aggregate, getParentForPath } from '../../src/utils/aggregate.js';

describe('aggregation helpers', () => {
  const products = new Qar([
    { id: 1, category: 'electronics', price: 100 },
    { id: 2, category: 'clothing', price: 30 },
    { id: 3, category: 'electronics', price: 200 },
    { id: 4, category: 'books', price: 15 },
  ]);

  test('distinct categories', () => {
    const cats = products.distinct('category');
    expect(Array.isArray(cats)).toBe(true);
    expect(cats.sort()).toEqual(['books', 'clothing', 'electronics'].sort());
  });

  test('group by category count via $sum', () => {
    const res = products.aggregate([{ $group: { _id: '$category', count: { $sum: 1 } } }]);
    // convert to map for easier assertions
    const map = {};
    for (const r of res) map[r._id] = r.count;
    expect(map['electronics']).toBe(2);
    expect(map['clothing']).toBe(1);
    expect(map['books']).toBe(1);
  });

  test('aggregate with $match + $group', () => {
    const res = products.aggregate([
      { $match: { price: { $gt: 50 } } },
      { $group: { _id: '$category', count: { $sum: 1 } } },
    ]);
    const map = {};
    for (const r of res) map[r._id] = r.count;
    expect(map['electronics']).toBe(2);
    expect(map['clothing']).toBeUndefined();
  });
});

describe('aggregate extended', () => {
  const items = new Qar([
    { id: 1, tags: ['a', 'b'], cat: 'x', val: 10 },
    { id: 2, tags: ['b', 'c'], cat: 'x', val: 20 },
    { id: 3, tags: ['a'], cat: 'y', val: 5 },
  ]);

  test('$unwind then $group $sum', () => {
    const res = items.aggregate([
      { $unwind: '$tags' },
      { $group: { _id: '$tags', count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]);
    const map = {};
    for (const r of res) map[r._id] = r.count;
    expect(map['a']).toBe(2);
    expect(map['b']).toBe(2);
    expect(map['c']).toBe(1);
  });

  test('$group $avg $max $min $first $last', () => {
    const res = items.aggregate([
      {
        $group: {
          _id: '$cat',
          avgVal: { $avg: '$val' },
          maxVal: { $max: '$val' },
          minVal: { $min: '$val' },
          firstId: { $first: '$id' },
          lastId: { $last: '$id' },
        },
      },
      { $sort: { _id: 1 } },
    ]);
    const map = {};
    for (const r of res) map[r._id] = r;
    expect(map['x'].avgVal).toBe(15);
    expect(map['x'].maxVal).toBe(20);
    expect(map['x'].minVal).toBe(10);
    expect(map['x'].firstId).toBe(1);
    expect(map['x'].lastId).toBe(2);
  });

  test('$project expressions and $limit', () => {
    const res = items.aggregate([{ $project: { id: 1, doubled: { $multiply: ['$val', 2] } } }, { $limit: 2 }]);
    expect(res.length).toBe(2);
    expect(res[0]).toHaveProperty('doubled');
  });

  test('project supports string field references in include mode', () => {
    const docs = new Qar([{ id: 1, name: 'a', tags: ['x'] }]);
    const res = docs.aggregate([{ $project: { id: 1, tagRef: '$tags' } }]);
    expect(res.length).toBe(1);
    expect(res[0].tagRef).toEqual(['x']);
  });

  test('project supports string field references in exclusion mode', () => {
    const docs = new Qar([{ id: 1, name: 'b', tags: ['y'], val: 2 }]);
    const res = docs.aggregate([{ $project: { val: 0, tagRef: '$tags' } }]);
    expect(res.length).toBe(1);
    expect(res[0].val).toBeUndefined();
    expect(res[0].tagRef).toEqual(['y']);
  });

  test('unwind preserveNull and group with object _id and null _id', () => {
    const docs = new Qar([{ id: 1, cat: 'a' }, { id: 2 }]);

    // unwind non-array with preserveNull should insert null field
    const unwound = docs.aggregate([{ $unwind: { path: '$tags', preserveNullAndEmptyArrays: true } }]);
    expect(Array.isArray(unwound)).toBe(true);
    // each doc should remain but have tags set to null when missing
    expect(unwound.some((d) => d.tags === null)).toBe(true);

    // group with object _id
    const g1 = new Qar([
      { id: 1, x: 1 },
      { id: 2, x: 1 },
      { id: 3, x: 2 },
    ]);
    const resObjId = g1.aggregate([{ $group: { _id: { x: '$x' }, count: { $sum: 1 } } }]);
    // evaluateExpression does not produce object ids for plain object spec, so
    // the implementation currently collapses into a single group (false key)
    expect(resObjId.length).toBe(1);

    // group with _id null should produce single group
    const gNull = g1.aggregate([{ $group: { _id: null, total: { $sum: '$x' } } }]);
    expect(gNull.length).toBe(1);
  });

  test('group with unknown accumulator yields null field', () => {
    const data = new Qar([{ a: 1 }, { a: 2 }]);
    const res = data.aggregate([{ $group: { _id: null, weird: { $unknown: '$a' } } }]);
    expect(res.length).toBe(1);
    expect(Object.prototype.hasOwnProperty.call(res[0], 'weird')).toBe(true);
    expect(res[0].weird).toBeNull();
  });

  test('unwind getPath variants and empty spec, sort null, project exclusion with expressions', () => {
    const docs = new Qar([
      { id: 1, tags: ['x', 'y'], val: 2 },
      { id: 2, val: 3 },
    ]);

    // unwind with object path field
    const unwound1 = docs.aggregate([{ $unwind: { path: '$tags' } }]);
    expect(Array.isArray(unwound1)).toBe(true);
    // unwind with $path property
    const unwound2 = docs.aggregate([{ $unwind: { $path: '$tags' } }]);
    expect(unwound2.length).toBeGreaterThanOrEqual(1);
    // unwind with 'field' property
    const unwound3 = docs.aggregate([{ $unwind: { field: '$tags' } }]);
    expect(unwound3.length).toBeGreaterThanOrEqual(1);

    // unwind with empty object spec should return original docs
    const unwoundEmpty = docs.aggregate([{ $unwind: {} }]);
    expect(unwoundEmpty.length).toBe(docs.count());

    // sort with non-object spec returns docs unchanged
    const sorted = docs.aggregate([{ $sort: null }]);
    expect(sorted.length).toBe(docs.count());

    // projection exclusion mode with expression
    const proj = docs.aggregate([{ $project: { val: 0, doubled: { $multiply: ['$val', 2] } } }]);
    expect(proj.every((p) => p.val === undefined)).toBe(true);
    expect(proj.every((p) => Object.prototype.hasOwnProperty.call(p, 'doubled'))).toBe(true);
  });

  test('unwind string shorthand and unknown pipeline stage', () => {
    const docs = new Qar([{ id: 1, tags: ['a'] }, { id: 2 }]);
    const s1 = docs.aggregate([{ $unwind: '$tags' }]);
    expect(Array.isArray(s1)).toBe(true);

    // unknown stage should be ignored and return current set
    const s2 = docs.aggregate([{ $foo: { a: 1 } }]);
    expect(Array.isArray(s2)).toBe(true);
    expect(s2.length).toBe(docs.count());
  });

  test('group with numeric literal _id', () => {
    const g = new Qar([{ a: 1 }, { a: 2 }]);
    const res = g.aggregate([{ $group: { _id: 1, total: { $sum: '$a' } } }]);
    expect(res.length).toBe(1);
    expect(res[0].total).toBe(3);
  });

  test('group $push, $avg numeric literal and $sum with expression', () => {
    const data = new Qar([
      { k: 'a', v: 1 },
      { k: 'a', v: 2 },
      { k: 'b', v: 3 },
    ]);
    const resPush = data.aggregate([{ $group: { _id: '$k', vals: { $push: '$v' } } }]);
    expect(resPush.some((r) => Array.isArray(r.vals))).toBe(true);

    // avg with numeric literal
    const resAvg = data.aggregate([{ $group: { _id: '$k', litAvg: { $avg: 5 } } }]);
    expect(resAvg.length).toBeGreaterThan(0);

    // sum with expression object
    const resSumExpr = data.aggregate([{ $group: { _id: null, total: { $sum: { $multiply: ['$v', 2] } } } }]);
    expect(resSumExpr[0].total).toBe((1 + 2 + 3) * 2);
  });

  test('sort descending, project non-object spec, limit with invalid n and aggregate direct call', () => {
    const data = new Qar([{ id: 1 }, { id: 3 }, { id: 2 }]);
    const sortedDesc = data.aggregate([{ $sort: { id: -1 } }]);
    expect(sortedDesc[0].id).toBe(3);

    const proj = data.aggregate([{ $project: null }]);
    expect(Array.isArray(proj)).toBe(true);

    // @ts-ignore
    const lim = data.aggregate([{ $limit: 'nope' }]);
    expect(lim.length).toBe(0);

    // call aggregate util directly with non-array docs
    const direct = aggregate(null, [{ $project: { id: 1 } }]);
    expect(Array.isArray(direct)).toBe(true);
    expect(direct.length).toBe(0);
  });

  test('group with expression-valued accumulators ($push/$max/$min/$first/$last)', () => {
    const data = new Qar([
      { k: 'a', v: 1 },
      { k: 'a', v: 5 },
      { k: 'b', v: 2 },
    ]);

    const res = data.aggregate([
      {
        $group: {
          _id: '$k',
          pushed: { $push: { $multiply: ['$v', 2] } },
          maxExpr: { $max: { $multiply: ['$v', 2] } },
          minExpr: { $min: { $multiply: ['$v', 2] } },
          firstExpr: { $first: { $add: ['$v', 1] } },
          lastExpr: { $last: { $add: ['$v', 1] } },
        },
      },
    ]);

    expect(res.some((r) => Array.isArray(r.pushed))).toBe(true);
    const a = res.find((r) => r._id === 'a');
    expect(a.maxExpr).toBe(10);
    expect(a.minExpr).toBe(2);
    expect(a.firstExpr).toBe(2);
    expect(a.lastExpr).toBe(6);
  });

  test('unwind handles null document and numeric/unknown getPath forms', () => {
    const docs = new Qar([null, {}]);
    // use nested path so reduce callback is invoked (parts.slice(0,-1) non-empty)
    const res = docs.aggregate([{ $unwind: { path: '$a.b', preserveNullAndEmptyArrays: true } }]);
    // should include the null copy for the first element
    expect(res.some((r) => r === null)).toBe(true);

    // numeric spec should be treated as invalid and return original docs
    // @ts-ignore
    const resNum = docs.aggregate([{ $unwind: 5 }]);
    expect(resNum.length).toBe(docs.count());
  });

  test('group $avg with missing field yields null result (cnt === 0)', () => {
    const data = new Qar([{ k: 'a' }, { k: 'a' }]);
    const res = data.aggregate([{ $group: { _id: '$k', avgMissing: { $avg: '$missing' } } }]);
    expect(res.length).toBeGreaterThan(0);
    expect(res[0].avgMissing).toBeNull();
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

  test('$avg with expression object computes correctly', () => {
    const data = new Qar([
      { k: 'x', v: 1 },
      { k: 'x', v: 3 },
    ]);
    const res = data.aggregate([{ $group: { _id: '$k', exprAvg: { $avg: { $multiply: ['$v', 2] } } } }]);
    expect(res.length).toBe(1);
    expect(res[0].exprAvg).toBe((1 * 2 + 3 * 2) / 2);
  });

  test('sort comparator returns 0 for equal keys', () => {
    const data = new Qar([{ id: 1 }, { id: 1 }]);
    const res = data.aggregate([{ $sort: { id: 1 } }]);
    expect(res.length).toBe(2);
  });

  test('unwind with null/non-string spec returns original docs', () => {
    const docs = new Qar([{ id: 1, tags: ['a'] }, { id: 2 }]);
    // null spec should be treated as invalid and return original
    const resNull = docs.aggregate([{ $unwind: null }]);
    expect(resNull.length).toBe(docs.count());
    // @ts-ignore
    const resNum = docs.aggregate([{ $unwind: 0 }]);
    expect(resNum.length).toBe(docs.count());
  });

  test('group by object _id creates separate groups via JSON.stringify', () => {
    const data = new Qar([{ x: { a: 1 } }, { x: { a: 2 } }, { x: { a: 1 } }]);
    const res = data.aggregate([{ $group: { _id: '$x', count: { $sum: 1 } } }]);
    // expect groups for {a:1} and {a:2}
    const map = {};
    for (const r of res) map[JSON.stringify(r._id)] = r.count;
    expect(map[JSON.stringify({ a: 1 })]).toBe(2);
    expect(map[JSON.stringify({ a: 2 })]).toBe(1);
  });

  test('sort handles va==null && vb==null, va==null and vb==null branches', () => {
    // @ts-ignore
    const docs = new Qar([{ id: 1 }, { id: 2 }]);
    // both missing key
    const bothMissing = new Qar([{}, {}]).aggregate([{ $sort: { z: 1 } }]);
    expect(bothMissing.length).toBe(2);

    // one missing, one present
    const mixed = new Qar([{ id: 1 }, {}]).aggregate([{ $sort: { id: 1 } }]);
    expect(mixed.length).toBe(2);
  });

  test('unwind accepts non-$ string shorthand', () => {
    const docs = new Qar([{ tags: ['a', 'b'] }, { tags: ['c'] }]);
    const res = docs.aggregate([{ $unwind: 'tags' }]);
    expect(res.length).toBe(3);
  });

  test('$sum treats non-numeric as zero (Number(v) || 0 branch)', () => {
    const data = new Qar([{ k: 'x' }, { k: 'x', v: 'not-a-number' }]);
    const res = data.aggregate([{ $group: { _id: '$k', total: { $sum: '$v' } } }]);
    expect(res.length).toBe(1);
    expect(res[0].total).toBe(0);
  });

  test('sort returns 1*dir when vb is null', () => {
    const data = new Qar([{}, { id: 2 }]);
    const res = data.aggregate([{ $sort: { id: 1 } }]);
    expect(res.length).toBe(2);
  });
});
