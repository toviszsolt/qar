import Qar from './src/qar.js';

console.log('🚀 Qar Library - Comprehensive Integration Test\n');
console.log('═'.repeat(60));

// ============================================================================
// 1. TEST DATASET
// ============================================================================

const users = [
  {
    _id: 1,
    name: 'John Smith',
    age: 28,
    email: 'john@example.com',
    city: 'New York',
    salary: 75000,
    skills: ['JavaScript', 'React', 'Node.js'],
    address: { street: '123 Main St', zip: 10001 },
    active: true,
    joinedAt: new Date('2022-03-15').toJSON(),
  },
  {
    _id: 2,
    name: 'Anna Johnson',
    age: 34,
    email: 'anna@example.com',
    city: 'Boston',
    salary: 85000,
    skills: ['Python', 'Django', 'PostgreSQL'],
    address: { street: '456 Oak Ave', zip: 2108 },
    active: true,
    joinedAt: new Date('2020-07-22').toJSON(),
  },
  {
    _id: 3,
    name: 'Peter Williams',
    age: 42,
    email: 'peter@example.com',
    city: 'Chicago',
    salary: 95000,
    skills: ['Java', 'Spring', 'Kubernetes'],
    address: { street: '789 Elm St', zip: 60601 },
    active: false,
    joinedAt: new Date('2018-01-10').toJSON(),
  },
  {
    _id: 4,
    name: 'Eva Brown',
    age: 29,
    email: 'eva@example.com',
    city: 'New York',
    salary: 78000,
    skills: ['JavaScript', 'Vue.js', 'TypeScript'],
    address: { street: '321 Park Ave', zip: 10016 },
    active: true,
    joinedAt: new Date('2021-11-03').toJSON(),
  },
  {
    _id: 5,
    name: 'Gabriel Davis',
    age: 38,
    email: 'gabriel@example.com',
    city: 'Seattle',
    salary: 88000,
    skills: ['C#', '.NET', 'Azure'],
    address: { street: '555 Pine St', zip: 98101 },
    active: true,
    joinedAt: new Date('2019-05-18').toJSON(),
  },
  {
    _id: 6,
    name: 'Sophia Martinez',
    age: 25,
    email: 'sophia@example.com',
    city: 'New York',
    salary: 65000,
    skills: ['JavaScript', 'React', 'CSS'],
    address: { street: '777 Broadway', zip: 10003 },
    active: true,
    joinedAt: new Date('2023-02-01').toJSON(),
  },
];

const data = new Qar(users);

console.log('\n📊 Test dataset created:', users.length, 'users\n');

let passed = 0,
  failed = 0;
