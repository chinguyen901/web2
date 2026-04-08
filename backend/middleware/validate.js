const ApiError = require("../utils/apiError");

function validate(schema, data) {
  const result = schema.safeParse(data);

  if (!result.success) {
    const issues = result.error.issues.map((issue) => issue.message).join(", ");
    throw new ApiError(issues || "Invalid input", 400);
  }

  return result.data;
}

module.exports = validate;
