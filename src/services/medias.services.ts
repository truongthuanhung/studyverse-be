import { Request } from 'express';
import formidable, { File, errors as formidableErrors } from 'formidable';
import path from 'path';
import sharp from 'sharp';
import cloudinary from '~/configs/cloudinary';
import { UPLOAD_DIRIRECTORY, UPLOAD_TEMP_DIRECTORY } from '~/constants/directories';
import { getExtension, getNameFromFullname } from '~/utils/file';
import fs from 'fs';

class MediasService {
  async handleUploadImages(req: Request) {
    const form = formidable({
      uploadDir: path.resolve(UPLOAD_TEMP_DIRECTORY),
      maxFiles: 4,
      keepExtensions: true,
      maxFileSize: 1200 * 1024,
      filter: ({ name, originalFilename, mimetype }) => {
        const isValidFile = name === 'image' && !!mimetype?.includes('image/');
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
    const uploadPromises = files?.image?.map(async (file) => {
      const filePath = file.filepath;
      const processedImagePath = path.join(UPLOAD_DIRIRECTORY, `${getNameFromFullname(file.newFilename)}.jpg`);

      // Sharp handle
      await sharp(filePath)
        .jpeg({ quality: 90 }) // Convert to JPG with quality setting
        .toFile(processedImagePath);

      // Cloudinary upload
      const result = await cloudinary.uploader.upload(processedImagePath, {
        folder: 'uploads',
        resource_type: 'image'
      });
      try {
        fs.unlinkSync(processedImagePath);
        fs.unlinkSync(filePath);
      } catch (err) {
        console.error(err);
      }

      return result;
    });

    const results = await Promise.all(uploadPromises as any);
    return results.map((file) => file.secure_url);
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
