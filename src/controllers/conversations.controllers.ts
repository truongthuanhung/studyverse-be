import { Request, Response } from 'express';
import { ObjectId } from 'mongodb';
import { TokenPayload } from '~/models/requests/User.requests';
import conversationsService from '~/services/conversations.services';
import databaseService from '~/services/database.services';

export const getConversationsController = async (req: Request, res: Response) => {
  const { user_id } = req.decoded_authorization as TokenPayload;
  const result = await conversationsService.getConversations(user_id);
  return res.json({
    message: 'Get conversations successfully',
    result
  });
};

export const getConversationMessages = async (req: Request, res: Response) => {
  const { conversationId } = req.params;
  const { limit, page } = req.query;
  const { user_id } = req.decoded_authorization as TokenPayload;

  const result = await conversationsService.getConversationDetail(
    user_id,
    conversationId,
    Number(limit) || undefined,
    Number(page) || undefined
  );

  return res.json({
    message: 'Get conversations successfully',
    result
  });
};

export const getUnreadMessagesController = async (req: Request, res: Response) => {
  const { user_id } = req.decoded_authorization as TokenPayload;
  const result = await conversationsService.getUnreadMessages(user_id);
  return res.json({
    message: 'Get unread messages count successfully',
    result
  });
};

export const checkConversationParticipantsController = async (req: Request, res: Response) => {
  const { user_id } = req.decoded_authorization as TokenPayload;
  const { partner_id } = req.body;
  const result = await conversationsService.checkConversationParticipants(user_id, partner_id);
  return res.json(result);
};
