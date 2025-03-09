import { Request } from 'express';
import { checkSchema } from 'express-validator';
import { ObjectId } from 'mongodb';
import HTTP_STATUS from '~/constants/httpStatus';
import { USERS_MESSAGES } from '~/constants/messages';
import { ErrorWithStatus } from '~/models/Errors';
import { TokenPayload } from '~/models/requests/User.requests';
import databaseService from '~/services/database.services';
import { validate } from '~/utils/validation';

export const followValidator = validate(
  checkSchema({
    followed_user_id: {
      isMongoId: {
        errorMessage: USERS_MESSAGES.INVALID_FOLLOWED_USER_ID
      },
      custom: {
        options: async (value: string, { req }) => {
          const { user_id } = (req as Request).decoded_authorization as TokenPayload;
          if (user_id === value) {
            throw new ErrorWithStatus({
              message: USERS_MESSAGES.CANNOT_FOLLOW_SELF,
              status: HTTP_STATUS.BAD_REQUEST
            });
          }
          const followed_user = await databaseService.users.findOne({ _id: new ObjectId(value) });
          if (!followed_user) {
            throw new ErrorWithStatus({
              message: USERS_MESSAGES.USER_NOT_FOUND,
              status: HTTP_STATUS.NOT_FOUND
            });
          }
        }
      }
    }
  })
);

export const unfollowValidator = validate(
  checkSchema({
    unfollowed_user_id: {
      isMongoId: {
        errorMessage: USERS_MESSAGES.INVALID_FOLLOWED_USER_ID
      },
      custom: {
        options: async (value: string, { req }) => {
          const { user_id } = (req as Request).decoded_authorization as TokenPayload;
          if (user_id === value) {
            throw new ErrorWithStatus({
              message: USERS_MESSAGES.CANNOT_FOLLOW_SELF,
              status: HTTP_STATUS.BAD_REQUEST
            });
          }
          const followed_user = await databaseService.users.findOne({ _id: new ObjectId(value) });
          if (!followed_user) {
            throw new ErrorWithStatus({
              message: USERS_MESSAGES.USER_NOT_FOUND,
              status: HTTP_STATUS.NOT_FOUND
            });
          }
        }
      }
    }
  })
);
