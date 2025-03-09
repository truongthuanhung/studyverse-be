import { Request } from 'express';
import { checkSchema } from 'express-validator';
import { ObjectId } from 'mongodb';
import HTTP_STATUS from '~/constants/httpStatus';
import { ErrorWithStatus } from '~/models/Errors';
import { TokenPayload } from '~/models/requests/User.requests';
import databaseService from '~/services/database.services';
import { validate } from '~/utils/validation';

export const invitationIdValidator = validate(
  checkSchema(
    {
      invitation_id: {
        isMongoId: {
          errorMessage: 'Invalid question_id'
        },
        custom: {
          options: async (value: string, { req }) => {
            const invitation = await databaseService.study_group_invitations.findOne({
              _id: new ObjectId(value)
            });
            if (!invitation) {
              throw new ErrorWithStatus({
                message: 'Invitation not found',
                status: HTTP_STATUS.NOT_FOUND
              });
            }
            const { user_id } = (req as Request).decoded_authorization as TokenPayload;
            if (user_id !== invitation.invited_user_id.toString()) {
              throw new ErrorWithStatus({
                status: HTTP_STATUS.FORBIDDEN,
                message: 'User do not have permisson on this invitation'
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
