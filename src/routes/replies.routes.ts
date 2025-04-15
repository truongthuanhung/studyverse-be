import { Router } from 'express';
import {
  approveReplyByQuestionOwnerController,
  approveReplyByTeacherAdminController,
  createReplyController,
  deleteReplyController,
  downvoteReplyController,
  editReplyController,
  getChildRepliesController,
  getRepliesByQuestionIdController,
  getReplyByIdController,
  unvoteReplyController,
  upvoteReplyController,
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
import {
  validateGroupQuestionAndMembership,
  validateGroupQuestionReplyAndMembership
} from '~/middlewares/studyGroups.middlewares';
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

repliesRouter.get(
  '/:reply_id/child-replies',
  accessTokenValidator,
  validateGroupQuestionReplyAndMembership,
  paginationValidator,
  wrapRequestHandler(getChildRepliesController)
);

repliesRouter.post(
  '/:reply_id/votes',
  accessTokenValidator,
  validateGroupQuestionAndMembership,
  voteReplyValidator,
  wrapRequestHandler(voteReplyController)
);

repliesRouter.post(
  '/:reply_id/upvotes',
  accessTokenValidator,
  validateGroupQuestionAndMembership,
  voteReplyValidator,
  wrapRequestHandler(upvoteReplyController)
);

repliesRouter.post(
  '/:reply_id/downvotes',
  accessTokenValidator,
  validateGroupQuestionAndMembership,
  voteReplyValidator,
  wrapRequestHandler(downvoteReplyController)
);

repliesRouter.post(
  '/:reply_id/unvotes',
  accessTokenValidator,
  validateGroupQuestionAndMembership,
  voteReplyValidator,
  wrapRequestHandler(unvoteReplyController)
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
  validateGroupQuestionReplyAndMembership,
  wrapRequestHandler(getReplyByIdController)
);

repliesRouter.put(
  '/:reply_id/teacher-approve',
  accessTokenValidator,
  validateGroupQuestionReplyAndMembership,
  replyIdValidator,
  wrapRequestHandler(approveReplyByTeacherAdminController)
);

repliesRouter.put(
  '/:reply_id/user-approve',
  accessTokenValidator,
  validateGroupQuestionReplyAndMembership,
  replyIdValidator,
  wrapRequestHandler(approveReplyByQuestionOwnerController)
);

export default repliesRouter;
