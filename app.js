const cookieParser = require('cookie-parser');
const cors = require('cors');
const express = require('express');
const path = require('path');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const compression = require('compression');
const deepSanitize = require('./utils/deepSanitize');
const globalAppError = require('./controllers/errorController');
const khoaRouter = require('./routes/khoaRouter');
const authRouter = require('./routes/authRouter');
const sinhVienRouter = require('./routes/sinhVienRouter');
const giangVienRouter = require('./routes/giangVienRouter');
const deTaiRouter = require('./routes/deTaiRouter');
const deTaiCapTruongRouter = require('./routes/deTaiCapTruongRouter');
const linhVucRouter = require('./routes/linhVucRouter');
const baoCaoTienDoRouter = require('./routes/baoCaoTienDoRouter');
const baoCaoRouter = require('./routes/baoCaoRouter');
const nhanXetRouter = require('./routes/nhanXetRouter');
const thongBaoRouter = require('./routes/thongBaoRouter');
const canBoKhoaRouter = require('./routes/canBoKhoaRouter');
const taiKhoanRouter = require('./routes/taiKhoanRouter');
const importRouter = require('./routes/importRouter');
const AppError = require('./utils/appError');

const app = express();

// app.use(
//   cors({
//     origin: 'http://127.0.0.1:5173',
//     credentials: true, //
//     exposedHeaders: ['Content-Disposition'],
//   }),
// );
app.set('trust proxy', 1); // hoặc true
app.use(
  '/api/v1/public/template',
  cors(),
  express.static(path.join(__dirname, 'public/template')),
);
app.use(
  '/api/v1/public/img/users',
  cors(),
  express.static(path.join(__dirname, 'public/img/users')),
);
const allowedOrigins = ['http://127.0.0.1:5173','https://htqldtnckh-fe-9avj.vercel.app'];

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
    exposedHeaders: ['Content-Disposition'],
  }),
);
// Bảo vệ ứng dụng bằng cách thiết lập HTTP headers bảo mật
app.use(helmet());

// Middleware để parse dữ liệu JSON từ request body (giới hạn 10KB)
app.use(express.json({ limit: '10Kb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Giới hạn số lượng request từ một IP để chống tấn công DDoS
const limiter = rateLimit({
  windowMs: 30 * 60 * 1000, // 30 phút
  max: 250, // tối đa 250 request mỗi IP
  standardHeaders: true, // gửi các header chuẩn
  legacyHeaders: false, // không dùng các header cũ (X-RateLimit-*)
  handler: (req, res) => {
    res.status(429).json({
      error: true,
      message: 'Quá nhiều yêu cầu từ địa chỉ IP này. Hãy thử lại sau 30 phút!',
    });
  },
});
// Áp dụng rate limiting cho tất cả route bắt đầu bằng `/api`
app.use('/api', limiter);

// Ngăn chặn NoSQL Injection bằng cách loại bỏ các dấu `$` và `.`
app.use(mongoSanitize());

// Middleware để làm sạch dữ liệu đầu vào là html độc hại
app.use((req, res, next) => {
  req.body = deepSanitize(req.body);
  next();
});
app.use(compression());
// Định nghĩa các route API
app.use((req, res, next) => {
  req.resquestTime = new Date().toISOString();
  next();
});
app.use('/api/v1/khoa', khoaRouter); // Route quản lý khoa
app.use('/api/v1/auth', authRouter); // Route xác thực người dùng
app.use('/api/v1/sinh-vien', sinhVienRouter); // Route quản lý sinh viên
app.use('/api/v1/giang-vien', giangVienRouter); // Route quản lý sinh viên
app.use('/api/v1/de-tai', deTaiRouter); // Route quản lý đề tài
app.use('/api/v1/de-tai-cap-truong', deTaiCapTruongRouter); // Route quản lý đề tài
app.use('/api/v1/bao-cao', baoCaoRouter); // Route quản lý lĩnh vực
app.use('/api/v1/nhan-xet', nhanXetRouter); // Route quản lý lĩnh vực
app.use('/api/v1/bao-cao-tien-do', baoCaoTienDoRouter); // Route quản lý tiến độ đề tài
app.use('/api/v1/linh-vuc', linhVucRouter); // Route quản lý lĩnh vực
app.use('/api/v1/thong-bao', thongBaoRouter); // Route quản lý thong bao
app.use('/api/v1/can-bo-khoa', canBoKhoaRouter); // Route quản lý can bo khoa
app.use('/api/v1/tai-khoan', taiKhoanRouter); // Route quản lý tai khoan
app.use('/api/v1/import', importRouter); // Route quản lý tai khoan

// Middleware xử lý khi không tìm thấy route
app.all('*', (req, res, next) => {
  next(new AppError(`Không tìm thấy đường dẫn ${req.originalUrl}`, 404));
});
// app.js hoặc server.js

// Middleware xử lý lỗi toàn cục
app.use(globalAppError);

// Xuất module app để sử dụng trong server
module.exports = app;
