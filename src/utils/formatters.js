
/**
 * Safely formats numbers and numeric strings by replacing the decimal dot with a comma.
 * If the value is empty, null, undefined, or NaN, it returns the value as is.
 */
export const formatHuNum = (value) => {
  if (value === null || value === undefined || value === "") return "";
  
  if (typeof value === "number") {
    if (isNaN(value)) return "";
    return value.toString().replace(".", ",");
  }

  if (typeof value === "string") {
    // Only format if it's a valid number format (allow optional trailing %)
    const trimmed = value.trim();
    if (/^-?\d+(\.\d+)?%?$/.test(trimmed)) {
      return value.replace(".", ",");
    }
  }

  return value;
};
