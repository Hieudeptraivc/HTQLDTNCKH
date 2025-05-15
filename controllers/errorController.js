const AppError = require('../utils/appError');

const handleCastErrorDB = function (err) {
  const message = `Invalid ${err.path}: ${err.value}`;
  return new AppError(message, 400);
};

const handleJWTError = () =>
  new AppError('Invalid token. Please log in again!', 401);

const handleJWTExpiredError = () =>
  new AppError('Your token has expired! Please log in again.', 401);

const handleDuplicateFieldsDB = (err) => {
  // Kiểm tra nếu lỗi có thuộc tính cause (MongoDB driver mới)
  if (err.cause) {
    // Lấy thông tin từ cause nếu có
    const field = Object.keys(err.cause.keyValue)[0];
    const value = err.cause.keyValue[field];
    const message = `Dữ liệu đã tồn tại: ${field} = "${value}". Vui lòng sử dụng giá trị khác.`;
    return new AppError(message, 400);
  }
  if (err.keyValue) {
    // Cách cũ nếu không có cause
    const field = Object.keys(err.keyValue)[0];
    const value = err.keyValue[field];
    const message = `Dữ liệu đã tồn tại: ${field} = "${value}". Vui lòng sử dụng giá trị khác.`;
    return new AppError(message, 400);
  }
  return new AppError('Duplicate field value. Please use another value.', 400);
};

const handleValidationErrorDB = function (err) {
  const errors = Object.values(err.errors).map((el) => el.message);
  const message = `Dữ liệu không hợp lệ. ${errors.join('. ')}`;
  return new AppError(message, 400);
};

const sendErrorDev = function (err, res) {
  console.log('DEV ERROR:', err);
  res.status(err.statusCode).json({
    status: err.status,
    error: err,
    message: err.message,
    stack: err.stack,
  });
};

const sendErrorProd = function (err, res) {
  if (res.headersSent) {
    return;
  }
  if (err.isOperational) {
    res.status(err.statusCode).json({
      error: true,
      status: err.status,
      message: err.message,
    });
  } else {
    res.status(500).json({
      error: true,
      status: 'error',
      message: 'Something went very wrong',
    });
  }
};

module.exports = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  if (process.env.NODE_ENV === 'development') {
    sendErrorDev(err, res);
  } else if (process.env.NODE_ENV === 'production') {
    let error = { ...err };
    error.message = err.message;
    error.name = err.name;
    error.cause = err.cause;

    if (err.code === 11000 || (err.cause && err.cause.code === 11000)) {
      error = handleDuplicateFieldsDB(error);
    } else if (err.name === 'CastError') error = handleCastErrorDB(error);
    else if (err.name === 'ValidationError')
      error = handleValidationErrorDB(error);
    else if (err.name === 'JsonWebTokenError') error = handleJWTError();
    else if (err.name === 'TokenExpiredError') error = handleJWTExpiredError();

    sendErrorProd(error, res);
  }
};
