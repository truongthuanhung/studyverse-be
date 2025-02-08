import { Router } from 'express';
import { voteQuestionController } from '~/controllers/votes.controllers';
import { voteQuestionValidator } from '~/middlewares/questions.middlewares';
import { groupIdValidator, groupMemberValidator, questionIdValidator } from '~/middlewares/studyGroups.middlewares';
import { accessTokenValidator } from '~/middlewares/users.middlewares';
import { wrapRequestHandler } from '~/utils/handlers';

const votesRouter = Router({ mergeParams: true });

votesRouter.post(
  '/',
  accessTokenValidator,
  groupIdValidator,
  questionIdValidator,
  groupMemberValidator,
  voteQuestionValidator,
  wrapRequestHandler(voteQuestionController)
);

export default votesRouter;
