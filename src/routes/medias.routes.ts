import { Router } from 'express';
import { uploadImagesController, uploadPdfsController, uploadVideosController } from '~/controllers/medias.controllers';
import { accessTokenValidator } from '~/middlewares/users.middlewares';
import { wrapRequestHandler } from '~/utils/handlers';

const mediasRouter = Router();

mediasRouter.post('/upload-image', accessTokenValidator, wrapRequestHandler(uploadImagesController));

mediasRouter.post('/upload-video', accessTokenValidator, wrapRequestHandler(uploadVideosController));

mediasRouter.post('/upload-pdf', accessTokenValidator, wrapRequestHandler(uploadPdfsController));
export default mediasRouter;
