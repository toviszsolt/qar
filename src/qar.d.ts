/** Type definitions for Qar - In-memory query engine for JavaScript arrays. */
export type QueryOperators<T = any> = {
  $eq?: T;
  $ne?: T;
  $lt?: T;
  $lte?: T;
  $gt?: T;
  $gte?: T;
  $in?: T[];
  $nin?: T[];
  $exists?: boolean;
  $regex?: string | RegExp;
  $options?: string;
  $size?: number;
  $all?: T extends any[] ? T : never;
  $elemMatch?: Partial<Record<string, any>>;
  $type?: string | string[];
  $mod?: [number, number];
};

/**
 * A query object for filtering items based on specified criteria.
 * Each key corresponds to a field in the documents, and the value can be:
 * - A direct value for equality matching,
 * - An object with query operators for more complex conditions.
 * Additionally, logical operators like $and, $or, $nor, and $not can be used to combine multiple query conditions.
 * The $expr operator allows for using aggregation expressions in queries.
 */
export type Query<T = any> = {
  [K in keyof T]?: T[K] | QueryOperators<T[K]>;
} & {
  $and?: Query<T>[];
  $or?: Query<T>[];
  $nor?: Query<T>[];
  $not?: Query<T>;
  $expr?: Record<string, any>;
};

/**
 * A projection value specifying how to include or transform a field in query results.
 * Can be:
 * - 1 to include the field
 * - 0 to exclude the field
 * - An object with $slice or $elemMatch for array field operations
 */
export type ProjectionValue = 1 | 0 | { $slice?: number; $elemMatch?: Record<string, any> };

/**
 * A projection object for specifying which fields to include or exclude in query results.
 * Each key corresponds to a field in the documents, and the value can be:
 * - 1 to include the field,
 * - 0 to exclude the field,
 * - An object with $slice or $elemMatch for array fields.
 * The _id field can also be included or excluded explicitly.
 * The projection can also be null to indicate no projection (include all fields).
 */
export type Projection<T = any> =
  | ({
      [K in keyof T]?: ProjectionValue;
    } & {
      _id?: 0 | 1;
      [key: string]: ProjectionValue | undefined;
    })
  | null;

/**
 * A projection value for aggregation pipeline $project stages.
 * Can be:
 * - 1 to include the field
 * - 0 to exclude the field
 * - A field reference starting with $ (e.g., '$fieldName')
 * - An expression object for computed fields
 */
export type AggregationProjectionValue =
  | 1
  | 0
  | string // Field references like '$skills'
  | Record<string, any>; // Expression objects like { $add: ['$a', '$b'] }

/**
 * A projection specification for aggregation pipeline $project stages.
 * Allows field inclusion, exclusion, renaming, and computed expressions.
 */
export type AggregationProjection = {
  [key: string]: AggregationProjectionValue;
};

/**
 * A $group stage specification for aggregation pipelines.
 * Groups documents by a specified identifier expression and applies accumulator expressions.
 */
export type GroupStage = {
  /**
   * The grouping key expression. Can be:
   * - null: groups all documents into a single group
   * - A field reference (e.g., '$city')
   * - An object with field references (e.g., { city: '$city', year: '$year' })
   */
  _id: null | string | Record<string, any>;

  /** Additional fields computed using accumulator operators */
  [field: string]:
    | { $sum: number | string | Record<string, any> }
    | { $avg: number | string | Record<string, any> }
    | { $min: string | Record<string, any> }
    | { $max: string | Record<string, any> }
    | { $push: string | Record<string, any> }
    | { $first: string | Record<string, any> }
    | { $last: string | Record<string, any> }
    | null
    | string
    | Record<string, any>;
};

/**
 * Options for the $unwind stage in an aggregation pipeline, specifying how to deconstruct an array field.
 * The path field specifies the field to unwind, and the preserveNullAndEmptyArrays option determines whether to preserve documents without the array field or with empty arrays.
 */
export type UnwindOptions = {
  /** The field path to unwind (with or without $ prefix) */
  path: string;
  /**
   * If true, documents without the array field or with empty arrays
   * will be preserved with the field set to null
   */
  preserveNullAndEmptyArrays?: boolean;
};

/**
 * A stage in an aggregation pipeline, which can be one of the following:
 * - $match: Filters documents based on a query.
 * - $group: Groups documents by a specified identifier and applies accumulator expressions.
 * - $sort: Sorts documents by specified fields in ascending or descending order.
 * - $project: Reshapes documents by including, excluding, or adding new fields.
 * - $limit: Limits the number of documents passed to the next stage.
 * - $unwind: Deconstructs an array field from the input documents to output a document for each element.
 */
export type Pipeline = Array<
  | { $match: Query }
  | { $group: GroupStage }
  | { $sort: Record<string, 1 | -1> }
  | { $project: AggregationProjection }
  | { $limit: number }
  | { $unwind: string | UnwindOptions }
>;

