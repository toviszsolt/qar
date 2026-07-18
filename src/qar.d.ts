/** Type definitions for Qar - In-memory query engine for JavaScript arrays. */

/** Type used for aggregation expression values in $expr queries. */
export type AggregationExpression = Record<string, any>;

/** Index specification for query optimization. Maps field paths to Map indexes. */
export type IndexMap = Map<any, any[]>;
export type IndexSpec = Record<string, IndexMap>;

/** Type for specifying the source of a lookup. Can be a Qar instance or an array. */
export type LookupFrom = Qar<any> | any[];

export type QueryOperators<T = any> = {
  /** Equality operator for matching values equal to the specified value. */
  $eq?: T;
  /** Inequality operator for matching values not equal to the specified value. */
  $ne?: T;
  /** Comparison operator for matching values less than the specified value. */
  $lt?: T;
  /** Comparison operator for matching values less than or equal to the specified value. */
  $lte?: T;
  /** Comparison operator for matching values greater than the specified value. */
  $gt?: T;
  /** Comparison operator for matching values greater than or equal to the specified value. */
  $gte?: T;
  /** Inclusion operator for matching values that are in the specified array. */
  $in?: T[];
  /** Exclusion operator for matching values that are not in the specified array. */
  $nin?: T[];
  /** Existence operator for matching documents that have (or do not have) the specified field. */
  $exists?: boolean;
  /** Regular expression operator for matching string values against a regular expression. */
  $regex?: string | RegExp;
  /** Options for the regular expression operator, such as 'i' for case-insensitive matching. */
  $options?: string;
  /** Size operator for matching arrays with a specific number of elements. */
  $size?: number;
  /** All operator for matching arrays that contain all the specified elements. */
  $all?: T extends Array<infer U> ? U[] : never;
  /** Element match operator for matching arrays that contain at least one element that matches the specified query. */
  $elemMatch?: T extends Array<infer U> ? Query<U> | QueryOperators<U> : Query<T>;
  /** Type operator for matching values of a specific runtime type, such as 'string', 'number', 'boolean', 'object', 'array', 'date', 'null', or 'undefined'. */
  $type?: string | string[];
  /** Modulo operator for matching values that satisfy a modulo condition. */
  $mod?: [number, number];
};

/**
 * A query object for filtering items based on specified criteria.
 * Each key corresponds to a field in the documents, and the value can be:
 * - A direct value for equality matching,
 * - A plain embedded object for exact object equality,
 * - An object with query operators for more complex conditions.
 * Additionally, logical operators like $and, $or, $nor, and $not can be used
 * to combine multiple query conditions.
 * The $expr operator allows the use of aggregation expressions in queries.
 * Dotted field paths (for example 'address.city') are supported for querying
 * nested fields; such paths are accepted through the string index signature.
 */
export type Query<T = any> = {
  [K in keyof T]?: T[K] | QueryOperators<T[K]>;
} & {
  /** Logical AND: all conditions must match. */
  $and?: Query<T>[];
  /** Logical OR: at least one condition must match. */
  $or?: Query<T>[];
  /** Logical NOR: no condition may match. */
  $nor?: Query<T>[];
  /** Logical NOT: negates the specified condition. */
  $not?: Query<T>;
  /** Expression-based query condition using aggregation expressions. */
  $expr?: AggregationExpression;
} & {
  /** Dotted-path and additional field conditions for nested field queries (for example 'address.city'). */
  [dottedPath: string]: any;
};

/**
 * A projection value specifying how to include or transform a field in query results.
 * Can be:
 * - 1 to include the field,
 * - 0 to exclude the field,
 * - An object with $slice or $elemMatch for array field operations.
 */
export type ProjectionValue = 1 | 0 | { $slice?: number; $elemMatch?: Record<string, any> };

/**
 * A projection object for specifying which fields to include or exclude in query results.
 * Each key corresponds to a field path in the documents, and the value can be:
 * - 1 to include the field,
 * - 0 to exclude the field,
 * - An object with $slice or $elemMatch for array field operations.
 * The _id field can also be included or excluded explicitly.
 * The projection can also be null to indicate no projection.
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
 * Options for the find method, including optional index hints for query optimization.
 */
export type FindOptions = {
  /** Index hints for query optimization. Maps field paths to Map-based indexes. */
  indexes?: IndexSpec;
};

/**
 * A projection value for aggregation pipeline $project stages.
 * Can be:
 * - 1 to include a field,
 * - 0 to exclude a field,
 * - A field reference starting with $ (for aliasing or remapping),
 * - An expression object for computed output,
 * - An object-shaped projected value built from nested expressions or references.
 */
export type AggregationProjectionValue = 1 | 0 | string | Record<string, any>;

/**
 * A projection specification for aggregation pipeline $project stages.
 * Supports:
 * - field inclusion and exclusion,
 * - dotted output paths,
 * - aliasing from source paths via '$field.path',
 * - computed expressions,
 * - nested object-shaped output.
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
   * - null: groups all documents into a single group,
   * - A field reference (for example '$city'),
   * - An object-shaped expression (for example { city: '$city', year: '$year' }).
   */
  _id: null | string | Record<string, any>;

  /**
   * Additional fields computed using accumulator operators.
   * Supported accumulators include:
   * - $sum
   * - $avg
   * - $min
   * - $max
   * - $push
   * - $first
   * - $last
   */
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
 * Options for the $unwind stage in an aggregation pipeline.
 * The path identifies the field to unwind, and preserveNullAndEmptyArrays keeps
 * documents whose target field is missing, null, non-array, or an empty array,
 * setting the unwound field to null when preserved.
 */
