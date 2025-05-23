import { NextFunction, Request, Response } from 'express';
import { checkSchema } from 'express-validator';
import { ObjectId } from 'mongodb';
import { GroupTargetType, QuestionStatus, VoteType } from '~/constants/enums';
import HTTP_STATUS from '~/constants/httpStatus';
import { QUESTION_MESSAGES } from '~/constants/messages';
import { ErrorWithStatus } from '~/models/Errors';
import { numberEnumToArray } from '~/utils/common';
import { validate } from '~/utils/validation';

const questionStatus = numberEnumToArray(QuestionStatus);

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
      },
      tag_id: {
        optional: true,
        isMongoId: {
          errorMessage: 'tag_id must be a valid mongoId'
        }
      },
      status: {
        isIn: {
          options: [questionStatus],
          errorMessage: 'Invalid question status'
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

export const approveQuestionValidator = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (req.question?.status !== QuestionStatus.Pending) {
      throw new ErrorWithStatus({
        message: QUESTION_MESSAGES.ALREADY_APPROVED,
        status: HTTP_STATUS.BAD_REQUEST
      });
    }
    next();
  } catch (err) {
    next(err);
  }
};

export const rejectQuestionValidator = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (req.question?.status !== QuestionStatus.Pending) {
      throw new ErrorWithStatus({
        message: QUESTION_MESSAGES.INVALID_REJECTED,
        status: HTTP_STATUS.BAD_REQUEST
      });
    }
    next();
  } catch (err) {
    next(err);
  }
};