/**
 * A cursor for iterating over query results, supporting sorting, projection, skipping, and limiting.
 * @template T - The type of items in the query results.
 * @example
 * const items = [
 *  { name: 'Alice', age: 30 },
 *  { name: 'Bob', age: 25 },
 * ];
 * const q = new Qar(items);
 * const results = q
 *  .find({ age: { $gt: 28 } }, { name: 1 })
 *  .sort({ name: 1 })
 *  .skip(0)
 *  .limit(10)
 *  .toArray();
 * // results: [{ name: 'Alice' }]
 */
export class QueryCursor<T = any> {
  /**
   * Creates a new QueryCursor instance with the given items, query, and projection.
   * @param {T[]} [items] - The array of items to query. Defaults to an empty array.
   * @param {Query<T>} [query] - The query object specifying the criteria for matching items. Defaults to an empty query.
   * @param {Projection<T>} [projection] - The projection object specifying which fields to include or exclude in the results. Defaults to no projection (include all fields).
   * @example
   * const items = [
   *  { name: 'Alice', age: 30 },
   *  { name: 'Bob', age: 25 },
   * ];
   * const q = new Qar(items);
   * const results = q.find({ age: { $gt: 28 } }, { name: 1 }).toArray();
   * // results: [{ name: 'Alice' }]
   */
  constructor(items?: T[], query?: Query<T>, projection?: Projection<T>);

  /**
   * Sorts the query results based on the specified sort specification.
   * @param spec - An object specifying the sort order for each field (1 for ascending, -1 for descending).
   * @returns The QueryCursor instance for chaining.
   * @example
   * const items = [
   *  { name: 'Alice', age: 30 },
   *  { name: 'Bob', age: 25 },
   * ];
   * const q = new Qar(items);
   * const results = q.find({}, { name: 1 }).sort({ age: -1 }).toArray();
   * // results: [{ name: 'Alice', age: 30 }, { name: 'Bob', age: 25 }]
   */
  sort(spec?: Record<string, 1 | -1>): this;

  /**
   * Applies a projection to the query results, specifying which fields to include or exclude.
   * @param spec - The projection specification object.
   * @returns The QueryCursor instance for chaining.
   * @example
   * const items = [
   *  { name: 'Alice', age: 30 },
   *  { name: 'Bob', age: 25 },
   * ];
   * const q = new Qar(items);
   * const results = q.find({ age: { $gt: 28 } }, { name: 1 }).toArray();
   * // results: [{ name: 'Alice' }]
   */
  project(spec?: Projection<T>): this;

  /**
   * Skips the specified number of items in the query results.
   * @param n - The number of items to skip. Defaults to 0.
   * @return The QueryCursor instance for chaining.
   * @example
   * const items = [
   *  { name: 'Alice', age: 30 },
   *  { name: 'Bob', age: 25 },
   *  { name: 'Charlie', age: 35 },
   * ];
   * const q = new Qar(items);
   * const results = q.find({}, { name: 1 }).sort({ age: 1 }).skip(1).toArray();
   * // results: [{ name: 'Alice' }, { name: 'Charlie' }]
   */
  skip(n?: number): this;

  /**
   * Limits the number of items in the query results.
   * @param n - The maximum number of items to return. If not specified, returns all items.
   * @returns The QueryCursor instance for chaining if n is specified, or an array of items if n is not specified.
   * @example
   * const items = [
   *  { name: 'Alice', age: 30 },
   *  { name: 'Bob', age: 25 },
   *  { name: 'Charlie', age: 35 },
   * ];
   * const q = new Qar(items);
   * const results = q.find({}, { name: 1 }).sort({ age: 1 }).limit(2).toArray();
   * // results: [{ name: 'Bob' }, { name: 'Alice' }]
   */
  limit(): T[];
  limit(n: number): this;
  limit(n?: number): this | T[];

  /**
   * Converts the current query results to an array.
   * @returns An array of items matching the current query, projection, sorting, skipping, and limiting.
   * @example
   * const items = [
   *  { name: 'Alice', age: 30 },
   *  { name: 'Bob', age: 25 },
   * ];
   * const q = new Qar(items);
   * const results = q.find({ age: { $gt: 28 } }, { name: 1 }).toArray();
   * // results: [{ name: 'Alice' }]
   */
  toArray(): T[];

  /**
   * Creates a new QueryCursor instance from the given items, query, and projection.
   * @param items - The array of items to query.
   * @param query - The query object specifying the criteria for matching items.
   * @param projection - The projection object specifying which fields to include or exclude in the results.
   * @returns A new QueryCursor instance initialized with the provided items, query, and projection.
   * @example
   * const items = [
   *  { name: 'Alice', age: 30 },
   *  { name: 'Bob', age: 25 },
   * ];
   * const q = new Qar(items);
   * const results = q.find({ age: { $gt: 28 } }, { name: 1 }).toArray();
   * // results: [{ name: 'Alice' }]
   */
  static from<T = any>(items: T[], query?: Query<T>, projection?: Projection<T>): QueryCursor<T>;
}

