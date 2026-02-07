import { applyQuery } from './applyQuery.js';
import { objValueResolve } from './object.js';
import { projectCollection } from './projection.js';
import { typeOf } from './typeOf.js';

class QueryCursor {
  constructor(items = [], query = {}, projection = null) {
    this._items = items || [];
    this._query = query || {};
    this._projection = projection || null;
    this._sortSpec = null;
    this._skip = 0;
    this._limit = null;
  }

  sort(spec = {}) {
    this._sortSpec = spec && typeOf(spec) === 'object' ? spec : null;
    return this;
  }

  project(spec = null) {
    this._projection = spec && typeOf(spec) === 'object' ? spec : this._projection;
    return this;
  }

  skip(n = 0) {
    this._skip = Math.max(0, parseInt(String(n), 10) || 0);
    return this;
  }

  limit(n) {
    if (n == null) return this.toArray();
    this._limit = Math.max(0, parseInt(String(n), 10) || 0);
    return this;
  }

  toArray() {
    const queried = applyQuery(this._items, this._query);

    const sorted = this._sortSpec
      ? (() => {
          const keys = Object.keys(this._sortSpec);
          return queried.slice().sort((a, b) => {
            for (const k of keys) {
              const dir = this._sortSpec[k] === -1 ? -1 : 1;
              const va = objValueResolve(a, k);
              const vb = objValueResolve(b, k);
              if (va == null && vb == null) continue;
              if (va == null) return -1 * dir;
              if (vb == null) return 1 * dir;
              if (va < vb) return -1 * dir;
              if (va > vb) return 1 * dir;
            }
            return 0;
          });
        })()
      : queried;

    const skipped = this._skip && this._skip > 0 ? sorted.slice(this._skip) : sorted;

    const limited = this._limit != null ? skipped.slice(0, this._limit) : skipped;

    const projected = this._projection ? projectCollection(limited, this._projection, this._query) : limited;

    return projected;
  }

  // convenience to allow chaining .find(query, projection) to return a cursor
  static from(items, query = {}, projection = null) {
    return new QueryCursor(items, query, projection);
  }
}

export { QueryCursor };
