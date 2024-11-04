import { Request, Response, Router } from 'express';
import { ObjectId } from 'mongodb';
import { getConversationMessages, getConversationsController } from '~/controllers/conversations.controllers';
import { conversationMessagesValidator } from '~/middlewares/conversations.middlewares';
import { accessTokenValidator } from '~/middlewares/users.middlewares';
import { TokenPayload } from '~/models/requests/User.requests';
import databaseService from '~/services/database.services';
import { wrapRequestHandler } from '~/utils/handlers';

const conversationsRouter = Router();

conversationsRouter.get('/', accessTokenValidator, getConversationsController);

conversationsRouter.get(
  '/:conversationId/messages',
  accessTokenValidator,
  conversationMessagesValidator,
  wrapRequestHandler(getConversationMessages)
);

conversationsRouter.get(
  '/unread',
  accessTokenValidator,
  wrapRequestHandler(async (req: Request, res: Response) => {
    const { user_id } = req.decoded_authorization as TokenPayload;
    const user_id_obj = new ObjectId(user_id);

    // Tìm tất cả conversation mà user tham gia
    const conversations = await databaseService.conversations
      .find({
        participants: user_id_obj
      })
      .toArray();

    // Tính tổng số tin nhắn chưa đọc
    const total_unread = conversations.reduce((sum, conversation) => {
      return sum + (conversation.unread_count[user_id] ? conversation.unread_count[user_id] : 0);
    }, 0);

    return res.json({
      message: 'Get unread messages count successfully',
      result: total_unread
    });
  })
);

export default conversationsRouter;
