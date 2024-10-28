import { Request, Response } from 'express';
import mediasService from '~/services/medias.services';

export const uploadSingleImageController = async (req: Request, res: Response) => {
  const result = await mediasService.handleUploadSingleImage(req);
  return res.json({
    message: 'Upload file successfully',
    url: result.secure_url
  });
};
