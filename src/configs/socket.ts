import { ObjectId } from 'mongodb';
import { Server } from 'socket.io';
import databaseService from '~/services/database.services';
import { Server as ServerHttp } from 'http';
import Message from '~/models/schemas/Message.schema';

const initSocket = (httpServer: ServerHttp) => {
  const io = new Server(httpServer, {
    cors: {
      origin: 'http://localhost:3000'
    }
  });

  const users: {
    [key: string]: {
      socket_id: string;
    };
  } = {};

  io.on('connection', (socket) => {
    console.log(`user ${socket.id} connected`);
    const user_id = socket.handshake.auth._id;
    users[user_id] = {
      socket_id: socket.id
    };
    console.log(users);
    socket.on('create_message', async (conversationId, message) => {
      const data = {
        message: 'Call the GET message API',
        target: '2 members of a conversation',
        reason: '1 member create a new message into that conversationId',
        text_send: message,
        conversationId: conversationId
      };

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
      console.log(conversationId, message, user_id);
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

      const receiver_socket_id = users[otherParticipantId]?.socket_id;
      if (receiver_socket_id) {
        socket.to(receiver_socket_id).emit('get_new_message', conversationId);
        socket.emit('get_new_message', conversationId);
      }
    });

    socket.on('read_message', async (conversationId) => {
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
    socket.on('disconnect', () => {
      delete users[user_id];
      console.log(users);
      console.log(`user ${socket.id} disconnected`);
    });
  });
};

export default initSocket;
