import { checkSchema } from 'express-validator';
import { validate } from '~/utils/validation';
import { GroupPrivacy, StudyGroupRole } from '~/constants/enums';
import { ErrorWithStatus } from '~/models/Errors';
import HTTP_STATUS from '~/constants/httpStatus';
import studyGroupsService from '~/services/studyGroups.services';
import { NextFunction, Request, Response } from 'express';
import { TokenPayload } from '~/models/requests/User.requests';
import databaseService from '~/services/database.services';
import { ObjectId } from 'mongodb';

export const createStudyGroupValidator = validate(
  checkSchema(
    {
      name: {
        in: ['body'],
        isString: {
          errorMessage: 'Group name must be a string.'
        },
        isLength: {
          options: { min: 3, max: 100 },
          errorMessage: 'Group name must be between 3 and 100 characters.'
        },
        notEmpty: {
          errorMessage: 'Group name is required.'
        }
      },
      privacy: {
        in: ['body'],
        isIn: {
          options: [[GroupPrivacy.Public, GroupPrivacy.Private]],
          errorMessage: `Privacy must be one of: ${Object.values(GroupPrivacy).join(', ')}.`
        }
      },
      description: {
        in: ['body'],
        optional: true,
        isString: {
          errorMessage: 'Description must be a string.'
        },
        isLength: {
          options: { max: 500 },
          errorMessage: 'Description must not exceed 500 characters.'
        }
      },
      cover_photo: {
        in: ['body'],
        optional: true,
        isString: {
          errorMessage: 'Cover photo URL must be a string.'
        },
        isURL: {
          errorMessage: 'Cover photo must be a valid URL.'
        }
      }
    },
    ['body']
  )
);

export const getStudyGroupsValidator = validate(
  checkSchema(
    {
      type: {
        optional: true,
        custom: {
          options: (value: string) => {
            const validTypes = ['all', 'admin', 'member'];
            if (!validTypes.includes(value)) {
              throw new ErrorWithStatus({
                message: `Type must be one of: ${validTypes.join(', ')}`,
                status: HTTP_STATUS.BAD_REQUEST
              });
            }
            return true;
          }
        }
      }
    },
    ['query']
  )
);

export const groupValidator = validate(
  checkSchema(
    {
      group_id: {
        isMongoId: {
          errorMessage: 'Invalid group_id'
        },
        custom: {
          options: async (value: string) => {
            const isExists = await studyGroupsService.isGroupExists(value);
            if (!isExists) {
              throw new ErrorWithStatus({
                message: 'Study group not found',
                status: HTTP_STATUS.NOT_FOUND
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

export const joinRequestValidator = validate(
  checkSchema(
    {
      join_request_id: {
        isMongoId: {
          errorMessage: 'Invalid join_request_id'
        },
        custom: {
          options: async (value: string) => {
            const isExists = await studyGroupsService.isJoinRequestExists(value);
            if (!isExists) {
              throw new ErrorWithStatus({
                message: 'Join request not found',
                status: HTTP_STATUS.NOT_FOUND
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

export const groupAdminValidator = async (req: Request, res: Response, next: NextFunction) => {
  const { user_id } = req.decoded_authorization as TokenPayload;
  const { group_id } = req.params;
  const adminMember = await databaseService.study_group_members.findOne({
    user_id: new ObjectId(user_id),
    group_id: new ObjectId(group_id),
    role: StudyGroupRole.Admin
  });

  if (!adminMember) {
    next(
      new ErrorWithStatus({
        status: HTTP_STATUS.FORBIDDEN,
        message: 'User has no permission on this group'
      })
    );
  }
  next();
};
