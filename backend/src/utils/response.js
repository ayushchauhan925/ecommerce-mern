function sendSuccess(res, data, message = 'Success', statusCode = 200) {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
  });
}

function sendError(res, message, statusCode = 500, errorCode = 'INTERNAL_ERROR') {
  return res.status(statusCode).json({
    success: false,
    message,
    errorCode,
  });
}

module.exports = { sendSuccess, sendError };
