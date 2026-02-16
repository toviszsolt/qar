import { objValueResolve } from './object.js';
import { typeOf } from './typeOf.js';

const MIN_OPERAND_COUNT = 2;
const DEFAULT_INDEX = 0;
const MIN_SUBSTR_ARGS = 3;

const evaluateOperand = (operand, ctx) => {
  if (operand instanceof Date) {
    return operand;
  }

  if (typeOf(operand) === 'string') {
    if (operand.startsWith('$$')) {
      const varName = operand.slice(2);
      return ctx && ctx.__vars ? ctx.__vars[varName] : undefined;
    }

    if (operand.startsWith('$')) {
      return objValueResolve(ctx, operand.slice(1));
    }
  }

  if (typeOf(operand) === 'array') {
    return operand.map((o) => evaluateOperand(o, ctx));
  }

  if (typeOf(operand) === 'object') {
    return evaluateExpression(operand, ctx);
  }

  return operand;
};

const handleLogical = (op, expr, ctx) => {
  if (op === '$and') {
    const arr = expr[op];
    if (typeOf(arr) !== 'array') return { handled: true, result: false };
    return { handled: true, result: arr.every((e) => Boolean(evaluateExpression(e, ctx))) };
  }

  if (op === '$or') {
    const arr = expr[op];
    if (typeOf(arr) !== 'array') return { handled: true, result: false };
    return { handled: true, result: arr.some((e) => Boolean(evaluateExpression(e, ctx))) };
  }

  if (op === '$not') {
    return { handled: true, result: !Boolean(evaluateExpression(expr[op], ctx)) };
  }

  return undefined;
};

const handleArithmetic = (op, expr, ctx) => {
  const ops = ['$add', '$subtract', '$multiply', '$divide'];
  if (!ops.includes(op)) return undefined;
  const operands = expr[op];
  if (typeOf(operands) !== 'array' || operands.length < MIN_OPERAND_COUNT) return { handled: true, result: false };

  const leftValue = evaluateOperand(operands[0], ctx);
  const rightValue = evaluateOperand(operands[1], ctx);

  switch (op) {
    case '$add':
      return { handled: true, result: leftValue + rightValue };
    case '$subtract':
      return { handled: true, result: leftValue - rightValue };
    case '$multiply':
      return { handled: true, result: leftValue * rightValue };
    case '$divide':
      return { handled: true, result: leftValue / rightValue };
  }
};

const handleComparison = (op, expr, ctx) => {
  const ops = ['$lt', '$lte', '$gt', '$gte', '$eq', '$ne'];
  if (!ops.includes(op)) return undefined;
  const operands = expr[op];
  if (typeOf(operands) !== 'array' || operands.length < MIN_OPERAND_COUNT) return { handled: true, result: false };

  const leftValue = evaluateOperand(operands[0], ctx);
  const rightValue = evaluateOperand(operands[1], ctx);

  switch (op) {
    case '$lt':
      return { handled: true, result: leftValue < rightValue };
    case '$lte':
      return { handled: true, result: leftValue <= rightValue };
    case '$gt':
      return { handled: true, result: leftValue > rightValue };
    case '$gte':
      return { handled: true, result: leftValue >= rightValue };
    case '$eq':
      return { handled: true, result: leftValue === rightValue };
    case '$ne':
      return { handled: true, result: leftValue !== rightValue };
  }
};

const handleArrayMembership = (op, expr, ctx) => {
  if (op !== '$in') return undefined;
  const operands = expr[op];
  if (typeOf(operands) !== 'array' || operands.length < MIN_OPERAND_COUNT) return { handled: true, result: false };
  const value = evaluateOperand(operands[0], ctx);
  const list = evaluateOperand(operands[1], ctx);
  return { handled: true, result: typeOf(list) === 'array' && list.includes(value) };
};

