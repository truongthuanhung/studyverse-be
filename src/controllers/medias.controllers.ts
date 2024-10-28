import { Request, Response } from 'express';
import mediasService from '~/services/medias.services';

export const uploadImagesController = async (req: Request, res: Response) => {
  const result = await mediasService.handleUploadImages(req);
  return res.json({
    message: 'Upload file successfully',
    urls: result
  });
};
