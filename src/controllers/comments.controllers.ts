import { Request, Response } from 'express';
import { ParamsDictionary } from 'express-serve-static-core';
import HTTP_STATUS from '~/constants/httpStatus';
import { CreateCommentRequestBody, UpdateCommentRequestBody } from '~/models/requests/Comment.requests';
import { TokenPayload } from '~/models/requests/User.requests';
import commentsService from '~/services/comments.services';

export const createCommentController = async (
  req: Request<ParamsDictionary, any, CreateCommentRequestBody>,
  res: Response
) => {
  const { user_id } = req.decoded_authorization as TokenPayload;
  const result = await commentsService.commentOnPost(user_id, req.body);
  return res.status(HTTP_STATUS.CREATED).json({
    message: 'Comment created successfully',
    result
  });
};

export const updateCommentController = async (
  req: Request<ParamsDictionary, any, UpdateCommentRequestBody>,
  res: Response
) => {
  const { user_id } = req.decoded_authorization as TokenPayload;
  const { comment_id } = req.params;
  const result = await commentsService.updateComment(user_id, comment_id, req.body);
  return res.status(HTTP_STATUS.OK).json({
    message: 'Comment updated successfully',
    result
  });
};

export const deleteCommentController = async (req: Request, res: Response) => {
  const { user_id } = req.decoded_authorization as TokenPayload;
  const { comment_id } = req.params;
  const result = await commentsService.deleteComment(user_id, comment_id);
  return res.status(HTTP_STATUS.OK).json({
    message: 'Comment deleted successfully',
    result
  });
};

export const getCommentsByPostIdController = async (req: Request, res: Response) => {
  const { post_id } = req.params;
  const { page = '1', limit = '10' } = req.query;

  // Convert string parameters to numbers and handle validation
  const pageNumber = parseInt(page as string);
  const limitNumber = parseInt(limit as string);

  const result = await commentsService.getCommentsByPostId(post_id, pageNumber, limitNumber);

  return res.status(HTTP_STATUS.OK).json({
    message: 'Comments retrieved successfully',
    result
  });
};
