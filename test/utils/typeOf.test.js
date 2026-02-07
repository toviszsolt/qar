import { typeOf } from '../../src/utils/typeOf.js';

describe('typeOf', () => {
  const cases = [
    [null, 'null'],
    [undefined, 'undefined'],
    [[], 'array'],
    [new Date('2020-01-01'), 'date'],
    [{}, 'object'],
    [123, 'number'],
    ['abc', 'string'],
    [true, 'boolean'],
    [Symbol('s'), 'symbol'],
    [() => {}, 'function'],
  ];

  test.concurrent.each(cases)('%p -> %s', async (input, expected) => {
    expect(typeOf(input)).toBe(expected);
  });
});
