import { CreateNotificationBody } from '~/models/requests/Notification.requests';
import databaseService from './database.services';
import Notification from '~/models/schemas/Notification.schema';
import { NotificationStatus, StudyGroupRole } from '~/constants/enums';
import { ObjectId } from 'mongodb';
import { getIO, getUserSocketId } from '~/configs/socket';
import { ErrorWithStatus } from '~/models/Errors';
import HTTP_STATUS from '~/constants/httpStatus';
import NOTIFICATION_MESSAGES from '~/constants/notificationMessages';

class NotificationsService {
  async getUnreadNotificationsCount(userId: string) {
    const count = await databaseService.notifications.countDocuments({
      user_id: new ObjectId(userId),
      status: NotificationStatus.Unread
    });
    return count;
  }

  async createNotification(body: CreateNotificationBody) {
    const { insertedId } = await databaseService.notifications.insertOne(
      new Notification({
        ...body,
        status: NotificationStatus.Unread,
        user_id: new ObjectId(body.user_id),
        actor_id: new ObjectId(body.actor_id),
        group_id: body.group_id ? new ObjectId(body.group_id) : undefined,
        reference_id: new ObjectId(body.reference_id)
      })
    );
    const result = await this.getNotificationById(insertedId.toString());
    const io = getIO();
    const receiverSocketId = getUserSocketId(body.user_id);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit('new_notification', result);
    }
    return result;
  }

  async getNotificationById(notification_id: string) {
    const notification = await databaseService.notifications
      .aggregate([
        {
          $match: { _id: new ObjectId(notification_id) }
        },
        {
          $lookup: {
            from: 'users',
            localField: 'actor_id',
            foreignField: '_id',
            as: 'actor'
          }
        },
        {
          $unwind: {
            path: '$actor',
            preserveNullAndEmptyArrays: true
          }
        },
        {
          $project: {
            _id: 1,
            user_id: 1,
            actor_id: 1,
            reference_id: 1,
            target_url: 1,
            type: 1,
            content: 1,
            status: 1,
            created_at: 1,
            'actor.name': 1,
            'actor.avatar': 1,
            'actor.username': 1
          }
        }
      ])
      .toArray();
    return notification.length > 0 ? notification[0] : null;
  }

  async getNotifications({
    user_id,
    limit,
    page,
    status
  }: {
    user_id: string;
    page: number;
    limit: number;
    status?: NotificationStatus; // Status là tham số tùy chọn
  }) {
    const skip = (page - 1) * limit;

    // Create a match condition based on the user_id and status parameters
    const matchCondition: any = { user_id: new ObjectId(user_id) };

    // Chỉ thêm điều kiện status nếu nó được truyền vào và khác undefined/null
    if (status !== undefined && status !== null) {
      matchCondition.status = status;
    }

    // Use aggregation to get notifications with actor information
    const notifications = await databaseService.notifications
      .aggregate([
        {
          $match: matchCondition
        },
        {
          $sort: { created_at: -1 } // Sort by created_at in descending order (mặc định luôn là newest)
        },
        {
          $skip: skip
        },
        {
          $limit: limit
        },
        {
          $lookup: {
            from: 'users',
            localField: 'actor_id',
            foreignField: '_id',
            as: 'actor'
          }
        },
        {
          $unwind: {
            path: '$actor',
            preserveNullAndEmptyArrays: true
          }
        },
        {
          $lookup: {
            from: 'study_groups',
            localField: 'group_id',
            foreignField: '_id',
            as: 'group'
          }
        },
        {
          $unwind: {
            path: '$group',
            preserveNullAndEmptyArrays: true
          }
        },
        {
          $project: {
            _id: 1,
            user_id: 1,
            actor_id: 1,
            reference_id: 1,
            target_url: 1,
            type: 1,
            content: 1,
            status: 1,
            group_id: 1,
            created_at: 1,
            'actor.name': 1,
            'actor.avatar': 1,
            'actor.username': 1,
            'group.name': 1
          }
        }
      ])
      .toArray();

    // Get total count for pagination
    const total = await databaseService.notifications.countDocuments(matchCondition);
    const totalPages = Math.ceil(total / limit);

    return {
      notifications,
      pagination: {
        total,
        page,
        limit,
        totalPages
      }
    };
  }

  async readNotification(user_id: string, notification_id: string) {
    const notification = await databaseService.notifications.findOneAndUpdate(
      {
        _id: new ObjectId(notification_id),
        user_id: new ObjectId(user_id)
      },
      {
        $set: {
          status: NotificationStatus.Read
        }
      },
      {
        returnDocument: 'after'
      }
    );
    if (!notification) {
      throw new ErrorWithStatus({
        status: HTTP_STATUS.NOT_FOUND,
        message: NOTIFICATION_MESSAGES.NOT_FOUND
      });
    }
    return notification;
  }

  async deleteNotification(notification_id: string) {
    const notification = await databaseService.notifications.findOneAndDelete({
      _id: new ObjectId(notification_id)
    });
    if (!notification) {
      throw new ErrorWithStatus({
        status: HTTP_STATUS.NOT_FOUND,
        message: NOTIFICATION_MESSAGES.NOT_FOUND
      });
    }
    return notification;
  }

  async markAllAsRead(user_id: string) {
    const result = await databaseService.notifications.updateMany(
      { user_id: new ObjectId(user_id), status: NotificationStatus.Unread },
      { $set: { status: NotificationStatus.Read } }
    );
    return result.modifiedCount;
  }

  async emitToAdminGroup({
    group_id,
    event_name,
    body
  }: {
    group_id: string;
    event_name: string;
    body: Omit<CreateNotificationBody, 'user_id'>;
  }) {
    const io = getIO();
    io.to(`group_${group_id}_admins`).emit(event_name, group_id);
    const adminMembers = await databaseService.study_group_members
      .find({
        group_id: new ObjectId(group_id),
        role: StudyGroupRole.Admin
      })
      .toArray();
    const notificationPromises = adminMembers.map((admin) => {
      return notificationsService.createNotification({
        ...body,
        user_id: admin.user_id.toString()
      });
    });

    Promise.all(notificationPromises);
  }
}

const notificationsService = new NotificationsService();

export default notificationsService;
