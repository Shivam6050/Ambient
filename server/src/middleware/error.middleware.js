export function errorMiddleware(error, _req, res, _next) {
  const storageUnavailable = ['MongoNetworkError', 'MongoNetworkTimeoutError', 'MongoServerSelectionError', 'MongooseServerSelectionError', 'MongoTopologyClosedError', 'MongoNotConnectedError'].includes(error.name) || (error.name === 'MongooseError' && /before initial connection|buffering timed out/.test(error.message));
  const status = storageUnavailable ? 503 : Number(error.statusCode) || 500;
  const message = storageUnavailable ? 'MongoDB unavailable. Restore database connectivity and retry.' : error.message || 'Internal server error';
  console.error({ name: error.name, status });
  res.status(status).json({ success: false, message });
}
