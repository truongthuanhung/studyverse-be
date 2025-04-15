import { Request, Response } from 'express';
import { ParamsDictionary } from 'express-serve-static-core';
import { LikeType } from '~/constants/enums';
import HTTP_STATUS from '~/constants/httpStatus';
import { CreateCommentRequestBody, UpdateCommentRequestBody } from '~/models/requests/Comment.requests';
import { TokenPayload } from '~/models/requests/User.requests';
import commentsService from '~/services/comments.services';
import likeService from '~/services/likes.services';

export const createCommentController = async (
  req: Request<ParamsDictionary, any, CreateCommentRequestBody>,
  res: Response
) => {
  const { user_id } = req.decoded_authorization as TokenPayload;
  const { post_id } = req.params;
  const { body } = req;

  const result = await commentsService.commentOnPost({ user_id, post_id, body });
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
  const { user_id } = req.decoded_authorization as TokenPayload;
  const { page = '1', limit = '10' } = req.query;

  // Convert string parameters to numbers and handle validation
  const pageNumber = parseInt(page as string);
  const limitNumber = parseInt(limit as string);

  const result = await commentsService.getCommentsByPostId({
    post_id,
    user_id,
    page: pageNumber,
    limit: limitNumber
  });

  return res.status(HTTP_STATUS.OK).json({
    message: 'Comments retrieved successfully',
    result
  });
};

export const likeCommentController = async (req: Request, res: Response) => {
  const { comment_id } = req.params;
  const { user_id } = req.decoded_authorization as TokenPayload;
  const result = await likeService.like(user_id, { type: LikeType.CommentLike, target_id: comment_id });
  return res.json({
    message: 'Like comment successfully',
    result
  });
};

export const unlikeCommentController = async (req: Request, res: Response) => {
  const { comment_id } = req.params;
  const { user_id } = req.decoded_authorization as TokenPayload;
  const result = await likeService.unlike(user_id, comment_id);
  return res.json({
    message: 'Unlike comment successfully',
    result
  });
};

export const getChildCommentsController = async (req: Request, res: Response) => {
  const { comment_id } = req.params;
  const { page = '1', limit = '10' } = req.query;

  const { user_id } = req.decoded_authorization as TokenPayload;

  const pageNumber = parseInt(page as string);
  const limitNumber = parseInt(limit as string);

  const result = await commentsService.getChildComments({
    user_id,
    comment_id,
    page: pageNumber,
    limit: limitNumber
  });

  return res.json({
    message: 'Get child comments successfully',
    result
  });
};
