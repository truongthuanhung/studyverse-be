import { Router } from 'express';
import {
  approveQuestionController,
  createQuestionController,
  deleteQuestionController,
  editQuestionController,
  getPendingQuestionsCountController,
  getQuestionByIdController,
  getQuestionsByGroupIdController,
  rejectQuestionController
} from '~/controllers/questions.controllers';
import { filterMiddleware } from '~/middlewares/common.middlewares';
import {
  approveQuestionValidator,
  getQuestionsValidator,
  rejectQuestionValidator
} from '~/middlewares/questions.middlewares';
import {
  adminValidator,
  createQuestionValidator,
  deleteQuestionValidator,
  editQuestionValidator,
  questionOwnerValidator,
  validateGroupMembership,
  validateGroupQuestionAndMembership
} from '~/middlewares/studyGroups.middlewares';
import { accessTokenValidator } from '~/middlewares/users.middlewares';
import { wrapRequestHandler } from '~/utils/handlers';
import repliesRouter from './replies.routes';
import {
  downvoteQuestionController,
  unvoteQuestionController,
  upvoteQuestionController
} from '~/controllers/votes.controllers';

const questionsRouter = Router({ mergeParams: true });

questionsRouter.post(
  '/',
  accessTokenValidator,
  validateGroupMembership,
  createQuestionValidator,
  wrapRequestHandler(createQuestionController)
);

questionsRouter.get(
  '/',
  accessTokenValidator,
  validateGroupMembership,
  getQuestionsValidator,
  wrapRequestHandler(getQuestionsByGroupIdController)
);

questionsRouter.get(
  '/pending-count',
  accessTokenValidator,
  validateGroupMembership,
  adminValidator,
  wrapRequestHandler(getPendingQuestionsCountController)
);

questionsRouter.patch(
  '/:question_id/approve',
  accessTokenValidator,
  validateGroupQuestionAndMembership,
  adminValidator,
  approveQuestionValidator,
  wrapRequestHandler(approveQuestionController)
);

questionsRouter.patch(
  '/:question_id/reject',
  accessTokenValidator,
  validateGroupQuestionAndMembership,
  adminValidator,
  rejectQuestionValidator,
  wrapRequestHandler(rejectQuestionController)
);

questionsRouter.patch(
  '/:question_id',
  accessTokenValidator,
  validateGroupQuestionAndMembership,
  questionOwnerValidator,
  editQuestionValidator,
  filterMiddleware(['title', 'content', 'tags', 'mentions', 'medias']),
  wrapRequestHandler(editQuestionController)
);

questionsRouter.delete(
  '/:question_id',
  accessTokenValidator,
  validateGroupQuestionAndMembership,
  deleteQuestionValidator,
  wrapRequestHandler(deleteQuestionController)
);

questionsRouter.post(
  '/:question_id/upvotes',
  accessTokenValidator,
  validateGroupQuestionAndMembership,
  wrapRequestHandler(upvoteQuestionController)
);

questionsRouter.post(
  '/:question_id/downvotes',
  accessTokenValidator,
  validateGroupQuestionAndMembership,
  wrapRequestHandler(downvoteQuestionController)
);

questionsRouter.post(
  '/:question_id/unvotes',
  accessTokenValidator,
  validateGroupQuestionAndMembership,
  wrapRequestHandler(unvoteQuestionController)
);

questionsRouter.get(
  '/:question_id',
  accessTokenValidator,
  validateGroupQuestionAndMembership,
  wrapRequestHandler(getQuestionByIdController)
);

questionsRouter.use('/:question_id/replies', repliesRouter);

export default questionsRouter;
