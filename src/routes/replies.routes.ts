import { Router } from 'express';
import {
  createReplyController,
  deleteReplyController,
  editReplyController,
  getRepliesByQuestionIdController
} from '~/controllers/replies.controllers';
import { filterMiddleware, paginationValidator } from '~/middlewares/common.middlewares';
import { createReplyValidator, deleteReplyValidator, editReplyValidator } from '~/middlewares/replies.middlewares';
import { validateGroupQuestionAndMembership } from '~/middlewares/studyGroups.middlewares';
import { accessTokenValidator } from '~/middlewares/users.middlewares';
import { wrapRequestHandler } from '~/utils/handlers';

const repliesRouter = Router({ mergeParams: true });

repliesRouter.post(
  '/',
  accessTokenValidator,
  validateGroupQuestionAndMembership,
  createReplyValidator,
  wrapRequestHandler(createReplyController)
);

repliesRouter.get(
  '/',
  accessTokenValidator,
  validateGroupQuestionAndMembership,
  paginationValidator,
  wrapRequestHandler(getRepliesByQuestionIdController)
);

repliesRouter.delete(
  '/:reply_id',
  accessTokenValidator,
  validateGroupQuestionAndMembership,
  deleteReplyValidator,
  wrapRequestHandler(deleteReplyController)
);

repliesRouter.patch(
  '/:reply_id',
  accessTokenValidator,
  validateGroupQuestionAndMembership,
  editReplyValidator,
  filterMiddleware(['content', 'medias']),
  wrapRequestHandler(editReplyController)
);

export default repliesRouter;
