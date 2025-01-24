import { Router } from 'express';
import { wrap } from 'lodash';
import { getLikesByCommentIdController, getLikesByPostIdController, likeController, unlikeController } from '~/controllers/likes.controllers';
import { commentIdValidator } from '~/middlewares/comments.middlewares';
import { likeValidator, unlikeValidator } from '~/middlewares/likes.middlewares';
import { postIdBodyValidator, postIdParamValidator, privacyValidator } from '~/middlewares/posts.middlewares';
import { accessTokenValidator } from '~/middlewares/users.middlewares';
import { wrapRequestHandler } from '~/utils/handlers';

const likesRouter = Router();

likesRouter.post('/', accessTokenValidator, likeValidator, wrapRequestHandler(likeController));

likesRouter.delete('/:target_id', accessTokenValidator, unlikeValidator, wrapRequestHandler(unlikeController));

likesRouter.get(
  '/posts/:post_id',
  accessTokenValidator,
  postIdParamValidator,
  privacyValidator,
  wrapRequestHandler(getLikesByPostIdController)
);

likesRouter.get('/comments/:comment_id', accessTokenValidator, commentIdValidator, wrapRequestHandler(getLikesByCommentIdController));

export default likesRouter;
