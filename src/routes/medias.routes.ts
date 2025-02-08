import { Router } from 'express';
import { uploadFilesController } from '~/controllers/medias.controllers';
import { accessTokenValidator } from '~/middlewares/users.middlewares';
import { wrapRequestHandler } from '~/utils/handlers';

const mediasRouter = Router();

mediasRouter.post('/upload', accessTokenValidator, wrapRequestHandler(uploadFilesController));

export default mediasRouter;
