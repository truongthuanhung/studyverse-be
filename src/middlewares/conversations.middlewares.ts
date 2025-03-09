import { Request } from 'express';
import { checkSchema } from 'express-validator';
import HTTP_STATUS from '~/constants/httpStatus';
import { USERS_MESSAGES } from '~/constants/messages';
import { ErrorWithStatus } from '~/models/Errors';
import { TokenPayload } from '~/models/requests/User.requests';
import conversationsService from '~/services/conversations.services';
import usersService from '~/services/users.services';
import { validate } from '~/utils/validation';

export const conversationMessagesValidator = validate(
  checkSchema(
    {
      conversationId: {
        isMongoId: {
          errorMessage: 'conversationId must be valid MongoId'
        },
        custom: {
          options: async (value: string, { req }) => {
            const { user_id } = (req as Request).decoded_authorization as TokenPayload;
            await conversationsService.checkValidUser(user_id, value);
            return true;
          }
        }
      },
      limit: {
        optional: true,
        isInt: {
          options: { min: 1, max: 100 },
          errorMessage: 'Limit must be between 1 and 100'
        },
        toInt: true
      },
      page: {
        optional: true,
        isInt: {
          options: { min: 1 },
          errorMessage: 'Page must be greater than or equal to 1'
        },
        toInt: true
      }
    },
    ['params', 'query']
  )
);

export const checkConversationParticipantsValidator = validate(
  checkSchema(
    {
      partner_id: {
        isMongoId: {
          errorMessage: 'userId must be valid MongoId'
        },
        custom: {
          options: async (value: string, { req }) => {
            const isExisted = await usersService.checkUserExists(value);
            if (!isExisted) {
              throw new ErrorWithStatus({
                status: HTTP_STATUS.NOT_FOUND,
                message: USERS_MESSAGES.USER_NOT_FOUND
              });
            }
            return true;
          }
        }
      }
    },
    ['body']
  )
);
