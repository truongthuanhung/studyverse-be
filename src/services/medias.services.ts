import { Request } from 'express';
import formidable, { File, errors as formidableErrors } from 'formidable';
import path from 'path';
import sharp from 'sharp';
import cloudinary from '~/configs/cloudinary';
import { UPLOAD_DIRIRECTORY, UPLOAD_TEMP_DIRECTORY } from '~/constants/directories';
import { getNameFromFullname } from '~/utils/file';
import fs from 'fs';

class MediasService {
  async handleUploadSingleImage(req: Request) {
    const form = formidable({
      uploadDir: path.resolve(UPLOAD_TEMP_DIRECTORY),
      maxFiles: 1,
      keepExtensions: true,
      maxFileSize: 300 * 1024 * 1024,
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
    const file = (files.image as File[])[0];
    const filePath = file.filepath;
    console.log(filePath);

    // Sharp handle
    const processedImagePath = path.join(UPLOAD_DIRIRECTORY, `${getNameFromFullname(file.newFilename)}.jpg`);
    await sharp(filePath)
      .jpeg({ quality: 90 }) // Convert to JPG with quality setting
      .toFile(processedImagePath);

    // Cloudinary upload
    const result = await cloudinary.uploader.upload(processedImagePath, {
      folder: 'uploads',
      resource_type: 'auto'
    });
    fs.unlinkSync(filePath);
    fs.unlinkSync(processedImagePath);
    return result;
  }
}

const mediasService = new MediasService();

export default mediasService;
