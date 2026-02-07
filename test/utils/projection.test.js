import { getByPath, projectCollection, projectItem, setByPath } from '../../src/utils/projection.js';

describe('projection utility', () => {
  test('include fields and exclude _id when specified', () => {
    const user = { _id: '1', name: 'Alice', email: 'a@a', role: 'admin' };
    const proj = { name: 1, email: 1, _id: 0 };
    expect(projectItem(user, proj)).toEqual({ name: 'Alice', email: 'a@a' });
  });

  test('exclude password field', () => {
    const u = { id: 1, name: 'Bob', password: 'secret' };
    expect(projectItem(u, { password: 0 })).toEqual({ id: 1, name: 'Bob' });
  });

  test('$slice positive returns first N elements', () => {
    const post = { tags: ['a', 'b', 'c', 'd'] };
    expect(projectItem(post, { tags: { $slice: 2 } })).toEqual({ tags: ['a', 'b'] });
  });

  test('$slice negative returns last N elements', () => {
    const post = { comments: [1, 2, 3, 4, 5] };
    expect(projectItem(post, { comments: { $slice: -2 } })).toEqual({ comments: [4, 5] });
  });

  test('nested path include and $slice', () => {
    const post = { meta: { tags: ['a', 'b', 'c', 'd'], nested: { arr: [1, 2, 3, 4] } } };
    const proj = { 'meta.tags': { $slice: 2 }, 'meta.nested.arr': { $slice: -2 } };
    expect(projectItem(post, proj)).toEqual({ meta: { tags: ['a', 'b'], nested: { arr: [3, 4] } } });
  });

  test('$elemMatch projection returns only first matching element', () => {
    const post = {
      comments: [
        { author: 'Bob', likes: 5 },
        { author: 'Alice', likes: 12 },
        { author: 'Alice', likes: 3 },
      ],
    };
    const res = projectItem(post, { comments: { $elemMatch: { likes: { $gt: 10 } } } });
    expect(res).toEqual({ comments: [{ author: 'Alice', likes: 12 }] });
  });

  test('collection projection maps items', () => {
    const items = [
      { id: 1, v: 'x' },
      { id: 2, v: 'y' },
    ];
    expect(projectCollection(items, { v: 1 })).toEqual([{ v: 'x' }, { v: 'y' }]);
  });

  test('positional $ returns first matching element (simple subfield)', () => {
    const post = {
      comments: [
        { author: 'Bob', likes: 5 },
        { author: 'Alice', likes: 12 },
      ],
    };
    const q = { 'comments.author': 'Alice' };
    const res = projectItem(post, { 'comments.$': 1 }, q);
    expect(res).toEqual({ comments: [{ author: 'Alice', likes: 12 }] });
  });

  test('positional $ with $and combinator', () => {
    const post = {
      comments: [
        { author: 'Bob', likes: 5 },
        { author: 'Alice', likes: 12 },
        { author: 'Alice', likes: 3 },
      ],
    };
    const q = { $and: [{ 'comments.author': 'Alice' }, { 'comments.likes': { $gt: 10 } }] };
    const res = projectItem(post, { 'comments.$': 1 }, q);
    expect(res).toEqual({ comments: [{ author: 'Alice', likes: 12 }] });
  });

  test('positional $ with no matching predicate leaves field out', () => {
    const post = { comments: [{ author: 'X' }] };
    const res = projectItem(post, { 'comments.$': 1 }, {});
    expect(res).toEqual({});
  });

  test('$elemMatch with empty condition yields no match', () => {
    const post = { comments: [{ author: 'A', likes: 1 }] };
    const res = projectItem(post, { comments: { $elemMatch: {} } });
    expect(res).toEqual({});
  });

  test('exclusion nested path deletion', () => {
    const item = { meta: { tags: ['a', 'b'], nested: { x: 1 } }, other: 1 };
    const res = projectItem(item, { 'meta.tags': 0 });
    expect(res).toEqual({ meta: { nested: { x: 1 } }, other: 1 });
  });

  test('projectCollection returns non-array unchanged', () => {
    expect(projectCollection(null, { v: 1 })).toBeNull();
  });

  test('projectCollection with falsy projection returns copies', () => {
    const items = [{ a: 1 }];
    expect(projectCollection(items, null)).toEqual([{ a: 1 }]);
  });

  test('projectItem with falsy projection returns copy', () => {
    const item = { a: 1, b: 2 };
    expect(projectItem(item, null)).toEqual({ a: 1, b: 2 });
  });

  test('projection with non-operator non-0/1 spec treats as exclusion-mode no-op', () => {
    const item = { name: 'A', age: 30 };
    expect(projectItem(item, { name: 'foo' })).toEqual({ name: 'A', age: 30 });
  });

  test('setByPath tolerates null root without throwing', () => {
    expect(() => setByPath(null, 'a.b', 1)).not.toThrow();
  });

  test('getByPath returns undefined for missing path', () => {
    expect(getByPath({}, 'missing.path')).toBeUndefined();
  });

  test('positional $ with query $elemMatch on query field', () => {
    const post = {
      comments: [
        { author: 'Bob', likes: 5 },
        { author: 'Alice', likes: 12 },
      ],
    };
    const q = { comments: { $elemMatch: { likes: { $gt: 10 } } } };
    const res = projectItem(post, { 'comments.$': 1 }, q);
    expect(res).toEqual({ comments: [{ author: 'Alice', likes: 12 }] });
  });

  test('positional $ with empty $elemMatch in query yields no match', () => {
    const post = { comments: [{ author: 'A', likes: 1 }] };
    const q = { comments: { $elemMatch: {} } };
    const res = projectItem(post, { 'comments.$': 1 }, q);
    expect(res).toEqual({});
  });

  test('positional $ with non-object $elemMatch in query yields no match', () => {
    const post = { comments: [{ author: 'A', likes: 1 }] };
    const q = { comments: { $elemMatch: 'x' } };
    const res = projectItem(post, { 'comments.$': 1 }, q);
    expect(res).toEqual({});
  });

  test('$elemMatch projection with non-object spec yields no match', () => {
    const post = { comments: [{ author: 'A', likes: 1 }] };
    const res = projectItem(post, { comments: { $elemMatch: null } });
    expect(res).toEqual({});
  });

  test('$slice on non-array returns original value', () => {
    const item = { tags: 'not-array' };
    const res = projectItem(item, { tags: { $slice: 2 } });
    expect(res).toEqual({ tags: 'not-array' });
  });

  test('include mode includes _id by default', () => {
    const user = { _id: 'abc', name: 'Zoe' };
    const res = projectItem(user, { name: 1 });
    expect(res).toEqual({ name: 'Zoe', _id: 'abc' });
  });

  test('exclusion mode applies $slice when specified', () => {
    const item = { a: [1, 2, 3], b: [4, 5, 6] };
    const res = projectItem(item, { a: 0, b: { $slice: 1 } });
    expect(res).toEqual({ a: undefined, b: [4] });
  });

  test('include $slice with non-numeric spec produces empty array', () => {
    const item = { tags: [1, 2, 3] };
    const res = projectItem(item, { tags: { $slice: 'x' } });
    expect(res).toEqual({ tags: [] });
  });

  test('$slice with 0 returns empty array', () => {
    const item = { tags: [1, 2, 3] };
    const res = projectItem(item, { tags: { $slice: 0 } });
    expect(res).toEqual({ tags: [] });
  });

  test('positional $ with missing query (null) leaves out field', () => {
    const post = { comments: [{ author: 'X' }] };
    const res = projectItem(post, { 'comments.$': 1 });
    expect(res).toEqual({});
  });

  test('positional $ with invalid $and combinator (non-array) is ignored', () => {
    const post = {
      comments: [
        { author: 'Bob', likes: 5 },
        { author: 'Alice', likes: 12 },
      ],
    };
    const q = { $and: { 'comments.author': 'Alice' } };
    const res = projectItem(post, { 'comments.$': 1 }, q);
    expect(res).toEqual({});
  });

  test('exclusion mode nested $slice applies correctly', () => {
    const item = { meta: { tags: [1, 2, 3] }, other: 1 };
    const res = projectItem(item, { other: 0, 'meta.tags': { $slice: 1 } });
    expect(res).toEqual({ meta: { tags: [1] } });
  });
});
