import { applyQuery } from './applyQuery.js';
import { sortDocuments } from './object.js';
import { projectCollection } from './projection.js';
import { typeOf } from './typeOf.js';

class QueryCursor {
  constructor(items = [], query = {}, projection = null, options = {}) {
    this._items = items || [];
    this._query = query || {};
    this._projection = projection || null;
    this._options = options || {};
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

  limit(n = 0) {
    const val = Number(n);
    this._limit = Number.isFinite(val) && val > 0 ? Math.floor(val) : null;
    return this;
  }

  toArray() {
    const queried = applyQuery(this._items, this._query, this._options);
    const sorted = this._sortSpec ? sortDocuments(queried, this._sortSpec) : queried;
    const skipped = this._skip && this._skip > 0 ? sorted.slice(this._skip) : sorted;
    const limited = this._limit != null ? skipped.slice(0, this._limit) : skipped;
    const projected = this._projection ? projectCollection(limited, this._projection, this._query) : limited;
    return projected;
  }

  static from(items, query = {}, projection = null, options = {}) {
    return new QueryCursor(items, query, projection, options);
  }
}

export { QueryCursor };
