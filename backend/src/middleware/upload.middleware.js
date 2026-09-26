const multer = require('multer');
const { AppError } = require('./error.middleware');

const MAX_FILE_SIZE_MB = 5;
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: {
    fileSize: MAX_FILE_SIZE_MB * 1024 * 1024,
    files: 5,
  },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      cb(new AppError('Only JPEG, PNG, and WEBP images are allowed', 400, 'INVALID_FILE_TYPE'));
      return;
    }
    cb(null, true);
  },
});

module.exports = { upload };