const handleStringOperators = (op, expr, ctx) => {
  if (op === '$strLenCP') {
    const val = evaluateOperand(expr[op], ctx);
    if (val == null) return { handled: true, result: 0 };
    if (typeOf(val) === 'array') return { handled: true, result: val.length };
    return { handled: true, result: Array.from(String(val)).length };
  }

  if (op === '$indexOfCP') {
    const args = expr[op];
    if (typeOf(args) !== 'array' || args.length < MIN_OPERAND_COUNT) return { handled: true, result: -1 };
    const sourceString = String(evaluateOperand(args[0], ctx));
    const substring = String(evaluateOperand(args[1], ctx));
    const start = args.length > 2 ? Number(evaluateOperand(args[2], ctx)) || DEFAULT_INDEX : DEFAULT_INDEX;
    return { handled: true, result: sourceString.indexOf(substring, start) };
  }

  if (op === '$split') {
    const args = expr[op];
    if (typeOf(args) !== 'array' || args.length < MIN_OPERAND_COUNT) return { handled: true, result: [] };
    const sourceString = String(evaluateOperand(args[0], ctx));
    const delim = String(evaluateOperand(args[1], ctx));
    return { handled: true, result: sourceString.split(delim) };
  }

  return undefined;
};

const handleArrayOperators = (op, expr, ctx) => {
  if (op === '$size') {
    const val = evaluateOperand(expr[op], ctx);
    return { handled: true, result: typeOf(val) === 'array' ? val.length : 0 };
  }

  if (op === '$arrayElemAt') {
    const args = expr[op];
    if (typeOf(args) !== 'array' || args.length < MIN_OPERAND_COUNT) return { handled: true, result: undefined };
    const arr = evaluateOperand(args[0], ctx);
    const index = Number(evaluateOperand(args[1], ctx));
    if (typeOf(arr) !== 'array') return { handled: true, result: undefined };
    return { handled: true, result: index < 0 ? arr[arr.length + index] : arr[index] };
  }

  if (op === '$filter') {
    const spec = expr[op];
    if (typeOf(spec) !== 'object') return [];
    const input = evaluateOperand(spec.input, ctx);
    if (typeOf(input) !== 'array') return [];
    const as = spec.as || 'this';
    const cond = spec.cond;
    return {
      handled: true,
      result: input.filter((el, i) => {
        const localCtx = Object.assign({}, el);
        localCtx.__vars = Object.assign({}, ctx && ctx.__vars ? ctx.__vars : {}, { [as]: el, index: i });
        return Boolean(evaluateExpression(cond, localCtx));
      }),
    };
  }

  if (op === '$map') {
    const spec = expr[op];
    if (typeOf(spec) !== 'object') return [];
    const input = evaluateOperand(spec.input, ctx);
    if (typeOf(input) !== 'array') return [];
    const as = spec.as || 'this';
    const inExpr = spec.in;
    return {
      handled: true,
      result: input.map((el, i) => {
        const localCtx = Object.assign({}, el);
        localCtx.__vars = Object.assign({}, ctx && ctx.__vars ? ctx.__vars : {}, { [as]: el, index: i });
        return evaluateExpression(inExpr, localCtx);
      }),
    };
  }

  if (op === '$reduce') {
    const spec = expr[op];
    if (typeOf(spec) !== 'object') return { handled: true, result: null };
    const input = evaluateOperand(spec.input, ctx);
    const inExpr = spec.in;
    const initial = evaluateOperand(spec.initialValue, ctx);
    if (typeOf(input) !== 'array') return { handled: true, result: initial };
    return {
      handled: true,
      result: input.reduce((accumulator, el, i) => {
        const localCtx = Object.assign({}, el);
        localCtx.__vars = Object.assign({}, ctx && ctx.__vars ? ctx.__vars : {}, {
          value: accumulator,
          this: el,
          index: i,
        });
        return evaluateExpression(inExpr, localCtx);
      }, initial),
    };
  }

  return undefined;
};

const handleDateOperators = (op, expr, ctx) => {
  const dateOps = ['$year', '$month', '$dayOfMonth', '$hour', '$minute', '$second'];
  if (!dateOps.includes(op)) return undefined;
  const parsedDate = new Date(evaluateOperand(expr[op], ctx));
  if (isNaN(parsedDate.getTime())) return { handled: true, result: null };

  switch (op) {
    case '$year':
      return { handled: true, result: parsedDate.getUTCFullYear() };
    case '$month':
      return { handled: true, result: parsedDate.getUTCMonth() + 1 };
    case '$dayOfMonth':
      return { handled: true, result: parsedDate.getUTCDate() };
    case '$hour':
      return { handled: true, result: parsedDate.getUTCHours() };
    case '$minute':
      return { handled: true, result: parsedDate.getUTCMinutes() };
    case '$second':
      return { handled: true, result: parsedDate.getUTCSeconds() };
  }
};

