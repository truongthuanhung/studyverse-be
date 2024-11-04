import { Request } from 'express';
import { checkSchema } from 'express-validator';
import { TokenPayload } from '~/models/requests/User.requests';
import conversationsService from '~/services/conversations.services';
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
      }
    },
    ['params']
  )
);
