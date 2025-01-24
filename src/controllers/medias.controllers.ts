import { Request, Response } from 'express';
import mediasService from '~/services/medias.services';

export const uploadFilesController = async (req: Request, res: Response) => {
  const result = await mediasService.handleUploadFiles(req);
  return res.json({
    message: 'Upload files successfully',
    urls: result
  });
};

export const uploadVideosController = async (req: Request, res: Response) => {
  const result = await mediasService.handleUploadVideos(req);
  return res.json({
    message: 'Upload videos successfully',
    urls: result
  });
};

export const uploadPdfsController = async (req: Request, res: Response) => {
  const result = await mediasService.handleUploadPdf(req);
  return res.json({
    message: 'Upload PDFs successfully',
    urls: result
  });
};
