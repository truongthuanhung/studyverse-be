import { Request, Response } from 'express';
import { RELATIONSHIP_MESSAGES } from '~/constants/relationshipMessages';
import { TokenPayload } from '~/models/requests/User.requests';
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
