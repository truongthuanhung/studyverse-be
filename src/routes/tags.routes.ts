import { Router } from 'express';
import { getTagByIdController, getTagByNameController, searchTagsController } from '~/controllers/tags.controllers';
import { tagIdValidator } from '~/middlewares/tags.middlewares';
import { accessTokenValidator } from '~/middlewares/users.middlewares';
import { wrapRequestHandler } from '~/utils/handlers';

const tagsRouter = Router();

tagsRouter.get('/', accessTokenValidator, wrapRequestHandler(searchTagsController));

tagsRouter.get('/:tag_id', accessTokenValidator, tagIdValidator, wrapRequestHandler(getTagByIdController));

export default tagsRouter;
