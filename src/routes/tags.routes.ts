import { Router } from 'express';
import { getTagByNameController } from '~/controllers/tags.controllers';
import { accessTokenValidator } from '~/middlewares/users.middlewares';
import { wrapRequestHandler } from '~/utils/handlers';

const tagsRouter = Router();

tagsRouter.get('/', accessTokenValidator, wrapRequestHandler(getTagByNameController));

export default tagsRouter;
