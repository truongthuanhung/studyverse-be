import { NextFunction, Request, Response } from 'express';
import { ParamsDictionary } from 'express-serve-static-core';
import HTTP_STATUS from '~/constants/httpStatus';
import { CreatePostRequestBody, SharePostRequestBody } from '~/models/requests/Post.requests';
import { TokenPayload } from '~/models/requests/User.requests';
import postsService from '~/services/posts.services';

export const createPostController = async (
  req: Request<ParamsDictionary, any, CreatePostRequestBody>,
  res: Response
) => {
  const { user_id } = req.decoded_authorization as TokenPayload;
  const result = await postsService.createPost(user_id, req.body);
  return res.status(HTTP_STATUS.CREATED).json({
    message: 'Create post successfully',
    result
  });
};

export const getPostByIdController = async (req: Request, res: Response, next: NextFunction) => {
  const { post_id } = req.params;
  const { user_id } = req.decoded_authorization as TokenPayload;
  const result = await postsService.getPostById(user_id, post_id);
  return res.json({
    message: 'Get post successfully',
    result
  });
};

export const sharePostController = async (req: Request<ParamsDictionary, any, SharePostRequestBody>, res: Response) => {
  const { user_id } = req.decoded_authorization as TokenPayload;
  const result = await postsService.sharePost(user_id, req.body);
  return res.status(HTTP_STATUS.CREATED).json({
    message: 'Share post successfully',
    result
  });
};

export const getMyPostsController = async (req: Request, res: Response) => {
  const { user_id } = req.decoded_authorization as TokenPayload;
  const { page = 1, limit = 10 } = req.query;

  const pageNumber = parseInt(page as string, 10);
  const limitNumber = parseInt(limit as string, 10);

  const result = await postsService.getMyPosts({
    user_id,
    limit: limitNumber,
    page: pageNumber
  });

  return res.json({
    message: 'Get my posts successfully',
    result
  });
};

export const getPostsByUserIdController = async (req: Request, res: Response) => {
  const { user_id } = req.params;
  const viewer_id = (req.decoded_authorization as TokenPayload).user_id;
  const { page = 1, limit = 10 } = req.query;

  const pageNumber = parseInt(page as string, 10);
  const limitNumber = parseInt(limit as string, 10);

  const result = await postsService.getPostsByUserId({
    viewer_id,
    user_id,
    limit: limitNumber,
    page: pageNumber
  });

  return res.json({
    message: 'Get posts successfully',
    result
  });
};

export const getNewsFeedController = async (req: Request, res: Response) => {
  const { user_id } = req.decoded_authorization as TokenPayload;
  const limit = Number(req.query.limit) || 10;
  const page = Number(req.query.page) || 1;

  const result = await postsService.getNewFeeds({ user_id, limit, page });
  return res.json({
    message: 'Get news feed successfully',
    result
  });
};
