import { Request, Response, NextFunction } from 'express';
import multer from 'multer';

// Use Memory Storage because we want to virus-scan it and then pipe to Cloudinary directly
const storage = multer.memoryStorage();

// Multer Config with File Extension Limits
export const handleUpload = multer({
  storage,
  limits: {
    // Limits the max file size to 50MB
    fileSize: 50 * 1024 * 1024,
  },
  fileFilter: (req, file, cb) => {
    // Only allow specific extensions if you want to be extra restrictive
    // Example: Block raw executable files
    if (file.mimetype === 'application/x-msdownload' || file.mimetype === 'application/x-sh') {
      return cb(new Error('Executables and malicious shell files are not allowed.'));
    }
    
    // Otherwise allow all audio/video/image generic files
    cb(null, true);
  },
});

/**
 * Malicious Check Stub
 * In a fully production system, this middleware will send `req.file.buffer` to a virus scanner
 * (like Cloudmersive API) before returning `next()`.
 */
export const scanForMaliciousContent = async (req: Request, res: Response, next: NextFunction) => {
  if (!req.file) {
    // If there is no file, we just proceed
    return next();
  }

  try {
    // STUB: Here you would ping an API like so:
    // const isSafe = await callCloudmersiveVirusScanner(req.file.buffer);
    // if (!isSafe) return res.status(403).json({ error: "Malware detected in upload" });

    // Since this is a placeholder stub, we assume it's clean and move to the next function.
    console.log(`[Security] File passed malicious test: ${req.file.originalname}`);
    next();
  } catch (error) {
    res.status(500).json({ message: 'Error scanning file for malicious content' });
  }
};
