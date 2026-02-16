import Qar from '../src/qar.js';

describe('Qar convenience methods', () => {
  test('constructor throws on non-array', () => {
    // @ts-ignore
    expect(() => new Qar({})).toThrow(TypeError);
  });

  const items = [
    { id: 1, cat: 'a', nested: { x: 1 } },
    { id: 2, cat: 'b', nested: { x: 2 } },
    { id: 3, cat: 'a' },
  ];

  test('toArray returns deep copy', () => {
    const q = new Qar(items);
    const out = q.toArray();
    expect(Array.isArray(out)).toBe(true);
    expect(out).toEqual(items);
    // mutating returned array should not change internal items
    // @ts-ignore
    out.push({ id: 4 });
    expect(q.toArray().length).toBe(3);
  });

  test('toArray handles non-array internal items', () => {
    const q = new Qar(items);
    // @ts-ignore
    q._items = null;
    expect(q.toArray()).toEqual([]);
  });

  test('findOne returns object or null', () => {
    const q = new Qar(items);
    expect(q.findOne({ id: 2 })).toEqual(items[1]);
    expect(q.findOne({ id: 99 })).toBeNull();
  });

  test('count and exists', () => {
    const q = new Qar(items);
    expect(q.count({ cat: 'a' })).toBe(2);
    expect(q.exists({ cat: 'b' })).toBe(true);
    expect(q.exists({ cat: 'z' })).toBe(false);
  });

  test('distinct field variants', () => {
    const q = new Qar(items);
    // @ts-ignore
    expect(q.distinct()).toEqual([]);
    const cats = q.distinct('cat');
    expect(Array.isArray(cats)).toBe(true);
    expect(cats.sort()).toEqual(['a', 'b'].sort());

    // dotted path
    expect(q.distinct('nested.x').sort()).toEqual([1, 2].sort());

    // $field syntax (leading $)
    expect(q.distinct('$cat').sort()).toEqual(['a', 'b'].sort());
  });

  test('aggregate delegates to runAggregate', () => {
    const q = new Qar(items);
    const res = q.aggregate([{ $match: { cat: 'a' } }, { $group: { _id: '$cat', count: { $sum: 1 } } }]);
    expect(Array.isArray(res)).toBe(true);
    // group should produce an object with _id 'a' and count 2
    const m = {};
    for (const r of res) m[r._id] = r.count;
    expect(m['a']).toBe(2);
  });
});
