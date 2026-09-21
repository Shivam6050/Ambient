export function errorMiddleware(error, _req, res, _next) {
  console.error(error);
  const status = Number(error.statusCode) || 500;
  res.status(status).json({ success: false, message: error.message || 'Internal server error' });
}
