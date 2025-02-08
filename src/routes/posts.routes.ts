import { post } from 'axios';
import { Router } from 'express';
import {
  createPostController,
  getMyPostsController,
  getNewsFeedController,
  getPostByIdController,
  getPostsByUserIdController,
  sharePostController
} from '~/controllers/posts.controllers';
import {
  createPostValidator,
  postIdParamValidator,
  privacyValidator,
  sharePostValidator
} from '~/middlewares/posts.middlewares';
import { accessTokenValidator, userIdParamValidator } from '~/middlewares/users.middlewares';
import { wrapRequestHandler } from '~/utils/handlers';

const postsRouter = Router();

postsRouter.get('/', accessTokenValidator, wrapRequestHandler(getNewsFeedController));

postsRouter.post('/', accessTokenValidator, createPostValidator, wrapRequestHandler(createPostController));

postsRouter.get(
  '/users/:user_id',
  accessTokenValidator,
  userIdParamValidator,
  wrapRequestHandler(getPostsByUserIdController)
);

postsRouter.get('/me', accessTokenValidator, wrapRequestHandler(getMyPostsController));

postsRouter.get(
  '/:post_id',
  accessTokenValidator,
  postIdParamValidator,
  privacyValidator,
  wrapRequestHandler(getPostByIdController)
);

postsRouter.post(
  '/:post_id/share',
  accessTokenValidator,
  postIdParamValidator,
  sharePostValidator,
  privacyValidator,
  wrapRequestHandler(sharePostController)
);

export default postsRouter;
