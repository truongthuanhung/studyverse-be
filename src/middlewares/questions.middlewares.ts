import { checkSchema } from 'express-validator';
import { GroupTargetType, VoteType } from '~/constants/enums';
import { numberEnumToArray } from '~/utils/common';
import { validate } from '~/utils/validation';

export const getQuestionsValidator = validate(
  checkSchema(
    {
      page: {
        optional: true,
        isInt: {
          errorMessage: 'Page must be an integer',
          options: { min: 1 }
        },
        toInt: true
      },
      limit: {
        optional: true,
        isInt: {
          errorMessage: 'Limit must be an integer',
          options: { min: 1, max: 100 }
        },
        toInt: true
      },
      sortBy: {
        optional: true,
        isIn: {
          options: [['newest', 'oldest']],
          errorMessage: 'sortBy must be either "newest" or "oldest"'
        }
      }
    },
    ['query']
  )
);

export const voteQuestionValidator = validate(
  checkSchema(
    {
      type: {
        isIn: {
          options: [[VoteType.Upvote, VoteType.Downvote]],
          errorMessage: 'Type must be Upvote or Downvote'
        }
      }
    },
    ['body']
  )
);
