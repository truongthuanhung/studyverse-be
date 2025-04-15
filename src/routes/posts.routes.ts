import { post } from 'axios';
import { Router } from 'express';
import { likeController } from '~/controllers/likes.controllers';
import {
  createPostController,
  getMyPostsController,
  getNewsFeedController,
  getPostByIdController,
  getPostsByUserIdController,
  sharePostController
} from '~/controllers/posts.controllers';
import { likeValidator } from '~/middlewares/likes.middlewares';
import {
  createPostValidator,
  postIdParamValidator,
  privacyValidator,
  sharePostValidator
} from '~/middlewares/posts.middlewares';
import { accessTokenValidator, userIdParamValidator } from '~/middlewares/users.middlewares';
import { wrapRequestHandler } from '~/utils/handlers';
import commentsRouter from './comments.routes';

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

postsRouter.post('/:post_id/like', accessTokenValidator, wrapRequestHandler(likeController));

postsRouter.use('/:post_id/comments', commentsRouter);

export default postsRouter;
