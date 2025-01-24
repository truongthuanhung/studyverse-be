import { checkSchema } from 'express-validator';
import { LikeType } from '~/constants/enums';
import commentsService from '~/services/comments.services';
import postsService from '~/services/posts.services';
import { numberEnumToArray } from '~/utils/common';
import { validate } from '~/utils/validation';

const likeTypes = numberEnumToArray(LikeType);

export const likeValidator = validate(
  checkSchema(
    {
      type: {
        isIn: {
          options: [likeTypes],
          errorMessage: 'Invalid like type'
        }
      },
      target_id: {
        isMongoId: {
          errorMessage: 'Invalid target id'
        },
        custom: {
          options: async (value: string, { req }) => {
            if (req.body.type === LikeType.PostLike) {
              await postsService.checkPostExists(value);
            } else if (req.body.type === LikeType.CommentLike) {
              await commentsService.checkCommentExists(value);
            }
            return true;
          }
        }
      }
    },
    ['body']
  )
);

export const unlikeValidator = validate(
  checkSchema(
    {
      target_id: {
        isMongoId: {
          errorMessage: 'Invalid target id'
        }
      }
    },
    ['params']
  )
);
