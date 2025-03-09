import { Router } from 'express';
import {
  createReplyController,
  deleteReplyController,
  editReplyController,
  getRepliesByQuestionIdController,
  getReplyByIdController,
  voteReplyController
} from '~/controllers/replies.controllers';
import { filterMiddleware, paginationValidator } from '~/middlewares/common.middlewares';
import {
  createReplyValidator,
  deleteReplyValidator,
  editReplyValidator,
  replyIdValidator,
  voteReplyValidator
} from '~/middlewares/replies.middlewares';
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

repliesRouter.post(
  '/:reply_id/votes',
  accessTokenValidator,
  validateGroupQuestionAndMembership,
  voteReplyValidator,
  wrapRequestHandler(voteReplyController)
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

repliesRouter.get(
  '/:reply_id',
  accessTokenValidator,
  validateGroupQuestionAndMembership,
  wrapRequestHandler(getReplyByIdController)
);

export default repliesRouter;
