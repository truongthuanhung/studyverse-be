import { Router } from 'express';
import {
  createNotificationController,
  deleteNotificationController,
  getNotificationsController,
  getUnreadNotificationsCountController,
  markAllAsReadController,
  readNotificationController
} from '~/controllers/notifications.controllers';
import { notificationIdValidator } from '~/middlewares/notifications.middlewares';
import { accessTokenValidator } from '~/middlewares/users.middlewares';
import { wrapRequestHandler } from '~/utils/handlers';

const notificationsRouter = Router();

notificationsRouter.post('/', accessTokenValidator, wrapRequestHandler(createNotificationController));

notificationsRouter.get('/', accessTokenValidator, wrapRequestHandler(getNotificationsController));

notificationsRouter.get(
  '/unread-count',
  accessTokenValidator,
  wrapRequestHandler(getUnreadNotificationsCountController)
);

notificationsRouter.delete(
  '/:notification_id',
  accessTokenValidator,
  notificationIdValidator,
  wrapRequestHandler(deleteNotificationController)
);

notificationsRouter.patch(
  '/:notification_id/read',
  accessTokenValidator,
  notificationIdValidator,
  wrapRequestHandler(readNotificationController)
);

notificationsRouter.patch('/mark-all-read', accessTokenValidator, wrapRequestHandler(markAllAsReadController));

export default notificationsRouter;
