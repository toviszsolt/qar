import { aggregate as runAggregate } from './utils/aggregate.js';
import { applyQuery, matches } from './utils/applyQuery.js';
import { objValueResolve } from './utils/object.js';
import { QueryCursor } from './utils/queryCursor.js';
import { typeOf } from './utils/typeOf.js';
import { validateDatabaseLike } from './utils/validate.js';

export default class Qar {
  constructor(items = []) {
    if (typeOf(items) !== 'array') {
      throw new TypeError('Items must be an array of objects');
    }
    validateDatabaseLike(items, '/items');
    this._items = items;
  }

  find(query = {}, projection, options) {
    return QueryCursor.from(this._items, query, projection, options);
  }

  findOne(query = {}, projection, options) {
    const res = this.find(query, projection, options).limit(1).toArray();
    return res.length > 0 ? res[0] : null;
  }

  count(query = {}, options) {
    return applyQuery(this._items, query, options).length;
  }

  exists(query = {}, options) {
    const filtered = applyQuery(this._items, query, options);
    return filtered.length > 0;
  }

  distinct(field, query = {}) {
    if (!field) return [];
    const filtered = applyQuery(this._items, query);
    const distinctItems = new Set();
    for (const item of filtered) {
      const itemValue =
        typeOf(field) === 'string' && field.startsWith('$')
          ? objValueResolve(item, field.slice(1))
          : objValueResolve(item, field);
      if (itemValue !== undefined) distinctItems.add(itemValue);
    }
    return Array.from(distinctItems);
  }

  aggregate(pipeline = []) {
    return runAggregate(this._items, pipeline);
  }

  toArray() {
    return typeOf(this._items) === 'array' ? [...this._items] : [];
  }
}
