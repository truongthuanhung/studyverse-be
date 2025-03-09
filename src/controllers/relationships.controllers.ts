import { Request, Response } from 'express';
import { ParamsDictionary } from 'express-serve-static-core';
import { RELATIONSHIP_MESSAGES } from '~/constants/messages';
import { FollowRequestBody, TokenPayload, UnfollowRequestBody } from '~/models/requests/User.requests';
import relationshipsService from '~/services/relationships.services';

export const getFriendsController = async (req: Request, res: Response) => {
  const { user_id } = req.decoded_authorization as TokenPayload;

  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 10;

  const result = await relationshipsService.getFriends({
    user_id,
    page,
    limit
  });

  return res.json({
    message: RELATIONSHIP_MESSAGES.GET_FRIENDS_SUCCESS,
    result
  });
};

export const getFollowersController = async (req: Request, res: Response) => {
  const { user_id } = req.decoded_authorization as TokenPayload;

  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 10;

  const result = await relationshipsService.getFollowers({
    user_id,
    page,
    limit
  });

  return res.json({
    message: RELATIONSHIP_MESSAGES.GET_FOLLOWERS_SUCCESS,
    result
  });
};

export const getFollowingsController = async (req: Request, res: Response) => {
  const { user_id } = req.decoded_authorization as TokenPayload;

  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 10;

  const result = await relationshipsService.getFollowings({
    user_id,
    page,
    limit
  });

  return res.json({
    message: RELATIONSHIP_MESSAGES.GET_FOLLOWINGS_SUCCESS,
    result
  });
};

export const followUserController = async (req: Request<ParamsDictionary, any, FollowRequestBody>, res: Response) => {
  const { followed_user_id } = req.body;
  const { user_id } = req.decoded_authorization as TokenPayload;
  const result = await relationshipsService.follow(user_id, followed_user_id);
  return res.json(result);
};

export const unfollowUserController = async (
  req: Request<ParamsDictionary, any, UnfollowRequestBody>,
  res: Response
) => {
  const { unfollowed_user_id } = req.body;
  const { user_id } = req.decoded_authorization as TokenPayload;
  const result = await relationshipsService.unfollow(user_id, unfollowed_user_id);
  return res.json(result);
};
