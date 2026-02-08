import { aggregate as runAggregate } from './utils/aggregate.js';
import { objValueResolve } from './utils/object.js';
import { QueryCursor } from './utils/queryCursor.js';
import { typeOf } from './utils/typeOf.js';

export default class Qar {
  constructor(items = []) {
    if (typeOf(items) !== 'array') {
      throw new TypeError('Items must be an array of objects');
    }
    this._items = items;
  }

  find(query = {}, projection) {
    return QueryCursor.from(this._items, query, projection);
  }

  findOne(query = {}, projection) {
    const all = this.find(query, projection).toArray();
    return all.length > 0 ? all[0] : null;
  }

  count(query = {}) {
    return this.find(query).toArray().length;
  }

  exists(query = {}) {
    return this.find(query).toArray().length > 0;
  }

  distinct(field) {
    if (!field) return [];
    const vals = new Set();
    for (const it of this._items) {
      const v =
        typeOf(field) === 'string' && field.startsWith('$')
          ? objValueResolve(it, field.slice(1))
          : objValueResolve(it, field);
      if (v !== undefined) vals.add(v);
    }
    return Array.from(vals);
  }

  aggregate(pipeline = []) {
    return runAggregate(this._items, pipeline);
  }

  toArray() {
    return typeOf(this._items) === 'array' ? [...this._items] : [];
  }
}
