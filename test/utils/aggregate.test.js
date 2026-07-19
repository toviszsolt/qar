import Qar from '../../src/qar.js';
import { aggregate } from '../../src/utils/aggregate.js';
import { projectCollection } from '../../src/utils/projection.js';

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

    // unwind non-array with preserveNull should keep each doc and set missing field to null
    const unwound = docs.aggregate([{ $unwind: { path: '$tags', preserveNullAndEmptyArrays: true } }]);
    expect(Array.isArray(unwound)).toBe(true);
    expect(unwound).toHaveLength(2);
    expect(unwound.every((d) => d.tags === null)).toBe(true);

    // group with object _id should produce distinct groups for distinct evaluated object keys
    const g1 = new Qar([
      { id: 1, x: 1 },
      { id: 2, x: 1 },
      { id: 3, x: 2 },
    ]);
    const resObjId = g1.aggregate([{ $group: { _id: { x: '$x' }, count: { $sum: 1 } } }]);
    expect(resObjId).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ _id: { x: 1 }, count: 2 }),
        expect.objectContaining({ _id: { x: 2 }, count: 1 }),
      ]),
    );
    expect(resObjId.length).toBe(2);

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

  test('unwind preserveNull converts empty nested array field to null', () => {
    const docs = new Qar([{ id: 1, meta: { tags: [] } }]);
    const res = docs.aggregate([{ $unwind: { path: '$meta.tags', preserveNullAndEmptyArrays: true } }]);
    expect(res).toEqual([{ id: 1, meta: { tags: null } }]);
  });

  test('aggregate $project builds nested output from dotted include path', () => {
    const docs = [{ profile: { name: 'Anna' } }];

    const res = aggregate(docs, [{ $project: { 'profile.name': 1 } }]);

    expect(res).toEqual([{ profile: { name: 'Anna' } }]);
  });

  test('aggregate $project builds nested aliased output from source path', () => {
    const docs = [{ user: { name: 'Anna', city: 'BP' } }];

    const res = aggregate(docs, [
      {
        $project: {
          'profile.name': '$user.name',
          'profile.city': '$user.city',
        },
      },
    ]);

    expect(res).toEqual([{ profile: { name: 'Anna', city: 'BP' } }]);
  });

  test('aggregate $project builds nested computed output', () => {
    const docs = [{ price: 10, tax: 2 }];

    const res = aggregate(docs, [
      {
        $project: {
          'stats.total': { $add: ['$price', '$tax'] },
        },
      },
    ]);

    expect(res).toEqual([{ stats: { total: 12 } }]);
  });

  test('aggregate $project exclusion removes top-level field', () => {
    const res = aggregate([{ a: 1, b: 2 }], [{ $project: { b: 0 } }]);
    expect(res).toEqual([{ a: 1 }]);
  });

  test('aggregate $project exclusion removes nested field', () => {
    const res = aggregate([{ meta: { x: 1, y: 2 }, a: 1 }], [{ $project: { 'meta.x': 0 } }]);
    expect(res).toEqual([{ meta: { y: 2 }, a: 1 }]);
  });

  test('aggregate $project exclusion breaks on null parent path', () => {
    const res = aggregate([{ a: null, keep: 1 }], [{ $project: { 'a.b.c': 0 } }]);
    expect(res).toEqual([{ a: null, keep: 1 }]);
  });

  test('setByPath rejects __proto__ intermediate and last key', () => {
    const res = aggregate([{}], [{ $project: { '__proto__.polluted': 1 } }]);
    expect(Object.prototype.hasOwnProperty.call(Object.prototype, 'polluted')).toBe(false);
    expect(res).toEqual([{}]);
    const res2 = aggregate([{ x: 1 }], [{ $project: { 'x.__proto__': 1 } }]);
    expect(Object.prototype.hasOwnProperty.call(Object.prototype, 'polluted')).toBe(false);
    expect(res2).toEqual([{}]);
  });

  test('setByPath rejects __proto__ in intermediate key via expression', () => {
    const res = aggregate([{ name: 'test' }], [{ $project: { '__proto__.x': { $toString: '$name' } } }]);
    expect(Object.prototype.hasOwnProperty.call(Object.prototype, 'x')).toBe(false);
    expect(res).toEqual([{}]);
  });

  test('$skip stage skips N documents', () => {
    const data = new Qar([{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }, { id: 5 }]);
    const res = data.aggregate([{ $skip: 2 }, { $limit: 2 }]);
    expect(res.length).toBe(2);
    expect(res[0].id).toBe(3);
    expect(res[1].id).toBe(4);
  });

  test('$skip handles string and zero', () => {
    const data = new Qar([{ id: 1 }, { id: 2 }]);
    expect(data.aggregate([{ $skip: '1' }])[0].id).toBe(2);
    expect(data.aggregate([{ $skip: 0 }]).length).toBe(2);
    expect(data.aggregate([{ $skip: -5 }]).length).toBe(2);
  });

  test('$lookup stage performs left join', () => {
    const orders = new Qar([
      { orderId: 1, userId: 10 },
      { orderId: 2, userId: 20 },
    ]);
    const users = new Qar([
      { _id: 10, name: 'Alice' },
      { _id: 20, name: 'Bob' },
    ]);
    const res = orders.aggregate([{ $lookup: { from: users, localField: 'userId', foreignField: '_id', as: 'user' } }]);
    expect(res.length).toBe(2);
    expect(res[0].user).toEqual([{ _id: 10, name: 'Alice' }]);
    expect(res[1].user).toEqual([{ _id: 20, name: 'Bob' }]);
  });

  test('$lookup with array as from', () => {
    const orders = new Qar([{ orderId: 1, userId: 10 }]);
    const users = [{ _id: 10, name: 'Alice' }];
    const res = orders.aggregate([{ $lookup: { from: users, localField: 'userId', foreignField: '_id', as: 'user' } }]);
    expect(res[0].user).toEqual([{ _id: 10, name: 'Alice' }]);
  });

  test('$lookup with missing local field returns empty array', () => {
    const orders = new Qar([{ orderId: 1 }]);
    const users = new Qar([{ _id: 10, name: 'Alice' }]);
    const res = orders.aggregate([{ $lookup: { from: users, localField: 'userId', foreignField: '_id', as: 'user' } }]);
    expect(res[0].user).toEqual([]);
  });

  test('$lookup with invalid spec returns original docs', () => {
    const orders = new Qar([{ orderId: 1, userId: 10 }]);
    const users = new Qar([{ _id: 10, name: 'Alice' }]);
    const res = orders.aggregate([{ $lookup: { from: users } }]);
    expect(res[0].orderId).toBe(1);
    expect(res[0].user).toBeUndefined();
  });

  test('$lookup with Qar instance uses _items', () => {
    const orders = new Qar([{ orderId: 1, userId: 10 }]);
    const users = new Qar([{ _id: 10, name: 'Alice' }]);
    // from is Qar instance, should use users._items
    const res = orders.aggregate([{ $lookup: { from: users, localField: 'userId', foreignField: '_id', as: 'user' } }]);
    expect(res[0].user).toEqual([{ _id: 10, name: 'Alice' }]);
  });

  test('$lookup with undefined localValue returns empty array', () => {
    const orders = new Qar([{ orderId: 1 }]); // no userId field
    const users = new Qar([{ _id: 10, name: 'Alice' }]);
    const res = orders.aggregate([{ $lookup: { from: users, localField: 'userId', foreignField: '_id', as: 'user' } }]);
    expect(res[0].user).toEqual([]);
  });

  test('$lookup with Qar instance missing _items uses fallback', () => {
    const orders = new Qar([{ orderId: 1, userId: 10 }]);
    const users = new Qar([{ _id: 10, name: 'Alice' }]);
    // Manually clear _items to test fallback
    users._items = undefined;
    const res = orders.aggregate([{ $lookup: { from: users, localField: 'userId', foreignField: '_id', as: 'user' } }]);
    expect(res[0].user).toEqual([]);
  });

  test('$lookup with localValue not in foreignMap returns empty array', () => {
    const orders = new Qar([{ orderId: 1, userId: 999 }]); // userId not in users
    const users = new Qar([{ _id: 10, name: 'Alice' }]);
    const res = orders.aggregate([{ $lookup: { from: users, localField: 'userId', foreignField: '_id', as: 'user' } }]);
    expect(res[0].user).toEqual([]);
  });

  test('$lookup with from object lacking _items returns empty join', () => {
    const orders = new Qar([{ orderId: 1, userId: 10 }]);
    // from has no _items property -> treated as empty collection, no throw
    const fromNoItems = { localField: 'userId' };
    const res = orders.aggregate([
      { $lookup: { from: fromNoItems, localField: 'userId', foreignField: '_id', as: 'user' } },
    ]);
    expect(res[0].user).toEqual([]);
  });

  test('$lookup with from object whose _items is not an array returns empty join', () => {
    const orders = new Qar([{ orderId: 1, userId: 10 }]);
    const fromBadItems = { _items: 'not-an-array' };
    const res = orders.aggregate([
      { $lookup: { from: fromBadItems, localField: 'userId', foreignField: '_id', as: 'user' } },
    ]);
    expect(res[0].user).toEqual([]);
  });

  test('$lookup result is a deep copy (mutating joined nested field does not change from collection)', () => {
    const orders = new Qar([{ orderId: 1, userId: 10 }]);
    const users = new Qar([{ _id: 10, name: 'Alice', profile: { age: 30 } }]);
    const res = orders.aggregate([{ $lookup: { from: users, localField: 'userId', foreignField: '_id', as: 'user' } }]);
    // mutate a nested field of the joined document
    res[0].user[0].profile.age = 99;
    // source collection must be unchanged
    expect(users.toArray()[0].profile.age).toBe(30);
  });

  test('$group with object _id of different key order produces a single group', () => {
    const data = new Qar([
      { a: 1, b: 2, v: 10 },
      { b: 2, a: 1, v: 20 },
      { a: 1, b: 3, v: 5 },
    ]);
    const res = data.aggregate([{ $group: { _id: { a: '$a', b: '$b' }, total: { $sum: '$v' } } }]);
    // {a:1,b:2} and {b:2,a:1} are the same group (key order normalized)
    const map = {};
    for (const r of res) map[JSON.stringify(r._id)] = r.total;
    expect(map[JSON.stringify({ a: 1, b: 2 })]).toBe(30);
    expect(map[JSON.stringify({ a: 1, b: 3 })]).toBe(5);
    expect(res.length).toBe(2);
  });

  test('$group with object _id containing nested array normalizes key order', () => {
    const data = new Qar([
      { a: 1, tags: ['x', 'y'], v: 10 },
      { tags: ['x', 'y'], a: 1, v: 20 },
      { a: 1, tags: ['y', 'x'], v: 5 },
    ]);
    // sortObjectKeys recurses into arrays; {a:1,tags:['x','y']} and {tags:['x','y'],a:1}
    // are the same group, but a different array order is a different group.
    const res = data.aggregate([{ $group: { _id: { a: '$a', tags: '$tags' }, total: { $sum: '$v' } } }]);
    const map = {};
    for (const r of res) map[JSON.stringify(r._id)] = r.total;
    expect(map[JSON.stringify({ a: 1, tags: ['x', 'y'] })]).toBe(30);
    expect(map[JSON.stringify({ a: 1, tags: ['y', 'x'] })]).toBe(5);
    expect(res.length).toBe(2);
  });

  test('$group with object _id containing null value covers sortObjectKeys null branch', () => {
    const data = new Qar([
      { a: 1, tag: null, v: 10 },
      { a: 1, tag: null, v: 20 },
      { a: 1, tag: 'x', v: 5 },
    ]);
    // _id: { a: '$a', tag: '$tag' } -> resolves to { a: 1, tag: null } etc.
    // sortObjectKeys recursively called with null via value lookup -> covers line 25 true branch
    const res = data.aggregate([{ $group: { _id: { a: '$a', tag: '$tag' }, total: { $sum: '$v' } } }]);
    const map = {};
    for (const r of res) map[JSON.stringify(r._id)] = r.total;
    expect(map[JSON.stringify({ a: 1, tag: null })]).toBe(30);
    expect(map[JSON.stringify({ a: 1, tag: 'x' })]).toBe(5);
    expect(res.length).toBe(2);
  });

  test('$group object _id with __proto__ key is filtered by isSafeKey', () => {
    // Build an object with __proto__ as an own property (object literal __proto__ key
    // triggers the prototype setter; Object.create(null) avoids that).
    const unsafeObj = Object.create(null);
    unsafeObj.__proto__ = { x: 1 };
    unsafeObj.b = 2;
    expect(Object.keys(unsafeObj).sort()).toEqual(['__proto__', 'b']);
    const data = new Qar([
      { a: 1, nested: unsafeObj, v: 10 },
      { a: 1, nested: { b: 2 }, v: 20 },
    ]);
    // sortObjectKeys isSafeKey skips __proto__ during key string computation,
    // so both docs produce the same group key and are merged.
    const res = data.aggregate([{ $group: { _id: { a: '$a', n: '$nested' }, total: { $sum: '$v' } } }]);
    // Both docs merged into one group (__proto__ filtered out in key computation)
    expect(res.length).toBe(1);
    expect(res[0].total).toBe(30);
  });

  test('$group with array _id normalizes element order', () => {
    const data = new Qar([
      { tags: ['x', 'y'], v: 10 },
      { tags: ['y', 'x'], v: 20 },
      { tags: ['x', 'y'], v: 5 },
    ]);
    // _id is an array; typeOf(array)='array' so sortObjectKeys is NOT called
    // (only called when typeOf(idValue)==='object'). Array element order is preserved.
    const res = data.aggregate([{ $group: { _id: '$tags', total: { $sum: '$v' } } }]);
    const map = {};
    for (const r of res) map[JSON.stringify(r._id)] = r.total;
    expect(map[JSON.stringify(['x', 'y'])]).toBe(15);
    expect(map[JSON.stringify(['y', 'x'])]).toBe(20);
    expect(res.length).toBe(2);
  });

  test('aggregate $project nested object spec includes whole nested object', () => {
    const docs = [{ id: 1, addr: { city: 'NY', zip: 10001, country: 'US' } }];
    // projectCollection include mode treats a nested object spec as inclusion of the whole field
    const res = projectCollection(docs, { addr: { city: 1 } });
    expect(res).toEqual([{ id: 1, addr: { city: 'NY', zip: 10001, country: 'US' } }]);
  });
});
