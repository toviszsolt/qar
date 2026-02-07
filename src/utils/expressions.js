import { objValueResolve } from './object.js';
import { typeOf } from './typeOf.js';

const evaluateOperand = (operand, ctx) => {
  if (operand instanceof Date) return operand;
  if (typeOf(operand) === 'string') {
    if (operand.startsWith('$$')) {
      const varName = operand.slice(2);
      return ctx && ctx.__vars ? ctx.__vars[varName] : undefined;
    }
    if (operand.startsWith('$')) {
      return objValueResolve(ctx, operand.slice(1));
    }
  }
  if (typeOf(operand) === 'array') return operand.map((o) => evaluateOperand(o, ctx));
  if (typeOf(operand) === 'object') return evaluateExpression(operand, ctx);
  return operand;
};

const evaluateExpression = (expr, ctx) => {
  if (expr == null) return expr;
  if (typeOf(expr) !== 'object') return expr;
  const keys = Object.keys(expr);
  if (keys.length === 0) return false;

  const op = keys[0];

  // Logical
  if (op === '$and') {
    const arr = expr[op];
    if (typeOf(arr) !== 'array') return false;
    return arr.every((e) => Boolean(evaluateExpression(e, ctx)));
  }
  if (op === '$or') {
    const arr = expr[op];
    if (typeOf(arr) !== 'array') return false;
    return arr.some((e) => Boolean(evaluateExpression(e, ctx)));
  }
  if (op === '$not') {
    return !Boolean(evaluateExpression(expr[op], ctx));
  }

  // Arithmetic
  if (['$add', '$subtract', '$multiply', '$divide'].includes(op)) {
    const operands = expr[op];
    if (typeOf(operands) !== 'array' || operands.length < 2) return false;
    const left = evaluateOperand(operands[0], ctx);
    const right = evaluateOperand(operands[1], ctx);
    switch (op) {
      case '$add':
        return left + right;
      case '$subtract':
        return left - right;
      case '$multiply':
        return left * right;
      case '$divide':
        return left / right;
    }
  }

  // Comparison
  if (['$lt', '$lte', '$gt', '$gte', '$eq', '$ne'].includes(op)) {
    const operands = expr[op];
    if (typeOf(operands) !== 'array' || operands.length < 2) return false;
    const l = evaluateOperand(operands[0], ctx);
    const r = evaluateOperand(operands[1], ctx);
    switch (op) {
      case '$lt':
        return l < r;
      case '$lte':
        return l <= r;
      case '$gt':
        return l > r;
      case '$gte':
        return l >= r;
      case '$eq':
        return l === r;
      case '$ne':
        return l !== r;
    }
  }

  // Array / membership
  if (op === '$in') {
    const operands = expr[op];
    if (typeOf(operands) !== 'array' || operands.length < 2) return false;
    const val = evaluateOperand(operands[0], ctx);
    const list = evaluateOperand(operands[1], ctx);
    return typeOf(list) === 'array' && list.includes(val);
  }

  // String operators
  if (op === '$strLenCP') {
    const v = evaluateOperand(expr[op], ctx);
    if (v == null) return 0;
    if (typeOf(v) === 'array') return v.length;
    return Array.from(String(v)).length;
  }
  if (op === '$indexOfCP') {
    const args = expr[op];
    if (typeOf(args) !== 'array' || args.length < 2) return -1;
    const s = String(evaluateOperand(args[0], ctx));
    const sub = String(evaluateOperand(args[1], ctx));
    const start = args.length > 2 ? Number(evaluateOperand(args[2], ctx)) || 0 : 0;
    return s.indexOf(sub, start);
  }
  if (op === '$split') {
    const args = expr[op];
    if (typeOf(args) !== 'array' || args.length < 2) return [];
    const s = String(evaluateOperand(args[0], ctx));
    const delim = String(evaluateOperand(args[1], ctx));
    return s.split(delim);
  }

  // Array operators
  if (op === '$size') {
    const v = evaluateOperand(expr[op], ctx);
    return typeOf(v) === 'array' ? v.length : 0;
  }
  if (op === '$arrayElemAt') {
    const args = expr[op];
    if (typeOf(args) !== 'array' || args.length < 2) return undefined;
    const arr = evaluateOperand(args[0], ctx);
    const idx = Number(evaluateOperand(args[1], ctx));
    if (typeOf(arr) !== 'array') return undefined;
    return idx < 0 ? arr[arr.length + idx] : arr[idx];
  }
  if (op === '$filter') {
    const spec = expr[op];
    // support object form: { input, as, cond }
    if (typeOf(spec) !== 'object') return [];
    const input = evaluateOperand(spec.input, ctx);
    if (typeOf(input) !== 'array') return [];
    const as = spec.as || 'this';
    const cond = spec.cond;
    return input.filter((el, i) => {
      const localCtx = Object.assign({}, el);
      localCtx.__vars = Object.assign({}, ctx && ctx.__vars ? ctx.__vars : {}, { [as]: el, index: i });
      return Boolean(evaluateExpression(cond, localCtx));
    });
  }
  if (op === '$map') {
    const spec = expr[op];
    if (typeOf(spec) !== 'object') return [];
    const input = evaluateOperand(spec.input, ctx);
    if (typeOf(input) !== 'array') return [];
    const as = spec.as || 'this';
    const inExpr = spec.in;
    return input.map((el, i) => {
      const localCtx = Object.assign({}, el);
      localCtx.__vars = Object.assign({}, ctx && ctx.__vars ? ctx.__vars : {}, { [as]: el, index: i });
      return evaluateExpression(inExpr, localCtx);
    });
  }
  if (op === '$reduce') {
    const spec = expr[op];
    if (typeOf(spec) !== 'object') return null;
    const input = evaluateOperand(spec.input, ctx);
    const inExpr = spec.in;
    const initial = evaluateOperand(spec.initialValue, ctx);
    if (typeOf(input) !== 'array') return initial;
    return input.reduce((acc, el, i) => {
      const localCtx = Object.assign({}, el);
      localCtx.__vars = Object.assign({}, ctx && ctx.__vars ? ctx.__vars : {}, { value: acc, this: el, index: i });
      return evaluateExpression(inExpr, localCtx);
    }, initial);
  }

  // Date operators
  if (
    op === '$year' ||
    op === '$month' ||
    op === '$dayOfMonth' ||
    op === '$hour' ||
    op === '$minute' ||
    op === '$second'
  ) {
    const d = new Date(evaluateOperand(expr[op], ctx));
    if (isNaN(d.getTime())) return null;
    switch (op) {
      case '$year':
        return d.getUTCFullYear();
      case '$month':
        return d.getUTCMonth() + 1;
      case '$dayOfMonth':
        return d.getUTCDate();
      case '$hour':
        return d.getUTCHours();
      case '$minute':
        return d.getUTCMinutes();
      case '$second':
        return d.getUTCSeconds();
    }
  }

  // Conditional
  if (op === '$cond') {
    const args = expr[op];
    if (typeOf(args) === 'array' && args.length === 3) {
      return evaluateOperand(args[0], ctx) ? evaluateOperand(args[1], ctx) : evaluateOperand(args[2], ctx);
    }
    if (typeOf(args) === 'object') {
      const { if: ifExpr, then: thenExpr, else: elseExpr } = args;
      return evaluateExpression(ifExpr, ctx) ? evaluateExpression(thenExpr, ctx) : evaluateExpression(elseExpr, ctx);
    }
    return null;
  }
  if (op === '$ifNull') {
    const args = expr[op];
    if (typeOf(args) !== 'array' || args.length < 2) return evaluateOperand(args, ctx);
    const a = evaluateOperand(args[0], ctx);
    return a == null ? evaluateOperand(args[1], ctx) : a;
  }
  if (op === '$switch') {
    const spec = expr[op];
    if (typeOf(spec) !== 'object') return null;
    const branches = spec.branches || [];
    for (const br of branches) {
      if (evaluateExpression(br.case, ctx)) return evaluateExpression(br.then, ctx);
    }
    return spec.default !== undefined ? evaluateExpression(spec.default, ctx) : null;
  }

  // Type conversion
  if (op === '$toString') return evaluateOperand(expr[op], ctx) == null ? null : String(evaluateOperand(expr[op], ctx));
  if (op === '$toInt') return Number.parseInt(evaluateOperand(expr[op], ctx), 10) || 0;
  if (op === '$toDouble') return Number.parseFloat(evaluateOperand(expr[op], ctx)) || 0.0;
  if (op === '$toDate') {
    const v = evaluateOperand(expr[op], ctx);
    const d = new Date(v);
    return isNaN(d.getTime()) ? null : d;
  }

  // String helpers
  if (op === '$concat') {
    const parts = expr[op];
    if (typeOf(parts) !== 'array') return '';
    return parts.map((p) => evaluateOperand(p, ctx)).join('');
  }
  if (op === '$toLower') {
    const v = evaluateOperand(expr[op], ctx);
    return v == null ? v : String(v).toLowerCase();
  }
  if (op === '$toUpper') {
    const v = evaluateOperand(expr[op], ctx);
    return v == null ? v : String(v).toUpperCase();
  }
  if (op === '$substr') {
    const args = expr[op];
    if (typeOf(args) !== 'array' || args.length < 3) return '';
    const str = String(evaluateOperand(args[0], ctx));
    const start = Number(evaluateOperand(args[1], ctx)) || 0;
    const len = Number(evaluateOperand(args[2], ctx)) || 0;
    return str.substr(start, len);
  }

  return false;
};

export { evaluateExpression, evaluateOperand };