/**
 * In-memory query engine for JavaScript arrays, inspired by MongoDB's query language.
 * Supports complex queries, projections, and aggregation pipelines.
 * @template T - The type of items in the array being queried.
 * @example
 * const items = [
 *  { name: 'Alice', age: 30, tags: ['friend', 'colleague'] },
 *  { name: 'Bob', age: 25, tags: ['friend'] },
 *  { name: 'Charlie', age: 35, tags: ['colleague'] },
 * ];
 *
 * const q = new Qar(items);
 * const results = q.find({ age: { $gt: 28 } }, { name: 1 }).toArray();
 * // results: [{ name: 'Alice' }, { name: 'Charlie' }]
 *
 */
export class Qar<T = any> {
  /**
   * Creates a new Qar instance with the given array of items.
   * @param {T[]} [items] - The array of items to query. Defaults to an empty array.
   * @example
   * const items = [
   *  { name: 'Alice', age: 30 },
   *  { name: 'Bob', age: 25 },
   * ];
   * const q = new Qar(items);
   * const results = q.find({ age: { $gt: 28 } }, { name: 1 }).toArray();
   * // results: [{ name: 'Alice' }]
   */
  constructor(items?: T[]);

  /**
   * Finds items matching the given query and projection.
   * @param query - The query object specifying the criteria for matching items.
   * @param projection - The projection object specifying which fields to include or exclude in the results.
   * @returns A QueryCursor that can be further refined with sorting, skipping, and limiting.
   * @example
   * const items = [
   *  { name: 'Alice', age: 30 },
   *  { name: 'Bob', age: 25 },
   * ];
   * const q = new Qar(items);
   * const results = q.find({ age: { $gt: 28 } }, { name: 1 }).toArray();
   * // results: [{ name: 'Alice' }]
   */
  find(query?: Query<T>, projection?: Projection<T>): QueryCursor<T>;

  /**
   * Finds the first item matching the given query and projection.
   * @param query - The query object specifying the criteria for matching the item.
   * @param projection - The projection object specifying which fields to include or exclude in the result.
   * @returns The first matching item, or null if no match is found.
   * @example
   * const items = [
   *  { name: 'Alice', age: 30 },
   *  { name: 'Bob', age: 25 },
   * ];
   * const q = new Qar(items);
   * const result = q.findOne({ age: { $gt: 28 } }, { name: 1 });
   * // result: { name: 'Alice' }
   */
  findOne(query?: Query<T>, projection?: Projection<T>): T | null;

  /**
   * Counts the number of items matching the given query.
   * @param query - The query object specifying the criteria for matching items.
   * @returns The count of matching items.
   * @example
   * const items = [
   *  { name: 'Alice', age: 30 },
   *  { name: 'Bob', age: 25 },
   * ];
   * const q = new Qar(items);
   * const result = q.count({ age: { $gt: 28 } });
   * // result: 1
   */
  count(query?: Query<T>): number;

  /**
   * Checks if any items match the given query.
   * @param query - The query object specifying the criteria for matching items.
   * @returns True if at least one item matches the query, false otherwise.
   * @example
   * const items = [
   *  { name: 'Alice', age: 30 },
   *  { name: 'Bob', age: 25 },
   * ];
   * const q = new Qar(items);
   * const result = q.exists({ age: { $gt: 28 } });
   * // result: true
   */
  exists(query?: Query<T>): boolean;

  /**
   * Retrieves an array of distinct values for the specified field among items matching the given query.
   * @param field - The field for which to retrieve distinct values.
   * @returns An array of distinct values for the specified field.
   * @example
   * const items = [
   *  { name: 'Alice', age: 30 },
   *  { name: 'Bob', age: 25 },
   *  { name: 'Charlie', age: 30 },
   * ];
   * const q = new Qar(items);
   * const result = q.distinct('age');
   * // result: [30, 25]
   */
  distinct<K extends keyof T>(field: K): Array<T[K]>;
  distinct(field: string): any[];

  /**
   * Performs an aggregation using the specified pipeline stages.
   * @param pipeline - An array of aggregation pipeline stages to apply to the items.
   * @returns An array of results produced by the aggregation pipeline.
   * @example
   * const items = [
   *  { name: 'Alice', age: 30 },
   *  { name: 'Bob', age: 25 },
   *  { name: 'Charlie', age: 30 },
   * ];
   * const q = new Qar(items);
   * const results = q.aggregate([
   *  { $group: { _id: '$age', count: { $sum: 1 } } },
   * ]);
   * // results: [{ _id: 30, count: 2 }, { _id: 25, count: 1 }]
   */
  aggregate<R = any>(pipeline?: Pipeline): R[];

  /**
   * Converts the current query results to an array.
   * @returns An array of items matching the current query and projection.
   * @example
   * const items = [
   *  { name: 'Alice', age: 30 },
   *  { name: 'Bob', age: 25 },
   * ];
   * const q = new Qar(items);
   * const results = q.find({ age: { $gt: 28 } }, { name: 1 }).toArray();
   * // results: [{ name: 'Alice' }]
   */
  toArray(): T[];
}

export default Qar;
