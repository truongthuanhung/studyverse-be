import { Request, Response } from 'express';
import { ParamsDictionary } from 'express-serve-static-core';
import { QuestionStatus } from '~/constants/enums';
import HTTP_STATUS from '~/constants/httpStatus';
import QUESTION_MESSAGES from '~/constants/questionMessages';
import { ErrorWithStatus } from '~/models/Errors';
import { CreateQuestionRequestBody, EditQuestionRequestBody } from '~/models/requests/Question.requests';
import { TokenPayload } from '~/models/requests/User.requests';
import StudyGroupMember from '~/models/schemas/StudyGroupMember.schema';
import questionsService from '~/services/questions.services';

export const createQuestionController = async (
  req: Request<ParamsDictionary, any, CreateQuestionRequestBody>,
  res: Response
) => {
  const { user_id } = req.decoded_authorization as TokenPayload;
  const { group_id } = req.params;
  const { role } = req.member as StudyGroupMember;
  const result = await questionsService.createQuestion({ user_id, group_id, question: req.body, role });
  return res.status(HTTP_STATUS.CREATED).json({
    message: QUESTION_MESSAGES.CREATE_SUCCESS,
    result
  });
};

export const editQuestionController = async (
  req: Request<ParamsDictionary, any, EditQuestionRequestBody>,
  res: Response
) => {
  const { question_id } = req.params;
  const result = await questionsService.editQuestion(question_id, req.body);
  return res.json({
    message: QUESTION_MESSAGES.EDIT_SUCCESS,
    result
  });
};

export const deleteQuestionController = async (req: Request, res: Response) => {
  const { question_id } = req.params;
  const result = await questionsService.deleteQuestion(question_id);
  return res.json({
    message: QUESTION_MESSAGES.DELETE_SUCCESS,
    result
  });
};

export const approveQuestionController = async (req: Request, res: Response) => {
  const { question_id } = req.params;
  const result = await questionsService.approveQuestion(question_id);
  return res.json({
    message: QUESTION_MESSAGES.APPROVE_SUCCESS,
    result
  });
};

export const rejectQuestionController = async (req: Request, res: Response) => {
  const { question_id } = req.params;
  const result = await questionsService.rejectQuestion(question_id);
  return res.json({
    message: QUESTION_MESSAGES.REJECT_SUCCESS,
    result
  });
};

export const getQuestionByIdController = async (req: Request, res: Response) => {
  const { question_id } = req.params;
  const { user_id } = req.decoded_authorization as TokenPayload;
  const result = await questionsService.getQuestionById(question_id, user_id);
  return res.json({
    message: 'Get question successfully',
    result
  });
};

export const getQuestionsByGroupIdController = async (req: Request, res: Response) => {
  const { group_id } = req.params;
  const { page = '1', limit = '10', sortBy = 'newest', status = '0' } = req.query;

  const pageNumber = parseInt(page as string, 10);
  const limitNumber = parseInt(limit as string, 10);
  const statusNumber = parseInt(status as string, 10);

  // Validate status is within enum range
  if (statusNumber < 0 || statusNumber >= Object.keys(QuestionStatus).length / 2) {
    throw new ErrorWithStatus({
      message: 'Invalid status',
      status: HTTP_STATUS.BAD_REQUEST
    });
  }

  const validSortOptions = ['newest', 'oldest'];
  const validatedSortBy = validSortOptions.includes(sortBy as string) ? (sortBy as 'newest' | 'oldest') : 'newest';

  const { user_id } = req.decoded_authorization as TokenPayload;

  const result = await questionsService.getQuestionsByGroupId({
    group_id,
    user_id,
    page: pageNumber,
    limit: limitNumber,
    sortBy: validatedSortBy,
    status: statusNumber
  });

  return res.status(HTTP_STATUS.OK).json({
    message: 'Questions retrieved successfully',
    result
  });
};

export const getPendingQuestionsCountController = async (req: Request, res: Response) => {
  const { group_id } = req.params;
  const result = await questionsService.getPendingQuestionsCount(group_id);
  return res.json({
    message: 'Get pending questions count successfully',
    result
  });
};
