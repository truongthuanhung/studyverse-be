import { Request } from 'express';
import { checkSchema } from 'express-validator';
import { ObjectId } from 'mongodb';
import HTTP_STATUS from '~/constants/httpStatus';
import NOTIFICATION_MESSAGES from '~/constants/notificationMessages';
import { ErrorWithStatus } from '~/models/Errors';
import { TokenPayload } from '~/models/requests/User.requests';
import databaseService from '~/services/database.services';
import { validate } from '~/utils/validation';

export const notificationIdValidator = validate(
  checkSchema(
    {
      notification_id: {
        isMongoId: {
          errorMessage: NOTIFICATION_MESSAGES.INVALID_ID
        },
        custom: {
          options: async (value: string, { req }) => {
            const { user_id } = (req as Request).decoded_authorization as TokenPayload;
            const notification = await databaseService.notifications.findOne({
              _id: new ObjectId(value),
              user_id: new ObjectId(user_id)
            });
            if (!notification) {
              throw new ErrorWithStatus({
                status: HTTP_STATUS.NOT_FOUND,
                message: NOTIFICATION_MESSAGES.NOT_FOUND
              });
            }
            return true;
          }
        }
      }
    },
    ['params']
  )
);
