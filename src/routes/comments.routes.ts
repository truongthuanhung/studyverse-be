import { Router } from 'express';
import {
  createCommentController,
  deleteCommentController,
  getChildCommentsController,
  getCommentsByPostIdController,
  likeCommentController,
  unlikeCommentController,
  updateCommentController
} from '~/controllers/comments.controllers';
import { commentIdValidator, createCommentValidator } from '~/middlewares/comments.middlewares';
import { paginationValidator } from '~/middlewares/common.middlewares';
import { postIdBodyValidator, postIdParamValidator, privacyValidator } from '~/middlewares/posts.middlewares';
import { accessTokenValidator } from '~/middlewares/users.middlewares';
import { wrapRequestHandler } from '~/utils/handlers';

const commentsRouter = Router({ mergeParams: true });

commentsRouter.post(
  '/',
  accessTokenValidator,
  postIdParamValidator,
  createCommentValidator,
  wrapRequestHandler(createCommentController)
);

commentsRouter.get('/', accessTokenValidator, postIdParamValidator, wrapRequestHandler(getCommentsByPostIdController));

commentsRouter.get(
  '/:comment_id/child-comments',
  accessTokenValidator,
  postIdParamValidator,
  privacyValidator,
  paginationValidator,
  wrapRequestHandler(getChildCommentsController)
);

commentsRouter.post(
  '/:comment_id/like',
  accessTokenValidator,
  postIdParamValidator,
  wrapRequestHandler(likeCommentController)
);

commentsRouter.post(
  '/:comment_id/unlike',
  accessTokenValidator,
  postIdParamValidator,
  wrapRequestHandler(unlikeCommentController)
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

export default commentsRouter;
