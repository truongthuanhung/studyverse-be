import { Request } from 'express';
import { checkSchema } from 'express-validator';
import { ObjectId } from 'mongodb';
import HTTP_STATUS from '~/constants/httpStatus';
import { ErrorWithStatus } from '~/models/Errors';
import Question from '~/models/schemas/Question.schema';
import databaseService from '~/services/database.services';
import questionsService from '~/services/questions.services';
import repliesService from '~/services/replies.services';
import { validate } from '~/utils/validation';

export const createReplyValidator = validate(
  checkSchema(
    {
      content: {
        isString: {
          errorMessage: 'Content must be a string'
        },
        isLength: {
          options: {
            min: 1,
            max: 1000
          },
          errorMessage: 'Content must be between 1 and 1000 characters'
        }
      },
      medias: {
        optional: true,
        isArray: true,
        custom: {
          options: (value) => {
            if (value.some((item: any) => typeof item !== 'string')) {
              throw new Error('Medias must be an array of string');
            }
            return true;
          }
        }
      },
      parent_id: {
        custom: {
          options: async (value: string | null, { req }) => {
            if (value === null) {
              return true;
            }
            if (!ObjectId.isValid(value)) {
              throw new ErrorWithStatus({
                message: 'Invalid parent id',
                status: HTTP_STATUS.BAD_REQUEST
              });
            }
            const reply = await databaseService.replies.findOne({
              _id: new ObjectId(value)
            });
            if (!reply || reply.question_id.toString() !== (req as Request).question?._id || reply.parent_id !== null) {
              throw new ErrorWithStatus({
                message: 'Invalid parent id',
                status: HTTP_STATUS.BAD_REQUEST
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

export const deleteReplyValidator = validate(
  checkSchema({
    reply_id: {
      in: ['params'],
      isMongoId: {
        errorMessage: 'Invalid reply id'
      },
      custom: {
        options: async (value: string, { req }) => {
          const reply = await repliesService.checkReplyExists(value);
          const question = (req as Request).question as Question;
          if (!question._id?.equals(reply.question_id)) {
            throw new ErrorWithStatus({
              message: 'Invalid reply_id',
              status: HTTP_STATUS.BAD_REQUEST
            });
          }
          const current_user_id = (req as Request).decoded_authorization?.user_id as string;
          if (current_user_id === reply.user_id.toString() || reply.user_id.equals(question?.user_id)) {
            return true;
          } else {
            throw new ErrorWithStatus({
              message: 'You have no permisson on this reply',
              status: HTTP_STATUS.FORBIDDEN
            });
          }
        }
      }
    }
  })
);

export const editReplyValidator = validate(
  checkSchema({
    reply_id: {
      in: ['params'],
      isMongoId: {
        errorMessage: 'Invalid reply id'
      },
      custom: {
        options: async (value: string, { req }) => {
          const reply = await repliesService.checkReplyExists(value);
          const question = (req as Request).question as Question;
          if (!question._id?.equals(reply.question_id)) {
            throw new ErrorWithStatus({
              message: 'Invalid reply_id',
              status: HTTP_STATUS.BAD_REQUEST
            });
          }
          const current_user_id = (req as Request).decoded_authorization?.user_id as string;
          if (current_user_id === reply.user_id.toString() || reply.user_id.equals(question?.user_id)) {
            return true;
          } else {
            throw new ErrorWithStatus({
              message: 'You have no permisson on this reply',
              status: HTTP_STATUS.FORBIDDEN
            });
          }
        }
      }
    },
    content: {
      isString: {
        errorMessage: 'Content must be a string'
      },
      isLength: {
        options: {
          min: 1,
          max: 1000
        },
        errorMessage: 'Content must be between 1 and 1000 characters'
      }
    },
    medias: {
      optional: true,
      isArray: true,
      custom: {
        options: (value) => {
          if (value.some((item: any) => typeof item !== 'string')) {
            throw new Error('Medias must be an array of string');
          }
          return true;
        }
      }
    }
  })
);
