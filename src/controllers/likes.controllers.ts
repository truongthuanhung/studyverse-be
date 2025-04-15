import { Request, Response } from 'express';
import HTTP_STATUS from '~/constants/httpStatus';
import { TokenPayload } from '~/models/requests/User.requests';
import likeService from '~/services/likes.services';
import { ParamsDictionary } from 'express-serve-static-core';
import { LikeRequestBody } from '~/models/requests/Like.requests';

export const likeController = async (req: Request<ParamsDictionary, any, LikeRequestBody>, res: Response) => {
  const { user_id } = req.decoded_authorization as TokenPayload;
  const result = await likeService.like(user_id, req.body);
  return res.status(HTTP_STATUS.CREATED).json({
    message: 'Like successfully',
    result
  });
};

export const unlikeController = async (req: Request, res: Response) => {
  const { user_id } = req.decoded_authorization as TokenPayload;
  const result = await likeService.unlike(user_id, req.params.target_id);
  return res.json({
    message: 'Unlike successfully',
    result
  });
};

export const getLikesByPostIdController = async (req: Request, res: Response) => {
  const { page = 1, limit = 20 } = req.query;

  const pageNumber = parseInt(page as string, 10);
  const limitNumber = parseInt(limit as string, 10);

  const result = await likeService.getLikesByPostId(req.params.post_id, pageNumber, limitNumber);
  return res.json(result);
};

export const getLikesByCommentIdController = async (req: Request, res: Response) => {
  const { page = 1, limit = 20 } = req.query;

  const pageNumber = parseInt(page as string, 10);
  const limitNumber = parseInt(limit as string, 10);

  const result = await likeService.getLikesByCommentId(req.params.comment_id, pageNumber, limitNumber);

  return res.json(result);
};
