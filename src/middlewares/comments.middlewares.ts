import { checkSchema } from 'express-validator';
import { ObjectId } from 'mongodb';
import HTTP_STATUS from '~/constants/httpStatus';
import { ErrorWithStatus } from '~/models/Errors';
import commentsService from '~/services/comments.services';
import databaseService from '~/services/database.services';
import { validate } from '~/utils/validation';

export const createCommentValidator = validate(
  checkSchema(
    {
      content: {
        isString: {
          errorMessage: 'Content must be a string'
        },
        trim: true,
        isLength: {
          options: {
            min: 1,
            max: 1000
          },
          errorMessage: 'Content must be between 1 and 1000 characters'
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
            const comment = await databaseService.comments.findOne({
              _id: new ObjectId(value)
            });
            if (!comment || comment.post_id.toString() !== req.body.post_id || comment.parent_id !== null) {
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

export const updateCommentValidator = validate(
  checkSchema({
    content: {
      isString: {
        errorMessage: 'Content must be a string'
      },
      trim: true,
      isLength: {
        options: {
          min: 1,
          max: 1000
        },
        errorMessage: 'Content must be between 1 and 1000 characters'
      }
    }
  })
);

export const getCommentsValidator = validate(
  checkSchema(
    {
      page: {
        optional: true,
        isInt: {
          errorMessage: 'Page must be an integer',
          options: {
            min: 1
          }
        },
        toInt: true
      },
      limit: {
        optional: true,
        isInt: {
          errorMessage: 'Limit must be an integer',
          options: {
            min: 1,
            max: 100 // Preventing excessive page sizes
          }
        },
        toInt: true
      },
      post_id: {
        custom: {
          options: async (value: string) => {
            if (!ObjectId.isValid(value)) {
              throw new ErrorWithStatus({
                message: 'Invalid post id',
                status: HTTP_STATUS.BAD_REQUEST
              });
            }
            const post = await databaseService.posts.findOne({
              _id: new ObjectId(value)
            });
            if (!post) {
              throw new ErrorWithStatus({
                message: 'Post not found',
                status: HTTP_STATUS.NOT_FOUND
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

export const commentIdValidator = validate(
  checkSchema(
    {
      comment_id: {
        isMongoId: {
          errorMessage: 'Invalid post id'
        },
        custom: {
          options: async (value: string) => {
            await commentsService.checkCommentExists(value);
            return true;
          }
        }
      }
    },
    ['params']
  )
);
