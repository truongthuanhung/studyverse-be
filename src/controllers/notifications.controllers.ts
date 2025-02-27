import { Request, Response } from 'express';
import { NotificationStatus } from '~/constants/enums';
import NOTIFICATION_MESSAGES from '~/constants/notificationMessages';
import { TokenPayload } from '~/models/requests/User.requests';
import notificationsService from '~/services/notifications.services';

export const getUnreadNotificationsCountController = async (req: Request, res: Response) => {
  const { user_id } = req.decoded_authorization as TokenPayload;
  const result = await notificationsService.getUnreadNotificationsCount(user_id);
  return res.json({
    message: NOTIFICATION_MESSAGES.RETRIVE_SUCCESS,
    result
  });
};

export const readNotificationController = async (req: Request, res: Response) => {
  const { notification_id } = req.params;
  const { user_id } = req.decoded_authorization as TokenPayload;
  const result = await notificationsService.readNotification(user_id, notification_id);
  return res.json({
    message: NOTIFICATION_MESSAGES.READ_SUCCESS,
    result
  });
};

export const deleteNotificationController = async (req: Request, res: Response) => {
  const { notification_id } = req.params;
  const result = await notificationsService.deleteNotification(notification_id);
  return res.json({
    message: NOTIFICATION_MESSAGES.DELETE_SUCCESS,
    result
  });
};

export const markAllAsReadController = async (req: Request, res: Response) => {
  const { user_id } = req.decoded_authorization as TokenPayload;
  const result = await notificationsService.markAllAsRead(user_id);
  return res.json({
    message: NOTIFICATION_MESSAGES.MARK_AS_READ_SUCCESS,
    result: {
      modifiedCount: result
    }
  });
};

export const createNotificationController = async (req: Request, res: Response) => {
  const { body } = req;
  const result = await notificationsService.createNotification(body);
  return res.json({
    message: 'Created notification successfully',
    result
  });
};

export const getNotificationsController = async (req: Request, res: Response) => {
  const { user_id } = req.decoded_authorization as TokenPayload;
  const { page = '1', limit = '10', status } = req.query;

  const pageNumber = parseInt(page as string, 10);
  const limitNumber = parseInt(limit as string, 10);

  let statusValue: NotificationStatus | undefined;

  // Nếu status được cung cấp, chuyển đổi nó thành số
  if (status !== undefined) {
    statusValue = parseInt(status as string, 10) as NotificationStatus;
  }

  const result = await notificationsService.getNotifications({
    user_id,
    page: pageNumber,
    limit: limitNumber,
    status: statusValue
  });

  return res.json({
    message: NOTIFICATION_MESSAGES.RETRIVE_SUCCESS,
    result
  });
};