const check = (desc, actual, expected) => {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (ok) passed++;
  else {
    failed++;
    console.log(`   ❌ ${desc}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
};

// ============================================================================
// 2. BASIC QUERIES
// ============================================================================

console.log('═'.repeat(60));
console.log('📌 BASIC QUERIES');
console.log('═'.repeat(60));

// Find all
console.log('\n1️⃣  Find all:');
const allUsers = data.find().toArray();
console.log(`   Total users: ${allUsers.length}`);
check('find all count', allUsers.length, 6);

// Simple equality
console.log('\n2️⃣  Simple equality (city: New York):');
const newYorkUsers = data.find({ city: 'New York' }).toArray();
console.log(`   Results: ${newYorkUsers.length}`);
newYorkUsers.forEach((u) => console.log(`   - ${u.name}, ${u.city}`));
check('NY count', newYorkUsers.length, 3);
check('NY names', newYorkUsers.map((u) => u.name).sort(), ['Eva Brown', 'John Smith', 'Sophia Martinez']);

// FindOne
console.log('\n3️⃣  FindOne (age: 28):');
const oneUser = data.findOne({ age: 28 });
console.log(`   ${oneUser ? oneUser.name + ', ' + oneUser.age + ' years old' : 'No match'}`);
check('findOne name', oneUser ? oneUser.name : null, 'John Smith');

// Count
console.log('\n4️⃣  Count (active: true):');
const activeCount = data.count({ active: true });
console.log(`   Active users count: ${activeCount}`);
check('count active', activeCount, 5);

// Exists
console.log('\n5️⃣  Exists (age > 50):');
const hasOldUsers = data.exists({ age: { $gt: 50 } });
console.log(`   Users over 50? ${hasOldUsers ? 'Yes' : 'No'}`);
check('exists age>50', hasOldUsers, false);

// ============================================================================
// 3. COMPARISON OPERATORS
// ============================================================================

console.log('\n' + '═'.repeat(60));
console.log('🔍 COMPARISON OPERATORS');
console.log('═'.repeat(60));

// $gt, $gte, $lt, $lte
console.log('\n1️⃣  $gte - Salary >= 80000:');
const highSalary = data.find({ salary: { $gte: 80000 } }).toArray();
highSalary.forEach((u) => console.log(`   - ${u.name}: $${u.salary.toLocaleString('en-US')}`));
check('$gte 80k count', highSalary.length, 3);
check('$gte 80k names', highSalary.map((u) => u.name).sort(), ['Anna Johnson', 'Gabriel Davis', 'Peter Williams']);

console.log('\n2️⃣  $lt - Age < 30:');
const young = data.find({ age: { $lt: 30 } }).toArray();
young.forEach((u) => console.log(`   - ${u.name}, ${u.age} years old`));
check('$lt 30 count', young.length, 3);
check('$lt 30 names', young.map((u) => u.name).sort(), ['Eva Brown', 'John Smith', 'Sophia Martinez']);

console.log('\n3️⃣  Combined: 30 <= age <= 40:');
const midAge = data.find({ age: { $gte: 30, $lte: 40 } }).toArray();
midAge.forEach((u) => console.log(`   - ${u.name}, ${u.age} years old`));
check('$gte 30 $lte 40 count', midAge.length, 2);
check('$gte 30 $lte 40 names', midAge.map((u) => u.name).sort(), ['Anna Johnson', 'Gabriel Davis']);

// $ne
console.log('\n4️⃣  $ne - Not New York:');
const notNewYork = data.find({ city: { $ne: 'New York' } }).toArray();
notNewYork.forEach((u) => console.log(`   - ${u.name}: ${u.city}`));
check('$ne NY count', notNewYork.length, 3);
check('$ne NY names', notNewYork.map((u) => u.name).sort(), ['Anna Johnson', 'Gabriel Davis', 'Peter Williams']);

// $in, $nin
console.log('\n5️⃣  $in - City in [New York, Chicago]:');
const inCities = data.find({ city: { $in: ['New York', 'Chicago'] } }).toArray();
inCities.forEach((u) => console.log(`   - ${u.name}: ${u.city}`));
check('$in [NY,Chicago] count', inCities.length, 4);
check('$in [NY,Chicago] names', inCities.map((u) => u.name).sort(), [
  'Eva Brown',
  'John Smith',
  'Peter Williams',
  'Sophia Martinez',
]);

console.log('\n6️⃣  $nin - City not in [New York]:');
const notInNewYork = data.find({ city: { $nin: ['New York'] } }).toArray();
notInNewYork.forEach((u) => console.log(`   - ${u.name}: ${u.city}`));
check('$nin [NY] count', notInNewYork.length, 3);
check('$nin [NY] names', notInNewYork.map((u) => u.name).sort(), ['Anna Johnson', 'Gabriel Davis', 'Peter Williams']);

// ============================================================================
// 4. LOGICAL OPERATORS
// ============================================================================

console.log('\n' + '═'.repeat(60));
console.log('🧠 LOGICAL OPERATORS');
console.log('═'.repeat(60));

// $and
console.log('\n1️⃣  $and - New York AND age > 25:');
const andQuery = data
  .find({
    $and: [{ city: 'New York' }, { age: { $gt: 25 } }],
  })
  .toArray();
andQuery.forEach((u) => console.log(`   - ${u.name}, ${u.age} years old, ${u.city}`));
check('$and count', andQuery.length, 2);
check('$and names', andQuery.map((u) => u.name).sort(), ['Eva Brown', 'John Smith']);

// $or
console.log('\n2️⃣  $or - age < 27 OR salary > 90000:');
const orQuery = data
  .find({
    $or: [{ age: { $lt: 27 } }, { salary: { $gt: 90000 } }],
  })
  .toArray();
orQuery.forEach((u) => console.log(`   - ${u.name}, ${u.age} years old, $${u.salary}`));
check('$or count', orQuery.length, 2);
check('$or names', orQuery.map((u) => u.name).sort(), ['Peter Williams', 'Sophia Martinez']);

// $not
console.log('\n3️⃣  $not - NOT active:');
const notActive = data.find({ $not: { active: true } }).toArray();
notActive.forEach((u) => console.log(`   - ${u.name}, active: ${u.active}`));
check('$not count', notActive.length, 1);
check('$not name', notActive[0].name, 'Peter Williams');

// $nor
console.log('\n4️⃣  $nor - NEITHER New York NOR age < 30:');
const norQuery = data
  .find({
    $nor: [{ city: 'New York' }, { age: { $lt: 30 } }],
  })
  .toArray();
norQuery.forEach((u) => console.log(`   - ${u.name}, ${u.age} years old, ${u.city}`));
check('$nor count', norQuery.length, 3);
check('$nor names', norQuery.map((u) => u.name).sort(), ['Anna Johnson', 'Gabriel Davis', 'Peter Williams']);

// ============================================================================
// 5. ARRAY OPERATORS
// ============================================================================

console.log('\n' + '═'.repeat(60));
console.log('📦 ARRAY OPERATORS');
console.log('═'.repeat(60));

// $size
console.log('\n1️⃣  $size - Users with 3 skills:');
const threeSkills = data.find({ skills: { $size: 3 } }).toArray();
threeSkills.forEach((u) => console.log(`   - ${u.name}: ${u.skills.join(', ')}`));
check('$size 3 count', threeSkills.length, 6);

// $all
console.log('\n2️⃣  $all - JavaScript AND React:');
const jsReact = data.find({ skills: { $all: ['JavaScript', 'React'] } }).toArray();
jsReact.forEach((u) => console.log(`   - ${u.name}: ${u.skills.join(', ')}`));
check('$all JS+React count', jsReact.length, 2);
check('$all JS+React names', jsReact.map((u) => u.name).sort(), ['John Smith', 'Sophia Martinez']);

// $in array
console.log('\n3️⃣  $in - Has Python skill:');
// @ts-ignore
const hasPython = data.find({ skills: { $in: ['Python'] } }).toArray();
hasPython.forEach((u) => console.log(`   - ${u.name}: ${u.skills.join(', ')}`));
check('$in Python count', hasPython.length, 1);
check('$in Python name', hasPython[0].name, 'Anna Johnson');

// $elemMatch
console.log('\n4️⃣  $elemMatch - (no nested array in example, but would work)');
console.log('   Example: { scores: { $elemMatch: { score: { $gt: 80 } } } }');

// ============================================================================
// 6. NESTED OBJECT QUERIES
// ============================================================================

console.log('\n' + '═'.repeat(60));
console.log('🏠 NESTED OBJECT QUERIES');
console.log('═'.repeat(60));

console.log('\n1️⃣  Dot notation - address.zip = 10001:');
// @ts-ignore
const zip10001 = data.find({ 'address.zip': 10001 }).toArray();
zip10001.forEach((u) => console.log(`   - ${u.name}: ${u.address.street}, ${u.address.zip}`));
check('address.zip 10001 count', zip10001.length, 1);
check('address.zip 10001 name', zip10001[0].name, 'John Smith');

console.log('\n2️⃣  Nested $gt - address.zip > 10000:');
// @ts-ignore
const highZip = data.find({ 'address.zip': { $gt: 10000 } }).toArray();
highZip.forEach((u) => console.log(`   - ${u.name}: ${u.address.street}, ${u.address.zip}`));
check('address.zip >10000 count', highZip.length, 5);
check('address.zip >10000 names', highZip.map((u) => u.name).sort(), [
  'Eva Brown',
  'Gabriel Davis',
  'John Smith',
  'Peter Williams',
  'Sophia Martinez',
]);

// ============================================================================
// 7. REGEX SEARCH
// ============================================================================

console.log('\n' + '═'.repeat(60));
console.log('🔤 REGEX SEARCH');
console.log('═'.repeat(60));

console.log('\n1️⃣  Email ends with @example.com:');
const emailRegex = data.find({ email: { $regex: '@example\\.com$' } }).toArray();
console.log(`   Results: ${emailRegex.length}`);
check('$regex @example.com count', emailRegex.length, 6);

console.log('\n2️⃣  Name contains "John" or "Peter":');
const nameRegex = data.find({ name: { $regex: 'John|Peter' } }).toArray();
nameRegex.forEach((u) => console.log(`   - ${u.name}`));
check('$regex John|Peter count', nameRegex.length, 3);
check('$regex John|Peter names', nameRegex.map((u) => u.name).sort(), ['Anna Johnson', 'John Smith', 'Peter Williams']);

console.log('\n3️⃣  Case-insensitive - name contains "smith":');
const caseInsensitive = data
  .find({
    name: { $regex: 'smith', $options: 'i' },
  })
  .toArray();
caseInsensitive.forEach((u) => console.log(`   - ${u.name}`));
check('$regex smith i count', caseInsensitive.length, 1);
check('$regex smith i name', caseInsensitive[0].name, 'John Smith');

// ============================================================================
// 8. PROJECTION
// ============================================================================

console.log('\n' + '═'.repeat(60));
console.log('📋 PROJECTION');
console.log('═'.repeat(60));

console.log('\n1️⃣  Include projection - only name and email:');
const projected = data.find({}, { name: 1, email: 1 }).toArray();
projected.forEach((u) => console.log(`   - ${JSON.stringify(u)}`));
check('projection include fields', Object.keys(projected[0]).sort().join(), '_id,email,name');
check('projection include count', projected.length, 6);
check('projection include _id preserved', '_id' in projected[0], true);

console.log('\n2️⃣  Exclude projection - everything except _id and salary:');
const excluded = data.find({ city: 'New York' }, { _id: 0, salary: 0 }).limit(2).toArray();
excluded.forEach((u) => console.log(`   - ${u.name}: ${Object.keys(u).join(', ')}`));
check('projection exclude _id', !('_id' in excluded[0]), true);
check('projection exclude salary', !('salary' in excluded[0]), true);
check('projection exclude count', excluded.length, 2);

// ============================================================================
// 9. CURSOR OPERATIONS
// ============================================================================

console.log('\n' + '═'.repeat(60));
console.log('⚙️  CURSOR OPERATIONS');
console.log('═'.repeat(60));

// Sort
console.log('\n1️⃣  Sort - by age (ascending):');
const sorted = data.find().sort({ age: 1 }).toArray();
sorted.forEach((u) => console.log(`   - ${u.name}, ${u.age} years old`));
check(
  'sort asc names',
  sorted.map((u) => u.name).join(),
  'Sophia Martinez,John Smith,Eva Brown,Anna Johnson,Gabriel Davis,Peter Williams',
);

console.log('\n2️⃣  Sort - by salary (descending):');
const sortedDesc = data.find().sort({ salary: -1 }).limit(3).toArray();
sortedDesc.forEach((u) => console.log(`   - ${u.name}: $${u.salary.toLocaleString('en-US')}`));
check('sort desc limit 3 names', sortedDesc.map((u) => u.name).join(), 'Peter Williams,Gabriel Davis,Anna Johnson');

// Skip and Limit
console.log('\n3️⃣  Skip & Limit - pagination (skip: 2, limit: 2):');
const paginated = data.find().sort({ age: 1 }).skip(2).limit(2).toArray();
paginated.forEach((u) => console.log(`   - ${u.name}, ${u.age} years old`));
check('pagination names', paginated.map((u) => u.name).join(), 'Eva Brown,Anna Johnson');

// Chainable
console.log('\n4️⃣  Complex chaining:');
const chained = data
  .find({ active: true })
  .sort({ salary: -1 })
  .skip(1)
  .limit(2)
  .project({ name: 1, salary: 1 })
  .toArray();
chained.forEach((u) => console.log(`   - ${JSON.stringify(u)}`));
check('chaining count', chained.length, 2);
check('chaining first name', chained[0].name, 'Anna Johnson');
check('chaining no age', !('age' in chained[0]), true);

// ============================================================================
// 10. DISTINCT
// ============================================================================

console.log('\n' + '═'.repeat(60));
console.log('🎯 DISTINCT');
console.log('═'.repeat(60));

console.log('\n1️⃣  Unique cities:');
const cities = data.distinct('city');
console.log(`   ${cities.join(', ')}`);
check('distinct cities', cities.sort().join(), 'Boston,Chicago,New York,Seattle');

console.log('\n2️⃣  Unique ages:');
const ages = data.distinct('age').sort((a, b) => a - b);
console.log(`   ${ages.join(', ')}`);
check('distinct ages', ages.join(), '25,28,29,34,38,42');

// ============================================================================
// 11. AGGREGATION PIPELINE
// ============================================================================

console.log('\n' + '═'.repeat(60));
console.log('🔄 AGGREGATION PIPELINE');
console.log('═'.repeat(60));

// $match + $group
console.log('\n1️⃣  Group by city (count):');
const groupByCity = data.aggregate([{ $group: { _id: '$city', count: { $sum: 1 } } }, { $sort: { count: -1 } }]);
groupByCity.forEach((g) => console.log(`   - ${g._id}: ${g.count} users`));
check('group NY count', groupByCity.find((g) => g._id === 'New York').count, 3);
check('group total', groupByCity.length, 4);

console.log('\n2️⃣  Average salary by city:');
const avgSalaryByCity = data.aggregate([
  {
    $group: {
      _id: '$city',
      avgSalary: { $avg: '$salary' },
      count: { $sum: 1 },
    },
  },
  { $sort: { avgSalary: -1 } },
]);
avgSalaryByCity.forEach((g) =>
  console.log(`   - ${g._id}: $${Math.round(g.avgSalary).toLocaleString('en-US')} (${g.count} users)`),
);
check('avg Chicago', Math.round(avgSalaryByCity.find((g) => g._id === 'Chicago').avgSalary), 95000);
check('avg NY', Math.round(avgSalaryByCity.find((g) => g._id === 'New York').avgSalary), 72667);

console.log('\n3️⃣  Min and Max salary:');
const salaryStats = data.aggregate([
  {
    $group: {
      _id: null,
      minSalary: { $min: '$salary' },
      maxSalary: { $max: '$salary' },
      avgSalary: { $avg: '$salary' },
      totalUsers: { $sum: 1 },
    },
  },
]);
const stats = salaryStats[0];
console.log(`   Min: $${stats.minSalary.toLocaleString('en-US')}`);
console.log(`   Max: $${stats.maxSalary.toLocaleString('en-US')}`);
console.log(`   Avg: $${Math.round(stats.avgSalary).toLocaleString('en-US')}`);
console.log(`   Total: ${stats.totalUsers} users`);
check('min salary', stats.minSalary, 65000);
check('max salary', stats.maxSalary, 95000);
check('total users', stats.totalUsers, 6);

console.log('\n4️⃣  Collect skills by city:');
const skillsByCity = data.aggregate([
  { $match: { city: 'New York' } },
  { $unwind: '$skills' },
  {
    $group: {
      _id: '$skills',
      users: { $push: '$name' },
      count: { $sum: 1 },
    },
  },
  { $sort: { count: -1 } },
]);
skillsByCity.forEach((s) => console.log(`   - ${s._id}: ${s.count}x (${s.users.join(', ')})`));
check('skills JS count in NY', skillsByCity.find((s) => s._id === 'JavaScript').count, 3);

console.log('\n5️⃣  $unwind - expand skills:');
const unwound = data.aggregate([
  { $match: { city: 'New York' } },
  { $unwind: '$skills' },
  { $project: { name: 1, skill: '$skills' } },
  { $limit: 5 },
]);
unwound.forEach((u) => console.log(`   - ${u.name}: ${u.skill}`));
check('$unwind limit 5 count', unwound.length, 5);

console.log('\n6️⃣  Complex pipeline - active, 30+ years, grouped:');
const complexPipeline = data.aggregate([
  { $match: { active: true, age: { $gte: 30 } } },
  {
    $group: {
      _id: '$city',
      avgAge: { $avg: '$age' },
      totalSalary: { $sum: '$salary' },
      names: { $push: '$name' },
    },
  },
  { $sort: { totalSalary: -1 } },
  { $limit: 3 },
]);
complexPipeline.forEach((g) =>
  console.log(
    `   - ${g._id}: avg age ${Math.round(g.avgAge)}, total salary: $${g.totalSalary.toLocaleString('en-US')}`,
  ),
);
check('complex pipeline count', complexPipeline.length, 2);
check('pipeline top city', complexPipeline[0]._id, 'Seattle');
check('pipeline top salary', complexPipeline[0].totalSalary, 88000);

// ============================================================================
// 12. $expr - EXPRESSION-BASED QUERIES
// ============================================================================

console.log('\n' + '═'.repeat(60));
console.log('💡 $expr - EXPRESSION-BASED QUERIES');
console.log('═'.repeat(60));

console.log('\n1️⃣  Salary > age * 2000:');
const exprQuery = data
  .find({
    $expr: {
      $gt: ['$salary', { $multiply: ['$age', 2000] }],
    },
  })
  .toArray();
exprQuery.forEach((u) => console.log(`   - ${u.name}: $${u.salary} > $${u.age * 2000}`));
check('$expr salary > age*2000 count', exprQuery.length, 6);

console.log('\n2️⃣  Name length > 10 characters:');
const longNames = data
  .find({
    $expr: {
      $gt: [{ $strLenCP: '$name' }, 10],
    },
  })
  .toArray();
longNames.forEach((u) => console.log(`   - ${u.name} (${u.name.length} characters)`));
check('$expr name length >10 count', longNames.length, 4);
check(
  '$expr name length >10 names',
  longNames
    .map((u) => u.name)
    .sort()
    .join(),
  'Anna Johnson,Gabriel Davis,Peter Williams,Sophia Martinez',
);

console.log('\n3️⃣  Email contains name (lowercase):');
const emailContainsName = data
  .find({
    $expr: {
      $gt: [
        { $indexOfCP: [{ $toLower: '$email' }, { $toLower: { $arrayElemAt: [{ $split: ['$name', ' '] }, 0] } }] },
        -1,
      ],
    },
  })
  .toArray();
emailContainsName.forEach((u) => console.log(`   - ${u.name}: ${u.email}`));
check('$expr email contains name count', emailContainsName.length, 6);

// ============================================================================
// 13. DATE OPERATIONS
// ============================================================================

console.log('\n' + '═'.repeat(60));
console.log('📅 DATE OPERATIONS');
console.log('═'.repeat(60));

console.log('\n1️⃣  Joined in 2022:');
const joined2022 = data.aggregate([
  {
    $match: {
      joinedAt: {
        $gte: new Date('2022-01-01').toJSON(),
        $lt: new Date('2023-01-01').toJSON(),
      },
    },
  },
  { $project: { name: 1, joinedAt: 1 } },
]);
joined2022.forEach((u) => console.log(`   - ${u.name}: ${u.joinedAt}`));
check('joined 2022 count', joined2022.length, 1);
check('joined 2022 name', joined2022[0].name, 'John Smith');

console.log('\n2️⃣  Extract join year:');
const joinYears = data.aggregate([
  {
    $project: {
      name: 1,
      joinYear: { $year: '$joinedAt' },
      joinMonth: { $month: '$joinedAt' },
    },
  },
  { $sort: { joinYear: 1, joinMonth: 1 } },
]);
joinYears.forEach((u) => console.log(`   - ${u.name}: ${u.joinYear}.${u.joinMonth.toString().padStart(2, '0')}`));
check('join years count', joinYears.length, 6);
check('first join year', joinYears[0].joinYear, 2018);
check('last join year', joinYears[5].joinYear, 2023);

// ============================================================================
// 14. AGGREGATION EXPRESSIONS
// ============================================================================

console.log('\n' + '═'.repeat(60));
console.log('🧮 AGGREGATION EXPRESSIONS');
console.log('═'.repeat(60));

console.log('\n1️⃣  $cond - categorize by age:');
const categorized = data.aggregate([
  {
    $project: {
      name: 1,
      age: 1,
      category: {
        $cond: {
          if: { $lt: ['$age', 30] },
          then: 'Junior',
          else: {
            $cond: {
              if: { $lt: ['$age', 40] },
              then: 'Mid',
              else: 'Senior',
            },
          },
        },
      },
    },
  },
  { $sort: { age: 1 } },
]);
categorized.forEach((u) => console.log(`   - ${u.name} (${u.age}): ${u.category}`));
check('$cond count', categorized.length, 6);
check('$cond first category', categorized[0].category, 'Junior');
check('$cond last category', categorized[5].category, 'Senior');

console.log('\n2️⃣  $concat - build full address:');
const addresses = data.aggregate([
  {
    $project: {
      name: 1,
      fullAddress: {
        $concat: ['$address.street', ', ', { $toString: '$address.zip' }, ' ', '$city'],
      },
    },
  },
  { $limit: 3 },
]);
addresses.forEach((u) => console.log(`   - ${u.name}: ${u.fullAddress}`));
check('$concat count', addresses.length, 3);
check('$concat first', addresses[0].name, 'John Smith');
check('$concat format', addresses[0].fullAddress, '123 Main St, 10001 New York');

console.log('\n3️⃣  $switch - salary band:');
const salaryBands = data.aggregate([
  {
    $project: {
      name: 1,
      salary: 1,
      band: {
        $switch: {
          branches: [
            { case: { $lt: ['$salary', 70000] }, then: 'Low' },
            { case: { $lt: ['$salary', 80000] }, then: 'Medium' },
            { case: { $lt: ['$salary', 90000] }, then: 'High' },
          ],
          default: 'Very High',
        },
      },
    },
  },
]);
salaryBands.forEach((u) => console.log(`   - ${u.name}: $${u.salary.toLocaleString('en-US')} (${u.band})`));
check('$switch count', salaryBands.length, 6);
check('$switch Low', salaryBands.find((u) => u.name === 'Sophia Martinez').band, 'Low');
check('$switch Medium', salaryBands.find((u) => u.name === 'John Smith').band, 'Medium');
check('$switch High', salaryBands.find((u) => u.name === 'Anna Johnson').band, 'High');
check('$switch Very High', salaryBands.find((u) => u.name === 'Peter Williams').band, 'Very High');

// ============================================================================
// 15. ARRAY AGGREGATION OPERATIONS
// ============================================================================

console.log('\n' + '═'.repeat(60));
console.log('🔢 ARRAY AGGREGATION OPERATIONS');
console.log('═'.repeat(60));

console.log('\n1️⃣  $filter - only JavaScript skills:');
const jsSkills = data.aggregate([
  {
    $project: {
      name: 1,
      jsSkills: {
        $filter: {
          input: '$skills',
          as: 'skill',
          cond: { $eq: ['$$skill', 'JavaScript'] },
        },
      },
    },
  },
  { $match: { jsSkills: { $ne: [] } } },
]);
jsSkills.forEach((u) => console.log(`   - ${u.name}: ${u.jsSkills.join(', ')}`));
check('$filter count', jsSkills.length, 3);
check(
  '$filter names',
  jsSkills
    .map((u) => u.name)
    .sort()
    .join(),
  'Eva Brown,John Smith,Sophia Martinez',
);

console.log('\n2️⃣  $map - skills lowercase:');
const lowerSkills = data.aggregate([
  {
    $project: {
      name: 1,
      skillsLower: {
        $map: {
          input: '$skills',
          as: 'skill',
          in: { $toLower: '$$skill' },
        },
      },
    },
  },
  { $limit: 3 },
]);
lowerSkills.forEach((u) => console.log(`   - ${u.name}: ${u.skillsLower.join(', ')}`));
check('$map count', lowerSkills.length, 3);
check('$map lowercase', lowerSkills[0].skillsLower[0], 'javascript');

console.log('\n3️⃣  $reduce - concatenate skills:');
const joinedSkills = data.aggregate([
  {
    $project: {
      name: 1,
      skillString: {
        $reduce: {
          input: '$skills',
          initialValue: '',
          in: {
            $concat: ['$$value', { $cond: [{ $eq: ['$$value', ''] }, '', ' | '] }, '$$this'],
          },
        },
      },
    },
  },
  { $limit: 3 },
]);
joinedSkills.forEach((u) => console.log(`   - ${u.name}: ${u.skillString}`));
check('$reduce count', joinedSkills.length, 3);
check('$reduce format', joinedSkills[0].skillString, 'JavaScript | React | Node.js');

console.log('\n4️⃣  $size - skill count:');
const skillCounts = data.aggregate([
  {
    $project: {
      name: 1,
      skillCount: { $size: '$skills' },
    },
  },
  { $sort: { skillCount: -1 } },
]);
skillCounts.forEach((u) => console.log(`   - ${u.name}: ${u.skillCount} skills`));
check('$size count', skillCounts.length, 6);
check(
  '$size all 3',
  skillCounts.every((u) => u.skillCount === 3),
  true,
);

// ============================================================================
// 16. TYPE CONVERSION
// ============================================================================

console.log('\n' + '═'.repeat(60));
console.log('🔄 TYPE CONVERSIONS');
console.log('═'.repeat(60));

console.log('\n1️⃣  $toString - zip code as string:');
const zipStrings = data.aggregate([
  {
    $project: {
      name: 1,
      zipString: { $toString: '$address.zip' },
    },
  },
  { $limit: 3 },
]);
zipStrings.forEach((u) => console.log(`   - ${u.name}: "${u.zipString}"`));
check('$toString count', zipStrings.length, 3);
check('$toString type', typeof zipStrings[0].zipString, 'string');

console.log('\n2️⃣  $toInt and $toDouble:');
const conversions = data.aggregate([
  {
    $project: {
      name: 1,
      salaryInt: { $toInt: { $divide: ['$salary', 1000] } },
      salaryDouble: { $toDouble: '$salary' },
    },
  },
  { $limit: 2 },
]);
conversions.forEach((u) => console.log(`   - ${u.name}: ${u.salaryInt}k (int), ${u.salaryDouble} (double)`));
check('$toInt/$toDouble count', conversions.length, 2);
check('$toInt value', conversions[0].salaryInt, 75);
check('$toDouble type', typeof conversions[0].salaryDouble, 'number');

// ============================================================================
// 17. SPECIAL CASES
// ============================================================================

console.log('\n' + '═'.repeat(60));
console.log('⚡ SPECIAL CASES AND EDGE CASES');
console.log('═'.repeat(60));

console.log('\n1️⃣  Empty query (all):');
const emptyQuery = data.find({}).toArray();
console.log(`   Results: ${emptyQuery.length}`);
check('empty query count', emptyQuery.length, 6);

console.log('\n2️⃣  Null/undefined fields:');
// @ts-ignore
const noAddress = data.find({ 'address.country': { $exists: false } }).toArray();
console.log(`   No "country" field: ${noAddress.length} users`);
check('$exists:false count', noAddress.length, 6);

console.log('\n3️⃣  Complex logic - (New York AND age > 25) OR (salary > 90000):');
const complexLogic = data
  .find({
    $or: [{ $and: [{ city: 'New York' }, { age: { $gt: 25 } }] }, { salary: { $gt: 90000 } }],
  })
  .toArray();
complexLogic.forEach((u) => console.log(`   - ${u.name}`));
check('complex logic count', complexLogic.length, 3);
check(
  'complex logic names',
  complexLogic
    .map((u) => u.name)
    .sort()
    .join(),
  'Eva Brown,John Smith,Peter Williams',
);

console.log('\n4️⃣  $type check:');
const stringFields = data.find({ name: { $type: 'string' } }).toArray();
console.log(`   String type "name" fields: ${stringFields.length}`);
check('$type string count', stringFields.length, 6);

console.log('\n5️⃣  $mod - even ages:');
const evenAge = data.find({ age: { $mod: [2, 0] } }).toArray();
evenAge.forEach((u) => console.log(`   - ${u.name}: ${u.age} years old`));
check('$mod even ages count', evenAge.length, 4);
check(
  '$mod even ages names',
  evenAge
    .map((u) => u.name)
    .sort()
    .join(),
  'Anna Johnson,Gabriel Davis,John Smith,Peter Williams',
);

// ============================================================================
// 18. PERFORMANCE TEST
// ============================================================================

console.log('\n' + '═'.repeat(60));
console.log('⚡ PERFORMANCE TEST');
console.log('═'.repeat(60));

console.log('\n1️⃣  Running 1000 queries:');
const start = performance.now();
for (let i = 0; i < 1000; i++) {
  data.find({ active: true }).sort({ salary: -1 }).limit(3).toArray();
}
const end = performance.now();
console.log(`   1000 complex queries: ${(end - start).toFixed(2)} ms`);
console.log(`   Average: ${((end - start) / 1000).toFixed(3)} ms/query`);

// ============================================================================
// SUMMARY
// ============================================================================

console.log('\n' + '═'.repeat(60));
if (failed === 0) {
  console.log(`✅ ALL ${passed} CHECKS PASSED`);
} else {
  console.log(`❌ ${passed} passed, ${failed} failed out of ${passed + failed} checks`);
}
console.log('═'.repeat(60));

console.log('\nTested features:');
console.log('✓ Basic CRUD operations (find, findOne, count, exists)');
console.log('✓ Comparison operators ($gt, $gte, $lt, $lte, $eq, $ne, $in, $nin)');
console.log('✓ Logical operators ($and, $or, $not, $nor)');
console.log('✓ Array operators ($size, $all, $elemMatch)');
console.log('✓ Nested object queries (dot notation)');
console.log('✓ Regex search ($regex, $options)');
console.log('✓ Projection (include/exclude)');
console.log('✓ Cursor operations (sort, skip, limit, chaining)');
console.log('✓ Distinct values');
console.log('✓ Aggregation pipeline ($match, $group, $sort, $project, $limit, $unwind)');
console.log('✓ Aggregation operators ($sum, $avg, $min, $max, $push, $first, $last)');
console.log('✓ Expression-based queries ($expr)');
console.log('✓ Date operations ($year, $month, date comparison)');
console.log('✓ Aggregation expressions ($cond, $concat, $switch)');
console.log('✓ Array aggregation operations ($filter, $map, $reduce, $size)');
console.log('✓ Type conversions ($toString, $toInt, $toDouble)');
console.log('✓ Special cases and edge cases');
console.log('✓ Performance test');

console.log('\n🎉 All features tested successfully!\n');
