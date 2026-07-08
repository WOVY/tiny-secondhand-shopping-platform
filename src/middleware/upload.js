const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const multer = require('multer');

const UPLOAD_DIR = path.join(__dirname, '..', '..', 'public', 'uploads');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp']);
const ALLOWED_EXT = new Set(['.jpg', '.jpeg', '.png', '.webp']);

const storage = multer.diskStorage({
  destination: UPLOAD_DIR,
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${crypto.randomBytes(16).toString('hex')}${ext}`);
  },
});

function fileFilter(req, file, cb) {
  const ext = path.extname(file.originalname).toLowerCase();
  if (!ALLOWED_MIME.has(file.mimetype) || !ALLOWED_EXT.has(ext)) {
    return cb(new Error('지원하지 않는 이미지 형식입니다 (jpg/png/webp만 가능).'));
  }
  cb(null, true);
}

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 },
});

function friendlyMessage(err) {
  if (err.code === 'LIMIT_FILE_SIZE') return '이미지 용량은 5MB 이하여야 합니다.';
  return err.message || '이미지 업로드에 실패했습니다.';
}

// 선언적 미들웨어 대신 콜백으로 감싸서, 업로드 실패시에도 폼을 에러 메시지와 함께
// 다시 렌더링할 수 있도록 한다 (그대로 두면 제네릭 500 에러가 됨).
function handleImageUpload(req, res, next) {
  upload.single('image')(req, res, (err) => {
    if (err) {
      req.uploadError = friendlyMessage(err);
    }
    next();
  });
}

module.exports = { handleImageUpload };
