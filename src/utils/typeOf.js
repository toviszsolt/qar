const typeOf = (variable) => {
  if (variable == null) return variable === null ? 'null' : 'undefined';
  if (Array.isArray(variable)) return 'array';
  if (variable instanceof Date) return 'date';
  return typeof variable;
};

export { typeOf };
