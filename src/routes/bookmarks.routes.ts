import { Router } from 'express';
import { bookmarkController, unbookmarkController } from '~/controllers/bookmarks.controllers';
import { postIdBodyValidator, postIdParamValidator } from '~/middlewares/posts.middlewares';
import { accessTokenValidator } from '~/middlewares/users.middlewares';
import { wrapRequestHandler } from '~/utils/handlers';

const bookmarksRouter = Router();

bookmarksRouter.post('/', accessTokenValidator, postIdBodyValidator, wrapRequestHandler(bookmarkController));

bookmarksRouter.delete(
  '/posts/:post_id',
  accessTokenValidator,
  postIdParamValidator,
  wrapRequestHandler(unbookmarkController)
);

export default bookmarksRouter;
