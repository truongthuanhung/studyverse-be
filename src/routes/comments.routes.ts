import { Router } from 'express';
import {
  createCommentController,
  deleteCommentController,
  getCommentsByPostIdController,
  updateCommentController
} from '~/controllers/comments.controllers';
import { commentIdValidator, createCommentValidator } from '~/middlewares/comments.middlewares';
import { postIdBodyValidator, postIdParamValidator } from '~/middlewares/posts.middlewares';
import { accessTokenValidator } from '~/middlewares/users.middlewares';
import { wrapRequestHandler } from '~/utils/handlers';

const commentsRouter = Router();

commentsRouter.post(
  '/',
  accessTokenValidator,
  postIdBodyValidator,
  createCommentValidator,
  wrapRequestHandler(createCommentController)
);

commentsRouter.put(
  '/:comment_id',
  accessTokenValidator,
  commentIdValidator,
  wrapRequestHandler(updateCommentController)
);

commentsRouter.delete(
  '/:comment_id',
  accessTokenValidator,
  commentIdValidator,
  wrapRequestHandler(deleteCommentController)
);

commentsRouter.get(
  '/posts/:post_id',
  accessTokenValidator,
  postIdParamValidator,
  wrapRequestHandler(getCommentsByPostIdController)
);

export default commentsRouter;
