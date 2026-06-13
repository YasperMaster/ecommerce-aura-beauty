/**
 * Returns the Tailwind border/outline class for a form input
 * based on whether the field has a value and whether it has an error.
 */
export const getInputStateClassName = (isValid, hasError) => {
  if (hasError) {
    return "border-red-500 outline-red-500 focus:outline-red-500";
  }

  if (isValid) {
    return "border-success outline-success focus:outline-success";
  }

  return "";
};
