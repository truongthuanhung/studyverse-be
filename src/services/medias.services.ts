import { Request } from 'express';
import formidable, { File, errors as formidableErrors } from 'formidable';
import path from 'path';
import sharp from 'sharp';
import cloudinary from '~/configs/cloudinary';
import { UPLOAD_DIRIRECTORY, UPLOAD_TEMP_DIRECTORY } from '~/constants/directories';
import { getExtension, getNameFromFullname } from '~/utils/file';
import fs from 'fs';

class MediasService {
  async handleUploadFiles(req: Request) {
    const form = formidable({
      uploadDir: path.resolve(UPLOAD_TEMP_DIRECTORY),
      maxFiles: 4,
      keepExtensions: true,
      maxFileSize: 10 * 1024 * 1024, // 10MB max size
      filter: ({ name, mimetype }) => {
        // Định nghĩa các loại file được phép
        const allowedTypes = {
          image: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
          video: ['video/mp4', 'video/webm'],
          document: [
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/vnd.ms-excel',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
          ]
        };

        const isValidFile =
          name === 'files' &&
          Object.values(allowedTypes)
            .flat()
            .includes(mimetype || '');

        if (!isValidFile) {
          form.emit('error' as any, new (formidableErrors as any).default('File type is invalid', 0, 500));
        }
        return isValidFile;
      }
    });

    const [_, files] = await form.parse(req);
    if (Object.keys(files).length === 0) {
      throw new Error('File is empty');
    }

    const uploadPromises = files?.files?.map(async (file) => {
      const filePath = file.filepath;
      const mimetype = file.mimetype || '';

      // Xử lý theo từng loại file
      if (mimetype.startsWith('image/')) {
        // const processedPath = path.join(UPLOAD_DIRIRECTORY, `${getNameFromFullname(file.newFilename)}.jpg`);

        // // Optimize ảnh
        // await sharp(filePath).jpeg({ quality: 90 }).toFile(processedPath);

        // Upload lên Cloudinary
        const result = await cloudinary.uploader.upload(filePath, {
          folder: 'uploads/images',
          resource_type: 'image'
        });

        // Cleanup
        // fs.unlinkSync(processedPath);
        fs.unlinkSync(filePath);

        return {
          url: result.secure_url,
          type: 'image',
          originalName: file.originalFilename
        };
      } else if (mimetype.startsWith('video/')) {
        // Upload video trực tiếp lên Cloudinary
        const result = await cloudinary.uploader.upload(filePath, {
          folder: 'uploads/videos',
          resource_type: 'video'
        });

        fs.unlinkSync(filePath);

        return {
          url: result.secure_url,
          type: 'video',
          originalName: file.originalFilename
        };
      } else {
        // Upload documents (PDF, DOCX, XLSX...)
        const result = await cloudinary.uploader.upload(filePath, {
          folder: 'uploads/documents',
          resource_type: 'raw'
        });

        fs.unlinkSync(filePath);

        return {
          url: result.secure_url,
          type: 'document',
          originalName: file.originalFilename
        };
      }
    });

    const results = await Promise.all(uploadPromises as any);
    return results;
  }

  async handleUploadVideos(req: Request) {
    const form = formidable({
      uploadDir: path.resolve(UPLOAD_TEMP_DIRECTORY),
      maxFiles: 2,
      maxFileSize: 50 * 1024 * 1024,
      filter: ({ name, originalFilename, mimetype }) => {
        const isValidFile = name === 'video' && !!(mimetype?.includes('mp4') || mimetype?.includes('quicktime'));
        if (!isValidFile) {
          form.emit('error' as any, new (formidableErrors as any).default('File type is invalid', 0, 500));
        }
        return isValidFile;
      }
    });
    // No file uploaded?
    const [_, files] = await form.parse(req);
    if (Object.keys(files).length === 0) {
      throw new Error('File is empty');
    }
    // Handle extension
    const videos = files.video as File[];
    videos.forEach((video) => {
      const ext = getExtension(video.originalFilename as string);
      fs.renameSync(video.filepath, video.filepath + '.' + ext);
      video.newFilename = video.newFilename + '.' + ext;
      video.filepath = video.filepath + '.' + ext;
    });

    // Cloudinary upload
    const uploadPromises = videos.map(async (file) => {
      const filePath = file.filepath;
      const result = await cloudinary.uploader.upload(filePath, {
        folder: 'uploads',
        resource_type: 'video'
      });
      fs.unlinkSync(filePath);
      return result;
    });
    const results = await Promise.all(uploadPromises as any);
    return results.map((file) => file.secure_url);
  }

  async handleUploadPdf(req: Request) {
    const form = formidable({
      uploadDir: path.resolve(UPLOAD_TEMP_DIRECTORY),
      maxFiles: 4,
      maxFileSize: 50 * 1024 * 1024,
      filter: ({ name, originalFilename, mimetype }) => {
        const isValidFile = name === 'pdf' && !!mimetype?.includes('application/pdf');
        if (!isValidFile) {
          form.emit('error' as any, new (formidableErrors as any).default('File type is invalid', 0, 500));
        }
        return isValidFile;
      }
    });
    // No file uploaded?
    const [_, files] = await form.parse(req);
    if (Object.keys(files).length === 0) {
      throw new Error('File is empty');
    }
    // Handle extension
    const pdfs = files.pdf as File[];
    pdfs.forEach((pdfs) => {
      const ext = getExtension(pdfs.originalFilename as string);
      fs.renameSync(pdfs.filepath, pdfs.filepath + '.' + ext);
      pdfs.newFilename = pdfs.newFilename + '.' + ext;
      pdfs.filepath = pdfs.filepath + '.' + ext;
    });

    // Cloudinary upload
    const uploadPromises = pdfs.map(async (file) => {
      const filePath = file.filepath;
      const result = await cloudinary.uploader.upload(filePath, {
        folder: 'uploads',
        resource_type: 'raw'
      });
      fs.unlinkSync(filePath);
      return result;
    });
    const results = await Promise.all(uploadPromises as any);
    return results.map((file) => file.secure_url);
  }
}

const mediasService = new MediasService();

export default mediasService;
