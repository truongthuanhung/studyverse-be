import { Request, Response, Router } from 'express';
import { ObjectId } from 'mongodb';
import {
  checkConversationParticipantsController,
  getConversationMessages,
  getConversationsController,
  getUnreadMessagesController
} from '~/controllers/conversations.controllers';
import {
  checkConversationParticipantsValidator,
  conversationMessagesValidator
} from '~/middlewares/conversations.middlewares';
import { accessTokenValidator } from '~/middlewares/users.middlewares';

import { wrapRequestHandler } from '~/utils/handlers';

const conversationsRouter = Router();

conversationsRouter.get('/', accessTokenValidator, getConversationsController);

conversationsRouter.get(
  '/:conversationId/messages',
  accessTokenValidator,
  conversationMessagesValidator,
  wrapRequestHandler(getConversationMessages)
);

conversationsRouter.get('/unread', accessTokenValidator, wrapRequestHandler(getUnreadMessagesController));

conversationsRouter.post(
  '/check-conversation-participants',
  accessTokenValidator,
  checkConversationParticipantsValidator,
  wrapRequestHandler(checkConversationParticipantsController)
);

export default conversationsRouter;
