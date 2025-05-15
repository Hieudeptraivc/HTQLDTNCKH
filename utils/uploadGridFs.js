// uploadGridFS.js
const multer = require('multer');
const { MongoClient, ObjectId, GridFSBucket } = require('mongodb');
const path = require('path');
const AppError = require('./appError');

const allowedTypes = ['.pdf', '.doc', '.docx', '.png', '.jpg', '.jpeg'];

// Multer config (chỉ filter file, không lưu vào đâu cả)
const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowedTypes.includes(ext)) {
    cb(null, true);
  } else {
    cb(new AppError('File type không được hỗ trợ.'), false);
  }
};

// Dùng memoryStorage vì ta sẽ tự upload vào GridFS
const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter,
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB
});

// Hàm upload file vào GridFS
const uploadToGridFS = async (buffer, filename, mimetype) => {
  const mongoClient = await MongoClient.connect(
    process.env.DATABASE.replace('<PASSWORD>', process.env.DATABASE_PASSWORD),
  );

  const db = mongoClient.db();
  const bucket = new GridFSBucket(db, { bucketName: 'baocaofiles' });

  const fileId = new ObjectId();

  return new Promise((resolve, reject) => {
    const uploadStream = bucket.openUploadStreamWithId(fileId, filename, {
      contentType: mimetype,
    });

    uploadStream.end(buffer);

    uploadStream.on('finish', () => {
      mongoClient.close();
      resolve(fileId);
    });

    uploadStream.on('error', (err) => {
      mongoClient.close();
      reject(err);
    });
  });
};

// Hàm xóa file khỏi GridFS
const deleteFromGridFS = async (fileId) => {
  const mongoClient = await MongoClient.connect(
    process.env.DATABASE.replace('<PASSWORD>', process.env.DATABASE_PASSWORD),
  );

  const db = mongoClient.db();
  const bucket = new GridFSBucket(db, { bucketName: 'baocaofiles' });

  try {
    await bucket.delete(new ObjectId(fileId));
  } catch (err) {
    console.error('Lỗi khi xóa file khỏi GridFS:', err);
  } finally {
    await mongoClient.close(); // Đảm bảo đóng kết nối
  }
};

// Hàm lấy file từ GridFS (không đóng kết nối ngay lập tức)
const getFileReadStream = async (fileId) => {
  const mongoClient = await MongoClient.connect(
    process.env.DATABASE.replace('<PASSWORD>', process.env.DATABASE_PASSWORD),
  );

  const db = mongoClient.db();
  const bucket = new GridFSBucket(db, { bucketName: 'baocaofiles' });

  try {
    const objectId = new ObjectId(fileId);

    const file = await db
      .collection('baocaofiles.files')
      .findOne({ _id: objectId });

    if (!file) {
      throw new Error('Không tìm thấy file trong hệ thống');
    }

    // Không đóng kết nối ở đây vì stream cần sống tới khi client đọc xong
    return {
      stream: bucket.openDownloadStream(objectId),
      contentType:
        file.contentType ||
        file.metadata?.contentType ||
        'application/octet-stream',
      filename: file.filename,
      closeConnection: () => mongoClient.close(), // Cho phép controller đóng sau khi stream kết thúc
    };
  } catch (err) {
    await mongoClient.close();
    console.error('Error while fetching file:', err);
    throw new Error(err.message);
  }
};
const getFileMetadata = async (fileId) => {
  const mongoClient = await MongoClient.connect(
    process.env.DATABASE.replace('<PASSWORD>', process.env.DATABASE_PASSWORD),
  );

  const db = mongoClient.db();
  try {
    const objectId = new ObjectId(fileId);
    const file = await db
      .collection('baocaofiles.files')
      .findOne({ _id: objectId });

    if (!file) return null;

    return {
      filename: file.filename,
      contentType: file.contentType || file.metadata?.contentType,
      length: file.length,
      uploadDate: file.uploadDate,
    };
  } catch (err) {
    console.error('Lỗi khi lấy metadata file:', err);
    return null;
  } finally {
    await mongoClient.close();
  }
};

// Xuất tất cả các module
module.exports = {
  fileFilter,
  upload,
  uploadToGridFS,
  deleteFromGridFS,
  getFileReadStream,
  getFileMetadata,
};
