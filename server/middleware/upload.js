import multer from 'multer';
import path from 'path';
import crypto from 'crypto';
import { fileTypeFromBuffer } from 'file-type';

// Allowed file types
const ALLOWED_FILE_TYPES = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/gif': 'gif',
  'application/pdf': 'pdf',
  'application/msword': 'doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  'text/plain': 'txt'
};

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'server/uploads/');
  },
  filename: (req, file, cb) => {
    // Generate a secure random filename while keeping the original extension
    const ext = path.extname(file.originalname);
    const randomName = crypto.randomBytes(32).toString('hex');
    cb(null, `${randomName}${ext}`);
  }
});

const fileFilter = async (req, file, cb) => {
  try {
    // Check mime type
    if (!ALLOWED_FILE_TYPES[file.mimetype]) {
      return cb(new Error('File type not allowed'), false);
    }

    // Additional security check with file-type
    const buffer = file.buffer;
    if (buffer) {
      const fileType = await fileTypeFromBuffer(buffer);
      if (!fileType || !ALLOWED_FILE_TYPES[fileType.mime]) {
        return cb(new Error('Invalid file type detected'), false);
      }
    }

    cb(null, true);
  } catch (error) {
    cb(error, false);
  }
};

export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: 5
  }
});

export const getFileUrl = (filename) => {
  if (!filename) return null;
  return `/uploads/${filename}`;
};

export const getFilePath = (filename) => {
  if (!filename) return null;
  return path.join(process.cwd(), 'server', 'uploads', filename);
};
