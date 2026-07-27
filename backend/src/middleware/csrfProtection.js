import csrf from "csurf";

// CSRF protection middleware
// Protects against cross-site request forgery attacks
const csrfProtection = csrf({
  cookie: false, // We're using httpOnly cookies, so token goes in request body/header
});

export const generateCsrfToken = (req, res, next) => {
  // Generate and return CSRF token
  // Frontend must include this token in subsequent requests
  res.json({ csrfToken: req.csrfToken() });
};

export const verifyCsrfToken = csrfProtection;

export default csrfProtection;
