import { Request, Response } from 'express';
import { ParamsDictionary } from 'express-serve-static-core';
import HTTP_STATUS from '~/constants/httpStatus';
import { CreateQuestionRequestBody, EditQuestionRequestBody } from '~/models/requests/Question.requests';
import { TokenPayload } from '~/models/requests/User.requests';
import questionsService from '~/services/questions.services';

export const createQuestionController = async (
  req: Request<ParamsDictionary, any, CreateQuestionRequestBody>,
  res: Response
) => {
  const { user_id } = req.decoded_authorization as TokenPayload;
  const { group_id } = req.params;
  const result = await questionsService.createQuestion({ user_id, group_id, question: req.body });
  return res.status(HTTP_STATUS.CREATED).json({
    message: 'Create question successfully',
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
    message: 'Edit question successfully',
    result
  });
};

export const getQuestionByIdController = async (req: Request, res: Response) => {
  const { question_id } = req.params;
  const result = await questionsService.getQuestionById(question_id);
  return res.json({
    message: 'Get question successfully',
    result
  });
};

export const getQuestionsByGroupIdController = async (req: Request, res: Response) => {
  const { group_id } = req.params;
  const { page = '1', limit = '10', sortBy = 'newest' } = req.query;

  // Convert string parameters to numbers and handle validation
  const pageNumber = parseInt(page as string, 10);
  const limitNumber = parseInt(limit as string, 10);

  // Validate sortBy (chỉ chấp nhận 'newest' hoặc 'oldest')
  const validSortOptions = ['newest', 'oldest'];
  const sortOption = validSortOptions.includes(sortBy as string) ? (sortBy as 'newest' | 'oldest') : 'newest';

  const { user_id } = req.decoded_authorization as TokenPayload;
  const result = await questionsService.getQuestionsByGroupId(group_id, user_id, pageNumber, limitNumber, sortOption);

  return res.status(HTTP_STATUS.OK).json({
    message: 'Questions retrieved successfully',
    result
  });
};
