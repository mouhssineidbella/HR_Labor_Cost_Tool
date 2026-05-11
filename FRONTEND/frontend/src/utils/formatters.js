export const formatCurrency = (value) => {
  if (value === null || value === undefined) return "0.00";
  const num = Number(value);
  if (isNaN(num)) return value;
  if (num === 0) return "0.00";
  return num.toFixed(2);
};
