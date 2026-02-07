import { evaluateExpression, evaluateOperand } from '../../src/utils/expressions.js';

describe('expressions extensions', () => {
  test('$strLenCP and $split', () => {
    const expr = { $strLenCP: { $split: ['hello world', ' '] } };
    const res = evaluateExpression(expr);
    expect(res).toBe(2);
  });

  test('$size and $arrayElemAt', () => {
    const expr = { $size: ['a', 'b', 'c'] };
    expect(evaluateExpression(expr)).toBe(3);
    const elem = evaluateExpression({ $arrayElemAt: [['x', 'y', 'z'], 1] });
    expect(elem).toBe('y');
  });

  test('$filter and $map', () => {
    const spec = { $filter: { input: ['a', 'bb', 'ccc'], cond: { $gt: [{ $strLenCP: '$$this' }, 1] } } };
    const filtered = evaluateExpression(spec);
    expect(filtered).toEqual(['bb', 'ccc']);

    const mapped = evaluateExpression({ $map: { input: [1, 2, 3], in: { $multiply: ['$$this', 2] } } });
    expect(mapped).toEqual([2, 4, 6]);
  });

  test('date parts and $cond', () => {
    const d = new Date('2020-05-15T12:34:56Z');
    expect(evaluateExpression({ $year: d })).toBe(2020);
    expect(evaluateExpression({ $month: d })).toBe(5);
    expect(evaluateExpression({ $dayOfMonth: d })).toBe(15);
    expect(evaluateExpression({ $hour: d })).toBe(12);
    expect(evaluateExpression({ $minute: d })).toBe(34);
    expect(evaluateExpression({ $second: d })).toBe(56);

    expect(evaluateExpression({ $cond: [true, 'yes', 'no'] })).toBe('yes');
  });

  test('$toInt and $toDouble', () => {
    expect(evaluateExpression({ $toInt: '123' })).toBe(123);
    expect(evaluateExpression({ $toDouble: '3.14' })).toBeCloseTo(3.14);
  });

  test('edge cases and invalid forms', () => {
    // logical combinators with wrong types
    expect(evaluateExpression({ $and: { a: 1 } })).toBe(false);
    expect(evaluateExpression({ $or: { a: 1 } })).toBe(false);

    // arithmetic/comparison with insufficient operands
    expect(evaluateExpression({ $add: [1] })).toBe(false);
    expect(evaluateExpression({ $lt: [1] })).toBe(false);

    // membership and string helpers with invalid args
    expect(evaluateExpression({ $in: [1] })).toBe(false);
    expect(evaluateExpression({ $indexOfCP: ['a'] })).toBe(-1);
    expect(evaluateExpression({ $split: ['a'] })).toEqual([]);

    // array helpers invalid forms
    expect(evaluateExpression({ $filter: 'not-an-object' })).toEqual([]);
    expect(evaluateExpression({ $map: 'x' })).toEqual([]);
    expect(evaluateExpression({ $reduce: 'x' })).toBeNull();

    // conditional forms
    expect(evaluateExpression({ $cond: 'x' })).toBeNull();
    expect(evaluateExpression({ $ifNull: 'x' })).toBe('x');
    expect(evaluateExpression({ $switch: 'x' })).toBeNull();

    // concat/substring invalid
    expect(evaluateExpression({ $concat: 'x' })).toBe('');
    expect(evaluateExpression({ $substr: ['a', 0] })).toBe('');

    // toDate invalid
    expect(evaluateExpression({ $toDate: 'not-a-date' })).toBeNull();
  });

  test('$toLower and $toUpper behaviors', () => {
    expect(evaluateExpression({ $toLower: 'ABC' })).toBe('abc');
    expect(evaluateExpression({ $toLower: null })).toBeNull();
    expect(evaluateExpression({ $toUpper: 'abc' })).toBe('ABC');
    expect(evaluateExpression({ $toUpper: null })).toBeNull();
  });

  test('concat, substr, reduce and switch', () => {
    expect(evaluateExpression({ $concat: ['a', 'b', 'c'] })).toBe('abc');
    expect(evaluateExpression({ $substr: ['hello', 1, 3] })).toBe('ell');

    const sum = evaluateExpression({
      $reduce: { input: [1, 2, 3], initialValue: 0, in: { $add: ['$$value', '$$this'] } },
    });
    expect(sum).toBe(6);

    const sw = evaluateExpression({ $switch: { branches: [{ case: { $eq: [1, 1] }, then: 'ok' }], default: 'no' } });
    expect(sw).toBe('ok');
  });

  test('empty expr, $not, $reduce non-array and $cond object form', () => {
    expect(evaluateExpression({})).toBe(false);
    expect(evaluateExpression({ $not: { $eq: [1, 1] } })).toBe(false);
    // reduce with non-array input should return initialValue
    expect(evaluateExpression({ $reduce: { input: 'x', initialValue: 5, in: { $add: ['$$value', 1] } } })).toBe(5);
    // $cond object form
    expect(evaluateExpression({ $cond: { if: { $eq: [2, 2] }, then: 'yes', else: 'no' } })).toBe('yes');
  });

  test('$year on invalid date returns null and $toString null', () => {
    expect(evaluateExpression({ $year: 'not-a-date' })).toBeNull();
    expect(evaluateExpression({ $toString: null })).toBeNull();
  });

  test('evaluateOperand variants and arithmetic/comparison ops', () => {
    // evaluateOperand: Date
    const d = new Date('2020-01-01T00:00:00Z');
    expect(evaluateOperand(d)).toEqual(d);

    // $$ var lookup
    expect(evaluateOperand('$$x', { __vars: { x: 7 } })).toBe(7);

    // $ field lookup
    expect(evaluateOperand('$a', { a: 3 })).toBe(3);

    // array/object operands
    expect(evaluateOperand([1, { $add: [1, 2] }])).toEqual([1, 3]);

    // arithmetic
    expect(evaluateExpression({ $add: [1, 2] })).toBe(3);
    expect(evaluateExpression({ $subtract: [5, 2] })).toBe(3);
    expect(evaluateExpression({ $multiply: [3, 2] })).toBe(6);
    expect(evaluateExpression({ $divide: [8, 2] })).toBe(4);

    // comparisons
    expect(evaluateExpression({ $lt: [1, 2] })).toBe(true);
    expect(evaluateExpression({ $lte: [2, 2] })).toBe(true);
    expect(evaluateExpression({ $gt: [3, 2] })).toBe(true);
    expect(evaluateExpression({ $gte: [2, 2] })).toBe(true);
    expect(evaluateExpression({ $eq: [1, 1] })).toBe(true);
    expect(evaluateExpression({ $ne: [1, 2] })).toBe(true);

    // $in valid
    expect(evaluateExpression({ $in: [2, [1, 2, 3]] })).toBe(true);

    // $strLenCP non-null
    expect(evaluateExpression({ $strLenCP: 'abc' })).toBe(3);

    // indexOf with start
    expect(evaluateExpression({ $indexOfCP: ['hello', 'l', 3] })).toBe(3);

    // arrayElemAt negative
    expect(evaluateExpression({ $arrayElemAt: [['a', 'b', 'c'], -1] })).toBe('c');

    // $ifNull with array
    expect(evaluateExpression({ $ifNull: [null, 'fallback'] })).toBe('fallback');

    // unknown op falls through to false
    expect(evaluateExpression({ $thisOpDoesNotExist: 1 })).toBe(false);
  });

  test('$and and $or with array operands', () => {
    expect(evaluateExpression({ $and: [{ $eq: [1, 1] }, { $lt: [1, 2] }] })).toBe(true);
    expect(evaluateExpression({ $or: [{ $eq: [1, 2] }, { $lt: [1, 2] }] })).toBe(true);
  });

  test('$toDate valid, concat with expression parts and substr with string args', () => {
    const dt = evaluateExpression({ $toDate: '2020-01-01T00:00:00Z' });
    expect(dt instanceof Date).toBe(true);
    expect(dt.getUTCFullYear()).toBe(2020);

    expect(evaluateExpression({ $concat: [{ $toString: 5 }, 'x'] })).toBe('5x');

    expect(evaluateExpression({ $substr: ['hello', '1', '2'] })).toBe('el');
  });

  test('null/undefined expr and evaluateOperand $$ missing, strLen/null and indexOf start fallback', () => {
    expect(evaluateExpression(null)).toBeNull();
    expect(evaluateExpression(undefined)).toBeUndefined();

    // $$var missing -> undefined
    expect(evaluateOperand('$$missing', {})).toBeUndefined();

    // $strLenCP with null -> 0
    expect(evaluateExpression({ $strLenCP: null })).toBe(0);

    // indexOf with non-numeric start falls back to 0
    expect(evaluateExpression({ $indexOfCP: ['hello', 'l', 'not-a-number'] })).toBe(2);
  });

  test('$size and $arrayElemAt invalid forms', () => {
    expect(evaluateExpression({ $size: 'x' })).toBe(0);
    expect(evaluateExpression({ $arrayElemAt: 'x' })).toBeUndefined();
    expect(evaluateExpression({ $arrayElemAt: [1, 0] })).toBeUndefined();
  });

  test('$filter/$map/$reduce with ctx.__vars and $switch/default and toInt/toDouble fallbacks', () => {
    // provide ctx with __vars to hit that branch
    const ctx = { __vars: { pre: 1 } };
    expect(evaluateExpression({ $filter: { input: [1, 2, 3], cond: { $eq: ['$$this', 2] } } }, ctx)).toEqual([2]);
    expect(evaluateExpression({ $map: { input: [2], in: { $multiply: ['$$this', 3] } } }, ctx)).toEqual([6]);
    expect(
      evaluateExpression({ $reduce: { input: [1, 2], initialValue: 0, in: { $add: ['$$value', '$$this'] } } }, ctx),
    ).toBe(3);

    // switch with no branches/default -> null
    expect(evaluateExpression({ $switch: { branches: [] } })).toBeNull();

    // toInt/toDouble invalid -> 0 / 0.0
    expect(evaluateExpression({ $toInt: 'abc' })).toBe(0);
    expect(evaluateExpression({ $toDouble: 'abc' })).toBe(0.0);

    // substr with non-numeric start/len -> '' (start/len become 0)
    expect(evaluateExpression({ $substr: ['hello', 'x', 'y'] })).toBe('');
  });

  test('$cond array/object false branches, $ifNull non-null and $switch default branch', () => {
    expect(evaluateExpression({ $cond: [false, 'yes', 'no'] })).toBe('no');
    expect(evaluateExpression({ $cond: { if: { $eq: [1, 2] }, then: 't', else: 'f' } })).toBe('f');
    expect(evaluateExpression({ $ifNull: [1, 'fallback'] })).toBe(1);
    expect(evaluateExpression({ $switch: { branches: [{ case: { $eq: [1, 2] }, then: 'ok' }], default: 'no' } })).toBe(
      'no',
    );
  });

  test('indexOf two-arg, filter/map input-non-array and switch without branches', () => {
    expect(evaluateExpression({ $indexOfCP: ['hello', 'l'] })).toBe(2);
    expect(evaluateExpression({ $filter: { input: 'x', cond: { $eq: ['$$this', 1] } } })).toEqual([]);
    expect(evaluateExpression({ $map: { input: 'x', in: { $add: ['$$this', 1] } } })).toEqual([]);
    expect(evaluateExpression({ $switch: {} })).toBeNull();
  });
});
