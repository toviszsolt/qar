<pre align="center">
 ██████╗  █████╗ ██████╗
██╔═══██╗██╔══██╗██╔══██╗
██║   ██║███████║██████╔╝
██║▄▄ ██║██╔══██║██╔══██╗
╚██████╔╝██║  ██║██║  ██║
 ╚══▀▀═╝ ╚═╝  ╚═╝╚═╝  ╚═╝
-=| MongoDB-style queries for plain JavaScript arrays. |=-
</pre>

<div align="center">

[![GitHub License](https://img.shields.io/github/license/toviszsolt/qar?style=flat)](https://github.com/toviszsolt/qar/blob/main/LICENSE) [![npm](https://img.shields.io/npm/v/qarjs?style=flat&color=red)](https://www.npmjs.com/package/qarjs) [![GitHub Repo stars](https://img.shields.io/github/stars/toviszsolt/qar?color=DAAA3F)](https://github.com/toviszsolt/qar/stargazers) [![Run tests](https://github.com/toviszsolt/qar/actions/workflows/main.yml/badge.svg)](https://github.com/toviszsolt/qar/actions/workflows/main.yml) [![codecov](https://codecov.io/gh/toviszsolt/qar/branch/main/graph/badge.svg?token=IONV9YMZXG)](https://codecov.io/gh/toviszsolt/qar) [![Sponsor](https://img.shields.io/static/v1?label=sponsor&message=❤&color=ff69b4)](https://github.com/sponsors/toviszsolt)

</div>

# Qar - Query Arrays

MongoDB-style queries for plain JavaScript arrays. Simple, lightweight, and perfect for Next.js, static sites, and JSON data.

## Why Qar?

When you have a JSON file or an array of objects and need to filter, search, or query them with MongoDB-style syntax - without setting up a database.

```javascript
import { Qar } from 'qarjs';

const products = new Qar(productsData);

// Simple queries
products.find({ category: 'electronics', price: { $lt: 500 } }).toArray();

// Chainable API with sorting and pagination
products.find({ inStock: true }).sort({ price: -1 }).limit(10).toArray();

// Field projection
products.find({ category: 'phones' }, { name: 1, price: 1, _id: 0 }).toArray();

// Aggregation pipeline
products.aggregate([
  { $match: { inStock: true } },
  { $group: { _id: '$category', count: { $sum: 1 } } },
  { $sort: { count: -1 } },
]);

// Get unique values
products.distinct('category'); // => ['electronics', 'clothing', 'books']
```

## Installation

```bash
npm install qarjs
```

```bash
yarn add qarjs
```

```bash
pnpm add qarjs
```

## Quick Start

```javascript
import { Qar } from 'qarjs';

const data = [
  { _id: 1, name: 'Alice', age: 20, role: 'user' },
  { _id: 2, name: 'Bob', age: 30, role: 'admin' },
  { _id: 3, name: 'Carol', age: 40, role: 'user' },
];

const users = new Qar(data);

// Find all users older than 25
users.find({ age: { $gt: 25 } }).toArray();
// => [{ _id: 2, ... }, { _id: 3, ... }]

// Find one admin
users.findOne({ role: 'admin' });
// => { _id: 2, name: 'Bob', age: 30, role: 'admin' }

// Count users
users.count({ role: 'user' });
// => 2

// Check if exists
users.exists({ name: 'Alice' });
// => true
```

## API Reference

### Constructor

```javascript
const collection = new Qar(arrayOfObjects);
```

Creates a new Qar instance with your array of objects.

### Methods

#### `find(query, projection?)`

Returns a cursor for chaining operations. Call `.toArray()` to execute.

```javascript
// Basic query
users.find({ age: { $gte: 30 } }).toArray();

// With projection
users.find({ role: 'admin' }, { name: 1, email: 1 }).toArray();

// Chainable
users.find({ active: true }).sort({ name: 1 }).skip(10).limit(5).toArray();
```

#### `findOne(query, projection?)`

Returns the first object matching the query, or `null` if not found.

```javascript
users.findOne({ name: 'Alice' });
// => { _id: 1, name: 'Alice', ... } or null

users.findOne({ role: 'admin' }, { name: 1, email: 1 });
// => { name: 'Bob', email: 'bob@example.com' }
```

#### `count(query)`

Returns the number of objects matching the query.

```javascript
users.count({ role: 'admin' });
// => 1
```

#### `exists(query)`

Returns `true` if at least one object matches the query, `false` otherwise.

```javascript
users.exists({ age: { $lt: 18 } });
// => false
```

#### `distinct(field)`

Returns an array of unique values for the specified field.

```javascript
users.distinct('role');
// => ['user', 'admin']

products.distinct('category');
// => ['electronics', 'clothing', 'books']
```

#### `aggregate(pipeline)`

Execute an aggregation pipeline. See [Aggregation Pipeline](#aggregation-pipeline) section.

```javascript
users.aggregate([{ $match: { age: { $gte: 18 } } }, { $group: { _id: '$role', count: { $sum: 1 } } }]);
```

#### `toArray()`

Returns a shallow copy of the raw array.

```javascript
users.toArray();
// => [{ ... }, { ... }, { ... }]
```

### Cursor Methods

When you call `find()`, you get a cursor that supports chaining:

#### `sort(spec)`

Sort results by one or more fields.

```javascript
// Single field, ascending
users.find({}).sort({ name: 1 }).toArray();

// Single field, descending
users.find({}).sort({ age: -1 }).toArray();

// Multiple fields
users.find({}).sort({ role: 1, age: -1 }).toArray();
```

#### `skip(n)`

Skip the first `n` results (useful for pagination).

```javascript
users.find({}).skip(10).toArray();
```

#### `limit(n)`

Limit results to `n` items.

```javascript
users.find({}).limit(5).toArray();
```

#### `project(spec)`

Apply field projection (alternative to passing projection to `find()`).

```javascript
users.find({}).project({ name: 1, email: 1 }).toArray();
```

#### `toArray()`

Execute the query and return results as an array.

```javascript
users.find({ active: true }).sort({ createdAt: -1 }).limit(10).toArray();
```

## Query Operators

### Comparison Operators

| Operator | Description           | Example                                      |
| -------- | --------------------- | -------------------------------------------- |
| `$eq`    | Equal to              | `{ age: { $eq: 30 } }` or `{ age: 30 }`      |
| `$ne`    | Not equal to          | `{ role: { $ne: 'admin' } }`                 |
| `$gt`    | Greater than          | `{ price: { $gt: 100 } }`                    |
| `$gte`   | Greater than or equal | `{ age: { $gte: 18 } }`                      |
| `$lt`    | Less than             | `{ stock: { $lt: 10 } }`                     |
| `$lte`   | Less than or equal    | `{ rating: { $lte: 3 } }`                    |
| `$in`    | In array              | `{ status: { $in: ['active', 'pending'] } }` |
| `$nin`   | Not in array          | `{ role: { $nin: ['guest', 'banned'] } }`    |

### Logical Operators

| Operator | Description                    | Example                                               |
| -------- | ------------------------------ | ----------------------------------------------------- |
| `$and`   | All conditions must match      | `{ $and: [{ age: { $gt: 18 } }, { role: 'user' }] }`  |
| `$or`    | At least one condition matches | `{ $or: [{ role: 'admin' }, { role: 'moderator' }] }` |
| `$not`   | Inverts the query              | `{ $not: { age: { $lt: 18 } } }`                      |
| `$nor`   | None of the conditions match   | `{ $nor: [{ status: 'deleted' }, { banned: true }] }` |

### Element Operators

| Operator  | Description           | Example                        |
| --------- | --------------------- | ------------------------------ |
| `$exists` | Field exists (or not) | `{ email: { $exists: true } }` |
| `$type`   | Field type check      | `{ age: { $type: 'number' } }` |

Type values: `'string'`, `'number'`, `'boolean'`, `'array'`, `'object'`, `'null'`, `'undefined'`, `'date'`

### Array Operators

| Operator     | Description                     | Example                                              |
| ------------ | ------------------------------- | ---------------------------------------------------- |
| `$all`       | Array contains all values       | `{ tags: { $all: ['javascript', 'nodejs'] } }`       |
| `$size`      | Array has exact length          | `{ tags: { $size: 3 } }`                             |
| `$elemMatch` | Array contains matching element | `{ items: { $elemMatch: { price: { $gt: 100 } } } }` |

### Evaluation Operators

| Operator | Description                     | Example                                      |
| -------- | ------------------------------- | -------------------------------------------- |
| `$regex` | Regular expression match        | `{ name: { $regex: '^A', $options: 'i' } }`  |
| `$mod`   | Modulo operation                | `{ qty: { $mod: [4, 0] } }` (divisible by 4) |
| `$expr`  | Compare fields with expressions | `{ $expr: { $gt: ['$price', '$cost'] } }`    |

### Expression Operators (used in $expr)

#### Comparison

`$eq`, `$ne`, `$gt`, `$gte`, `$lt`, `$lte`

```javascript
// Find products where price is less than MSRP
products.find({ $expr: { $lt: ['$price', '$msrp'] } });
```

#### Arithmetic

`$add`, `$subtract`, `$multiply`, `$divide`

```javascript
// Total value greater than 1000
products.find({
  $expr: { $gt: [{ $multiply: ['$price', '$quantity'] }, 1000] },
});
```

#### String

`$concat`, `$toLower`, `$toUpper`, `$substr`, `$strLenCP`, `$indexOfCP`, `$split`

```javascript
// Concatenate fields
users.find({
  $expr: { $eq: [{ $concat: ['$firstName', ' ', '$lastName'] }, 'John Doe'] },
});
```

#### Array

`$size`, `$arrayElemAt`, `$filter`, `$map`, `$reduce`

```javascript
// Products with more than 5 tags
products.find({ $expr: { $gt: [{ $size: '$tags' }, 5] } });
```

#### Date

`$year`, `$month`, `$dayOfMonth`, `$hour`, `$minute`, `$second`

```javascript
// Posts from 2024
posts.find({ $expr: { $eq: [{ $year: '$publishDate' }, 2024] } });
```

#### Conditional

`$cond`, `$ifNull`, `$switch`

```javascript
// Using $cond (if-then-else)
products.find({
  $expr: {
    $cond: [{ $gt: ['$stock', 0] }, { $eq: ['$status', 'available'] }, { $eq: ['$status', 'sold-out'] }],
  },
});
```

#### Type Conversion

`$toString`, `$toInt`, `$toDouble`, `$toDate`

### Nested Properties

Use dot notation to query nested objects:

```javascript
const data = [
  { name: 'Alice', address: { city: 'New York', zip: '10001' } },
  { name: 'Bob', address: { city: 'Los Angeles', zip: '90001' } },
];

const collection = new Qar(data);

collection.find({ 'address.city': 'New York' }).toArray();
// => [{ name: 'Alice', ... }]
```

## Field Projection

Control which fields are returned in results.

### Include/Exclude Fields

```javascript
// Include only specific fields
users.find({}, { name: 1, email: 1 });
// => [{ _id: 1, name: 'Alice', email: 'alice@...' }, ...]

// Exclude _id
users.find({}, { name: 1, email: 1, _id: 0 });
// => [{ name: 'Alice', email: 'alice@...' }, ...]

// Exclude specific fields
users.find({}, { password: 0, secretKey: 0 });
// => All fields except password and secretKey
```

### Array Slicing with $slice

Limit array elements returned:

```javascript
// Get only first 3 comments
posts.find({}, { title: 1, comments: { $slice: 3 } });

// Get last 5 items
posts.find({}, { title: 1, recentViews: { $slice: -5 } });

// Multiple slices
posts.find(
  {},
  {
    title: 1,
    comments: { $slice: 3 },
    tags: { $slice: 5 },
  },
);
```

### Positional Operator ($)

Return only the first matching array element:

```javascript
// Only return the first comment by Alice
posts.find({ 'comments.author': 'Alice' }, { 'comments.$': 1 });
```

### $elemMatch Projection

Return only the first array element matching a condition:

```javascript
// Only return comments with more than 10 likes
posts.find(
  {},
  {
    title: 1,
    comments: { $elemMatch: { likes: { $gt: 10 } } },
  },
);
```

## Aggregation Pipeline

Perform advanced data processing with aggregation pipelines.

### Stages

#### $match

Filter documents (same syntax as `find()`):

```javascript
users.aggregate([{ $match: { age: { $gte: 18 } } }]);
```

#### $group

Group documents and calculate aggregated values:

```javascript
// Count users by role
users.aggregate([
  {
    $group: {
      _id: '$role',
      count: { $sum: 1 },
    },
  },
]);

// Multiple aggregations
products.aggregate([
  {
    $group: {
      _id: '$category',
      totalProducts: { $sum: 1 },
      avgPrice: { $avg: '$price' },
      maxPrice: { $max: '$price' },
      minPrice: { $min: '$price' },
    },
  },
]);
```

**Accumulator Operators:**

- `$sum` - Sum values
- `$avg` - Calculate average
- `$max` - Maximum value
- `$min` - Minimum value
- `$push` - Build array of values
- `$first` - First value in group
- `$last` - Last value in group

#### $sort

Sort documents:

```javascript
users.aggregate([{ $group: { _id: '$city', count: { $sum: 1 } } }, { $sort: { count: -1 } }]);
```

#### $project

Reshape documents and create computed fields:

```javascript
users.aggregate([
  {
    $project: {
      name: 1,
      email: 1,
      fullName: { $concat: ['$firstName', ' ', '$lastName'] },
    },
  },
]);
```

#### $limit

Limit number of documents:

```javascript
users.aggregate([{ $group: { _id: '$role', count: { $sum: 1 } } }, { $sort: { count: -1 } }, { $limit: 5 }]);
```

#### $unwind

Deconstruct an array field into separate documents:

```javascript
const posts = new Qar([
  { title: 'Post 1', tags: ['js', 'node'] },
  { title: 'Post 2', tags: ['react', 'js'] },
]);

posts.aggregate([{ $unwind: '$tags' }, { $group: { _id: '$tags', count: { $sum: 1 } } }]);
// => [{ _id: 'js', count: 2 }, { _id: 'node', count: 1 }, { _id: 'react', count: 1 }]
```

### Complete Example

```javascript
// Analyze product sales by category
const salesReport = products.aggregate([
  // Filter in-stock products
  { $match: { inStock: true } },

  // Calculate total value per product
  {
    $project: {
      category: 1,
      totalValue: { $multiply: ['$price', '$quantity'] },
    },
  },

  // Group by category
  {
    $group: {
      _id: '$category',
      totalRevenue: { $sum: '$totalValue' },
      productCount: { $sum: 1 },
      avgValue: { $avg: '$totalValue' },
    },
  },

  // Sort by revenue
  { $sort: { totalRevenue: -1 } },

  // Top 10 categories
  { $limit: 10 },
]);
```

## Use Cases

### Next.js Static Data

Perfect for querying JSON data in Next.js applications:

```javascript
// app/products/page.tsx
import productsData from '@/data/products.json';
import { Qar } from 'qarjs';

const products = new Qar(productsData);

export default function ProductsPage({ searchParams }) {
  const filtered = products
    .find({
      category: searchParams.category,
      price: { $lte: Number(searchParams.maxPrice) || 1000 },
      inStock: true,
    })
    .sort({ price: 1 })
    .skip((Number(searchParams.page) - 1) * 20)
    .limit(20)
    .toArray();

  return <ProductList items={filtered} />;
}
```

### API Routes

```javascript
// app/api/search/route.ts
import data from '@/data/items.json';
import { Qar } from 'qarjs';

const items = new Qar(data);

export async function GET(request) {
  const q = request.nextUrl.searchParams.get('q');

  const results = items
    .find({
      $or: [{ name: { $regex: q, $options: 'i' } }, { description: { $regex: q, $options: 'i' } }],
    })
    .limit(50)
    .toArray();

  return Response.json(results);
}
```

### Static Site Generation

```javascript
import blogPosts from './posts.json';
import { Qar } from 'qarjs';

const posts = new Qar(blogPosts);

// Get published posts by category
const techPosts = posts
  .find({
    category: 'technology',
    published: true,
    publishDate: { $lte: new Date().toISOString() },
  })
  .sort({ publishDate: -1 })
  .toArray();

// Get featured post
const featured = posts.findOne({ featured: true });

// Count drafts
const draftCount = posts.count({ published: false });

// Get all categories with post counts
const categories = posts.aggregate([
  { $match: { published: true } },
  { $group: { _id: '$category', count: { $sum: 1 } } },
  { $sort: { count: -1 } },
]);
```

## Why Qar over alternatives?

| Feature               | Qar     | mingo      | sift.js | lodash   |
| --------------------- | ------- | ---------- | ------- | -------- |
| MongoDB-style queries | ✅      | ✅         | ✅      | ❌       |
| Chainable API         | ✅      | ⚠️ Limited | ❌      | ✅       |
| Aggregation pipeline  | ✅      | ✅         | ❌      | ❌       |
| Field projection      | ✅      | ✅         | ❌      | ❌       |
| Expression operators  | ✅ 30+  | ✅         | ❌      | ❌       |
| Zero dependencies     | ✅      | ❌         | ✅      | ❌       |
| Bundle size (gzipped) | ✅ ~5KB | ❌ ~15KB   | ✅ ~2KB | ❌ ~24KB |

**Qar is perfect when you:**

- Work with static JSON data in Next.js or static sites
- Want MongoDB-style queries without a database
- Need aggregation and data transformation
- Want a clean, intuitive API
- Care about bundle size

**Not recommended for:**

- Very large datasets - use a real database
- Real-time data updates - use a database with subscriptions
- Complex JOIN operations across multiple collections

## Examples

### Complex Queries

```javascript
const users = new Qar(userData);

// Find active admins or moderators over 25
users
  .find({
    $and: [{ age: { $gt: 25 } }, { status: 'active' }, { $or: [{ role: 'admin' }, { role: 'moderator' }] }],
  })
  .toArray();

// Users NOT in specific roles
users
  .find({
    $nor: [{ role: 'guest' }, { role: 'banned' }],
  })
  .toArray();

// Regex search (case-insensitive)
users
  .find({
    email: { $regex: '@gmail\\.com$', $options: 'i' },
  })
  .toArray();

// Compare fields
products
  .find({
    $expr: { $lt: ['$currentPrice', '$originalPrice'] },
  })
  .toArray();
```

### Pagination

```javascript
const page = 2;
const pageSize = 20;

const results = products
  .find({ category: 'electronics' })
  .sort({ price: 1 })
  .skip((page - 1) * pageSize)
  .limit(pageSize)
  .toArray();

const total = products.count({ category: 'electronics' });
const totalPages = Math.ceil(total / pageSize);
```

### Multiple Collections

```javascript
const products = new Qar(productsData);
const orders = new Qar(ordersData);
const users = new Qar(usersData);

// Query each independently
const electronics = products.find({ category: 'electronics' }).toArray();
const recentOrders = orders.find({ date: { $gte: '2026-01-01' } }).toArray();
const admins = users.find({ role: 'admin' }).toArray();
```

## TypeScript

Full TypeScript support included:

```typescript
import { Qar } from 'qarjs';

interface User {
  id: number;
  name: string;
  age: number;
  role: 'user' | 'admin';
}

const users = new Qar<User>(userData);

// Type-safe queries
const result = users.find({ age: { $gt: 25 } }).toArray(); // User[]
const admin = users.findOne({ role: 'admin' }); // User | null
const roles = users.distinct('role'); // string[]
```

## Browser Support

Works in all modern browsers and Node.js environments:

- Chrome/Edge: ✅
- Firefox: ✅
- Safari: ✅
- Node.js: ✅ (v14+)

## Contributing

Contributions are welcome! Please open an issue or submit a pull request.

## License

MIT © Zsolt Tövis

---

Made with ❤️ for developers who love clean APIs and don't need a database for everything
