import { ObjectId } from 'mongodb';
import { Server } from 'socket.io';
import databaseService from '~/services/database.services';
import { Server as ServerHttp } from 'http';
import Message from '~/models/schemas/Message.schema';
import { ConversationType } from '~/constants/enums';
import Conversation from '~/models/schemas/Conversation.schema';
import { ErrorWithStatus } from '~/models/Errors';
import USERS_MESSAGES from '~/constants/messages';
import HTTP_STATUS from '~/constants/httpStatus';
import { verifyToken } from '~/utils/jwt';
import { JsonWebTokenError } from 'jsonwebtoken';
import { verifyAccessToken } from '~/utils/common';

let io: Server;

const users: {
  [key: string]: {
    socket_id: string;
  };
} = {};

const initSocket = (httpServer: ServerHttp) => {
  io = new Server(httpServer, {
    cors: {
      origin: true, // Cho phép tất cả origins
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
      credentials: false
    }
  });

  // io.use(async (socket, next) => {
  //   const { Authorization } = socket.handshake.auth;
  //   const access_token = Authorization?.split(' ')[1];
  //   try {
  //     const decoded_authorization = await verifyAccessToken(access_token);
  //     // Truyền decoded_authorization vào socket để sử dụng ở các middleware khác
  //     socket.handshake.auth.decoded_authorization = decoded_authorization;
  //     socket.handshake.auth.access_token = access_token;
  //     next();
  //   } catch (error) {
  //     next({
  //       message: 'Unauthorized',
  //       name: 'UnauthorizedError',
  //       data: error
  //     });
  //   }
  // });

  io.on('connection', (socket) => {
    console.log(`user ${socket.id} connected`);
    const user_id = socket.handshake.auth._id;
    users[user_id] = {
      socket_id: socket.id
    };
    console.log(users);
    socket.on('create_message', async (conversationId, message) => {
      if (conversationId === 'new') {
        return;
      }
      const isValid = ObjectId.isValid(conversationId);
      if (!isValid) return;
      const conversation = await databaseService.conversations.findOne({
        _id: new ObjectId(conversationId as string)
      });

      if (!conversation) {
        throw new Error('Conversation not found');
      }
      const otherParticipantId = conversation.participants
        .find((participantId) => participantId.toString() !== user_id)
        ?.toString();

      if (!otherParticipantId) {
        throw new Error('Other participant not found');
      }

      // Create update object for unread_count
      const unreadCountUpdate = {
        ...conversation.unread_count,
        [otherParticipantId]: (conversation.unread_count[otherParticipantId] || 0) + 1
      };

      // Execute database operations
      await Promise.all([
        databaseService.messages.insertOne(
          new Message({
            conversation_id: new ObjectId(conversationId as string),
            content: message,
            sender_id: new ObjectId(user_id as string)
          })
        ),
        databaseService.conversations.findOneAndUpdate(
          { _id: new ObjectId(conversationId as string) },
          {
            $set: {
              last_message: {
                content: message,
                sender_id: new ObjectId(user_id as string)
              },
              unread_count: unreadCountUpdate
            },
            $currentDate: {
              updated_at: true
            }
          }
        )
      ]);
    });

    socket.on('send_message', async (conversationId, message) => {
      const isValid = ObjectId.isValid(conversationId);
      if (!isValid) return;
      const conversation = await databaseService.conversations.findOne({
        _id: new ObjectId(conversationId as string)
      });

      if (!conversation) {
        throw new Error('Conversation not found');
      }
      const otherParticipantId = conversation.participants
        .find((participantId) => participantId.toString() !== user_id)
        ?.toString();

      if (!otherParticipantId) {
        throw new Error('Other participant not found');
      }
      const unreadCountUpdate = {
        ...conversation.unread_count,
        [otherParticipantId]: (conversation.unread_count[otherParticipantId] || 0) + 1
      };

      // Execute database operations
      await Promise.all([
        databaseService.messages.insertOne(
          new Message({
            conversation_id: new ObjectId(conversationId as string),
            content: message,
            sender_id: new ObjectId(user_id as string)
          })
        ),
        databaseService.conversations.findOneAndUpdate(
          { _id: new ObjectId(conversationId as string) },
          {
            $set: {
              last_message: {
                content: message,
                sender_id: new ObjectId(user_id as string)
              },
              unread_count: unreadCountUpdate
            },
            $currentDate: {
              updated_at: true
            }
          }
        )
      ]);

      socket.emit('refresh_conversations', conversationId);
      const receiver_socket_id = users[otherParticipantId]?.socket_id;
      if (receiver_socket_id) {
        socket.to(receiver_socket_id).emit('get_new_message', conversationId);
      }
    });

    socket.on('send_new_message', async (partnerId, message) => {
      console.log({ user_id, partnerId, message });
      if (!ObjectId.isValid(partnerId) || !ObjectId.isValid(user_id)) return;
      let conversationId;

      // First check if conversation exists
      const existingConversation = await databaseService.conversations.findOne({
        participants: {
          $all: [new ObjectId(user_id as string), new ObjectId(partnerId as string)]
        }
      });

      if (existingConversation) {
        // Update existing conversation
        conversationId = existingConversation._id;
        await Promise.all([
          databaseService.conversations.updateOne(
            { _id: existingConversation._id },
            {
              $set: {
                last_message: {
                  content: message,
                  sender_id: new ObjectId(user_id as string)
                },
                updated_at: new Date(),
                [`unread_count.${partnerId}`]: (existingConversation.unread_count[partnerId] || 0) + 1
              }
            }
          ),
          databaseService.messages.insertOne(
            new Message({
              conversation_id: new ObjectId(conversationId),
              content: message,
              sender_id: new ObjectId(user_id as string)
            })
          )
        ]);
      } else {
        // Create new conversation
        const newConversation = new Conversation({
          participants: [new ObjectId(user_id as string), new ObjectId(partnerId as string)],
          type: ConversationType.Direct,
          last_message: {
            content: message,
            sender_id: new ObjectId(user_id as string)
          },
          unread_count: {
            [partnerId]: 1,
            [user_id]: 0
          }
        });

        const result = await databaseService.conversations.insertOne(newConversation);
        conversationId = result.insertedId;
        await databaseService.messages.insertOne(
          new Message({
            conversation_id: new ObjectId(conversationId),
            content: message,
            sender_id: new ObjectId(user_id as string)
          })
        );
        socket.emit('create_new_conversation', conversationId);
      }
    });

    socket.on('read_message', async (conversationId: string) => {
      const isValid = ObjectId.isValid(conversationId);
      if (!isValid) return;
      await databaseService.conversations.findOneAndUpdate(
        { _id: new ObjectId(conversationId as string) },
        {
          $set: {
            [`unread_count.${user_id}`]: 0
          }
        }
      );
      socket.emit('mark_as_read', conversationId);
    });

    socket.on('group_admins', (group_id: string) => {
      socket.join(`group_admins_${group_id}`);
    });

    socket.on('disconnect', () => {
      delete users[user_id];
      console.log(users);
      console.log(`user ${socket.id} disconnected`);
    });
  });
};

export const getIO = () => {
  if (!io) {
    throw new Error('Socket.io not initialized');
  }
  return io;
};

export const getUserSocketId = (userId: string) => {
  return users[userId]?.socket_id;
};

export default initSocket;
