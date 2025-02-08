import { Router } from 'express';
import {
  createQuestionController,
  editQuestionController,
  getQuestionByIdController,
  getQuestionsByGroupIdController
} from '~/controllers/questions.controllers';
import { filterMiddleware } from '~/middlewares/common.middlewares';
import { getQuestionsValidator } from '~/middlewares/questions.middlewares';
import {
  createQuestionValidator,
  editQuestionValidator,
  groupIdValidator,
  groupMemberValidator,
  questionIdValidator,
  questionOwnerValidator,
  validateGroupQuestionAndMembership
} from '~/middlewares/studyGroups.middlewares';
import { accessTokenValidator } from '~/middlewares/users.middlewares';
import { wrapRequestHandler } from '~/utils/handlers';
import votesRouter from './votes.routes';
import repliesRouter from './replies.routes';

const questionsRouter = Router({ mergeParams: true });

questionsRouter.post(
  '/',
  accessTokenValidator,
  groupIdValidator,
  groupMemberValidator,
  createQuestionValidator,
  wrapRequestHandler(createQuestionController)
);

questionsRouter.get(
  '/',
  accessTokenValidator,
  groupIdValidator,
  groupMemberValidator,
  getQuestionsValidator,
  wrapRequestHandler(getQuestionsByGroupIdController)
);

questionsRouter.patch(
  '/:question_id',
  accessTokenValidator,
  groupIdValidator,
  groupMemberValidator,
  questionIdValidator,
  questionOwnerValidator,
  editQuestionValidator,
  filterMiddleware(['title', 'content', 'tags', 'mentions', 'medias']),
  wrapRequestHandler(editQuestionController)
);

questionsRouter.get(
  '/:question_id',
  accessTokenValidator,
  validateGroupQuestionAndMembership,
  wrapRequestHandler(getQuestionByIdController)
);

questionsRouter.use('/:question_id/votes', votesRouter);
questionsRouter.use('/:question_id/replies', repliesRouter);

export default questionsRouter;
