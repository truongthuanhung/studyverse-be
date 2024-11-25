import { ObjectId } from 'mongodb';
import databaseService from './database.services';
import { ErrorWithStatus } from '~/models/Errors';
import HTTP_STATUS from '~/constants/httpStatus';

class ConversationsService {
  async checkValidUser(user_id: string, conversation_id: string) {
    const conversation = await databaseService.conversations.findOne({
      _id: new ObjectId(conversation_id)
    });
    if (!conversation) {
      throw new ErrorWithStatus({
        message: 'Conversation not found',
        status: HTTP_STATUS.NOT_FOUND
      });
    }
    if (!conversation.participants.map((id) => id.toString()).includes(user_id)) {
      throw new ErrorWithStatus({
        message: 'User is not a participant in the conversation',
        status: HTTP_STATUS.FORBIDDEN
      });
    }
    return true;
  }
  async getConversations(user_id: string) {
    const result = await databaseService.conversations
      .aggregate([
        {
          $match: {
            participants: { $in: [new ObjectId(user_id)] }
          }
        },
        {
          $lookup: {
            from: 'users',
            let: { participantIds: '$participants' },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [{ $in: ['$_id', '$$participantIds'] }, { $ne: ['$_id', new ObjectId(user_id)] }]
                  }
                }
              },
              {
                $project: {
                  name: 1,
                  avatar: 1
                }
              }
            ],
            as: 'other_user'
          }
        },
        {
          $unwind: '$other_user'
        },
        {
          $project: {
            _id: 1,
            created_at: 1,
            updated_at: 1,
            last_message: 1,
            type: 1,
            unread_count: { $getField: { field: user_id, input: '$unread_count' } },
            other_user: {
              _id: '$other_user._id',
              name: '$other_user.name',
              avatar: '$other_user.avatar'
            }
          }
        },
        {
          $sort: { updated_at: -1 }
        }
      ])
      .toArray();
    return result;
  }

  async getConversationDetail(user_id: string, conversation_id: string) {
    // Get conversation first to check exists
    const conversation = await databaseService.conversations.findOne(
      { _id: new ObjectId(conversation_id) },
      { projection: { participants: 1 } }
    );

    if (!conversation) {
      throw new Error('Conversation not found');
    }

    const [messages, partner] = await Promise.all([
      // Get messages
      databaseService.messages
        .find({
          conversation_id: new ObjectId(conversation_id)
        })
        .sort({ created_at: 1 })
        .toArray(),

      // Get partner info
      databaseService.users.findOne(
        {
          _id: {
            $in: conversation.participants.filter((id) => id.toString() !== user_id)
          }
        },
        { projection: { name: 1, avatar: 1 } }
      )
    ]);

    return {
      messages: messages.map((message) => ({
        ...message,
        isSender: message.sender_id.toString() === user_id
      })),
      partner
    };
  }
}

const conversationsService = new ConversationsService();
export default conversationsService;