export type UnwindOptions = {
  /** The field path to unwind, with or without a leading '$'. */
  path?: string;
  /** Alternative alias for 'path' supported by the runtime. */
  $path?: string;
  /** Alternative alias for 'path' supported by the runtime. */
  field?: string;
  /** Preserve documents without values to unwind and normalize the unwound field to null. */
  preserveNullAndEmptyArrays?: boolean;
};

/**
 * A $skip stage specification for aggregation pipelines.
 * Skips the specified number of documents.
 */
export type SkipStage = {
  /** The number of documents to skip. */
  $skip: number;
};

/**
 * A $lookup stage specification for aggregation pipelines.
 * Performs a left outer join to another collection.
 */
export type LookupStage = {
  /** The target collection to join with. Accepts a Qar instance or a plain array. */
  $lookup: {
    /** The target collection to join with: a Qar instance or an array of documents. */
    from: LookupFrom;
    /** The field from the input documents to match. */
    localField: string;
    /** The field from the documents of the "from" collection to match. */
    foreignField: string;
    /** The name of the new array field to add to the input documents. */
    as: string;
  };
};

/**
 * A stage in an aggregation pipeline, which can be one of the following:
 * - $match: Filters documents based on a query.
 * - $group: Groups documents by a specified identifier and applies accumulator expressions.
 * - $sort: Sorts documents by specified fields in ascending or descending order.
 * - $project: Reshapes documents by including, excluding, or adding new fields.
 * - $limit: Limits the number of documents passed to the next stage.
 * - $skip: Skips the specified number of documents.
 * - $unwind: Deconstructs an array field from the input documents to output a document for each element.
 * - $lookup: Performs a left outer join to another collection.
 */
export type Pipeline<T = any> = Array<
  | { $match: Query<T> }
  | { $group: GroupStage }
  | { $sort: Partial<Record<keyof T, 1 | -1>> & Record<string, 1 | -1> }
  | { $project: AggregationProjection }
  | { $limit: number }
  | SkipStage
  | { $unwind: string | UnwindOptions }
  | LookupStage
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
   * @param {FindOptions} [options] - Optional find options including index hints. Defaults to no options.
   * @example
   * const items = [
   *  { name: 'Alice', age: 30 },
   *  { name: 'Bob', age: 25 },
   * ];
   * const q = new Qar(items);
   * const results = q.find({ age: { $gt: 28 } }, { name: 1 }).toArray();
   * // results: [{ name: 'Alice' }]
   */
  constructor(items?: T[], query?: Query<T>, projection?: Projection<T>, options?: FindOptions);

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
   * @param n - The maximum number of items to return. Defaults to 0 (no limit).
   * @returns The QueryCursor instance for chaining.
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
  limit(n?: number): this;

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
   * @param options - Optional find options including index hints.
   * @returns A new QueryCursor instance initialized with the provided items, query, projection, and options.
   * @example
   * const items = [
   *  { name: 'Alice', age: 30 },
   *  { name: 'Bob', age: 25 },
   * ];
   * const q = new Qar(items);
   * const results = q.find({ age: { $gt: 28 } }, { name: 1 }).toArray();
   * // results: [{ name: 'Alice' }]
   */
  static from<T = any>(items: T[], query?: Query<T>, projection?: Projection<T>, options?: FindOptions): QueryCursor<T>;
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
   * @param options - Optional find options including index hints.
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
  find(query?: Query<T>, projection?: Projection<T>, options?: FindOptions): QueryCursor<T>;

  /**
   * Finds the first item matching the given query and projection.
   * @param query - The query object specifying the criteria for matching the item.
   * @param projection - The projection object specifying which fields to include or exclude in the result.
   * @param options - Optional find options including index hints.
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
  findOne(query?: Query<T>, projection?: Projection<T>, options?: FindOptions): T | null;

  /**
   * Counts the number of items matching the given query.
   * @param query - The query object specifying the criteria for matching items.
   * @param options - Optional find options including index hints.
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
  count(query?: Query<T>, options?: FindOptions): number;

  /**
   * Checks if any items match the given query.
   * @param query - The query object specifying the criteria for matching items.
   * @param options - Optional find options including index hints.
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
  exists(query?: Query<T>, options?: FindOptions): boolean;

  /**
   * Retrieves an array of distinct values for the specified field among items matching the given query.
   * @param field - The field for which to retrieve distinct values. Supports dotted paths and an optional leading '$'.
   * @param query - Optional query to filter items before retrieving distinct values.
   * @param options - Optional find options including index hints.
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
   * @example
   * const result = q.distinct('age', { name: 'Alice' });
   * // result: [30]
   */
  distinct<K extends keyof T>(field: K): Array<T[K]>;
  distinct<K extends keyof T>(field: K, query: Query<T>, options?: FindOptions): Array<T[K]>;
  distinct(field: string): any[];
  distinct(field: string, query: Query, options?: FindOptions): any[];

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
  aggregate<R = any>(pipeline?: Pipeline<T>): R[];

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
