import multer from 'multer';

const storage = multer.memoryStorage();

export const upload = multer({ storage,
    limits: {
        fileSize: 1024 * 1024 * 1024, // Limit file size to 1GB
    } 
});