const handleConditional = (op, expr, ctx) => {
  if (op === '$cond') {
    const args = expr[op];
    if (typeOf(args) === 'array' && args.length === 3) {
      return {
        handled: true,
        result: evaluateOperand(args[0], ctx) ? evaluateOperand(args[1], ctx) : evaluateOperand(args[2], ctx),
      };
    }

    if (typeOf(args) === 'object') {
      const { if: ifExpr, then: thenExpr, else: elseExpr } = args;
      return {
        handled: true,
        result: evaluateExpression(ifExpr, ctx) ? evaluateExpression(thenExpr, ctx) : evaluateExpression(elseExpr, ctx),
      };
    }

    return { handled: true, result: null };
  }
  if (op === '$ifNull') {
    const args = expr[op];
    if (typeOf(args) !== 'array' || args.length < MIN_OPERAND_COUNT)
      return { handled: true, result: evaluateOperand(args, ctx) };
    const a = evaluateOperand(args[0], ctx);
    return { handled: true, result: a == null ? evaluateOperand(args[1], ctx) : a };
  }

  if (op === '$switch') {
    const spec = expr[op];
    if (typeOf(spec) !== 'object') return { handled: true, result: null };
    const branches = spec.branches || [];
    for (const br of branches) {
      if (evaluateExpression(br.case, ctx)) return { handled: true, result: evaluateExpression(br.then, ctx) };
    }
    return { handled: true, result: spec.default !== undefined ? evaluateExpression(spec.default, ctx) : null };
  }

  return undefined;
};

const handleTypeConversion = (op, expr, ctx) => {
  if (op === '$toString') {
    const value = evaluateOperand(expr[op], ctx);
    return { handled: true, result: value == null ? null : String(value) };
  }

  if (op === '$toInt') {
    const value = evaluateOperand(expr[op], ctx);
    return { handled: true, result: Number.parseInt(value, 10) || 0 };
  }

  if (op === '$toDouble') {
    const value = evaluateOperand(expr[op], ctx);
    return { handled: true, result: Number.parseFloat(value) || 0.0 };
  }

  if (op === '$toDate') {
    const v = evaluateOperand(expr[op], ctx);
    const d = new Date(v);
    return { handled: true, result: isNaN(d.getTime()) ? null : d };
  }

  return undefined;
};

const handleStringHelpers = (op, expr, ctx) => {
  if (op === '$concat') {
    const parts = expr[op];
    if (typeOf(parts) !== 'array') return { handled: true, result: '' };
    return { handled: true, result: parts.map((p) => evaluateOperand(p, ctx)).join('') };
  }

  if (op === '$toLower') {
    const v = evaluateOperand(expr[op], ctx);
    return { handled: true, result: v == null ? v : String(v).toLowerCase() };
  }

  if (op === '$toUpper') {
    const v = evaluateOperand(expr[op], ctx);
    return { handled: true, result: v == null ? v : String(v).toUpperCase() };
  }

  if (op === '$substr') {
    const args = expr[op];
    if (typeOf(args) !== 'array' || args.length < MIN_SUBSTR_ARGS) return { handled: true, result: '' };
    const str = String(evaluateOperand(args[0], ctx));
    const start = Number(evaluateOperand(args[1], ctx)) || DEFAULT_INDEX;
    const len = Number(evaluateOperand(args[2], ctx)) || DEFAULT_INDEX;
    return { handled: true, result: str.substr(start, len) };
  }

  return undefined;
};

const evaluateExpression = (expr, ctx) => {
  if (expr == null) return expr;
  if (typeOf(expr) !== 'object') return expr;
  const keys = Object.keys(expr);
  if (keys.length === 0) return false;
  const op = keys[0];

  const handlers = [
    handleLogical,
    handleArithmetic,
    handleComparison,
    handleArrayMembership,
    handleStringOperators,
    handleArrayOperators,
    handleDateOperators,
    handleConditional,
    handleTypeConversion,
    handleStringHelpers,
  ];

  for (const h of handlers) {
    const res = h(op, expr, ctx);
    if (res !== undefined) return res.handled ? res.result : res;
  }

  return false;
};

export { evaluateExpression, evaluateOperand };
