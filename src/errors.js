class AppError extends Error {
  constructor(code, message, status = 400) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

function text(value, label, max = 8000) {
  if (typeof value !== "string" || !value.trim() || value.length > max) {
    throw new AppError("INVALID_INPUT", `${label} must contain 1-${max} characters.`);
  }
  return value.trim();
}

function fields(value, allowed, required = []) {
  if (!value || typeof value !== "object" || Array.isArray(value) ||
      Object.keys(value).some((key) => !allowed.includes(key)) ||
      required.some((key) => !Object.hasOwn(value, key))) {
    throw new AppError("INVALID_INPUT", "Supply the required fields only.");
  }
  return value;
}

module.exports = { AppError, text, fields };
