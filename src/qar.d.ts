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
  $all?: any[];
  $elemMatch?: Record<string, any>;
  $type?: string | string[];
  $mod?: [number, number];
};

export type Query<T = any> = {
  [K in keyof T]?: T[K] | QueryOperators<T[K]>;
} & {
  $and?: Query<T>[];
  $or?: Query<T>[];
  $nor?: Query<T>[];
  $not?: Query<T>;
  $expr?: Record<string, any>;
};

export type Projection<T = any> =
  | ({
      [K in keyof T]?: 1 | 0 | { $slice?: number; $elemMatch?: Record<string, any> };
    } & {
      _id?: 0 | 1;
      [key: string]: 1 | 0 | { $slice?: number; $elemMatch?: Record<string, any> } | undefined;
    })
  | null;

export type Pipeline = Array<
  | { $match: Record<string, any> }
  | { $group: Record<string, any> }
  | { $sort: Record<string, 1 | -1> }
  | { $project: Record<string, any> }
  | { $limit: number }
  | { $unwind: string | { path: string; preserveNullAndEmptyArrays?: boolean } }
  | Record<string, any>
>;

export class QueryCursor<T = any> {
  constructor(items?: T[], query?: Query<T>, projection?: Projection<T>);

  sort(spec?: Record<string, 1 | -1>): this;
  project(spec?: Projection<T>): this;
  skip(n?: number): this;
  limit(): T[];
  limit(n: number): this;
  limit(n?: number): this | T[];

  toArray(): T[];

  static from<T = any>(items: T[], query?: Query<T>, projection?: Projection<T>): QueryCursor<T>;
}

export class Qar<T = any> {
  constructor(items?: T[]);

  find(query?: Query<T>, projection?: Projection<T>): QueryCursor<T>;
  findOne(query?: Query<T>, projection?: Projection<T>): T | null;
  count(query?: Query<T>): number;
  exists(query?: Query<T>): boolean;

  distinct<K extends keyof T>(field: K): Array<T[K]>;
  distinct(field: string): any[];

  aggregate<R = any>(pipeline?: Pipeline): R[];
  toArray(): T[];
}

export default Qar;
