const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { cloudinary, isCloudinaryConfigured } = require('../config/cloudinary');

// Ensure local uploads directory exists (use /tmp on Vercel/serverless environments)
const uploadDir = process.env.VERCEL
  ? path.join('/tmp', 'uploads')
  : path.join(__dirname, '..', 'uploads');

try {
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }
} catch (e) {
  console.warn('[Storage] Read-only environment detected, skipping local mkdir:', e.message);
}

// Local Disk Storage
const diskStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `nsj-${uniqueSuffix}${ext}`);
  },
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|webp|avif/;
  const ext = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mime = allowedTypes.test(file.mimetype);

  if (ext && mime) {
    return cb(null, true);
  }
  cb(new Error('Only image files (JPG, PNG, WEBP, AVIF) are allowed'));
};

const upload = multer({
  storage: diskStorage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: fileFilter,
});

// Helper to upload a local file to Cloudinary if configured
const processUploadedFiles = async (files, req) => {
  if (!files || files.length === 0) return [];

  const results = [];
  const useCloudinary = isCloudinaryConfigured();

  for (const file of files) {
    if (useCloudinary) {
      try {
        const uploadResult = await cloudinary.uploader.upload(file.path, {
          folder: 'new_sanjay_jewellers',
          transformation: [{ quality: 'auto', fetch_format: 'auto' }],
        });
        // Cleanup local file after uploading to Cloudinary
        fs.unlink(file.path, () => {});
        results.push({
          url: uploadResult.secure_url,
          public_id: uploadResult.public_id,
        });
      } catch (err) {
        console.error('Cloudinary upload error:', err);
        // Fallback to local url
        const localUrl = `${req.protocol}://${req.get('host')}/uploads/${file.filename}`;
        results.push({
          url: localUrl,
          public_id: file.filename,
        });
      }
    } else {
      // Local storage url
      const localUrl = `${req.protocol}://${req.get('host')}/uploads/${file.filename}`;
      results.push({
        url: localUrl,
        public_id: file.filename,
      });
    }
  }

  return results;
};

// Helper to delete an image from local disk or Cloudinary
const deleteSingleImage = async (img) => {
  if (!img) return;

  const publicId = typeof img === 'object' ? img.public_id : null;
  const url = typeof img === 'object' ? img.url : String(img);

  // 1. Check if it's a local upload in uploads directory
  let filename = null;
  if (
    publicId &&
    !publicId.startsWith('http') &&
    !publicId.startsWith('default-') &&
    !publicId.startsWith('nsj-sample-')
  ) {
    filename = publicId;
  } else if (url && url.includes('/uploads/')) {
    const parts = url.split('/uploads/');
    if (parts[1]) {
      filename = parts[1].split('?')[0];
    }
  }

  if (filename) {
    const safeFilename = path.basename(filename);
    const localFilePath = path.join(uploadDir, safeFilename);
    try {
      if (fs.existsSync(localFilePath)) {
        fs.unlinkSync(localFilePath);
        console.log(`[Storage] Cleaned up file from uploads folder: ${safeFilename}`);
      }
    } catch (err) {
      console.error(`[Storage] Error deleting local file ${safeFilename}:`, err);
    }
  }

  // 2. Cloudinary deletion if configured
  if (isCloudinaryConfigured() && publicId && !publicId.includes('/') && !publicId.startsWith('default-')) {
    try {
      await cloudinary.uploader.destroy(publicId);
      console.log(`[Cloudinary] Deleted image: ${publicId}`);
    } catch (err) {
      console.error(`[Cloudinary] Error deleting image ${publicId}:`, err);
    }
  }
};

const deleteImagesFromStorage = async (images) => {
  if (!images) return;
  const list = Array.isArray(images) ? images : [images];
  for (const img of list) {
    await deleteSingleImage(img);
  }
};

module.exports = {
  upload,
  processUploadedFiles,
  deleteSingleImage,
  deleteImagesFromStorage,
};

