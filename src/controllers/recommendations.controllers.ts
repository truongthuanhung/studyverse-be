import { Request, Response } from 'express';
import { TokenPayload } from '~/models/requests/User.requests';
import recommendationsService from '~/services/recommendations.services';
import userSuggestionsService from '~/services/users_suggestions.services';

export const recommendStudyGroupsController = async (req: Request, res: Response) => {
  const { user_id } = req.decoded_authorization as TokenPayload;
  const { page = '1', limit = '10' } = req.query;

  const pageNumber = parseInt(page as string, 10);
  const limitNumber = parseInt(limit as string, 10);
  const result = await recommendationsService.recommendStudyGroups(user_id, pageNumber, limitNumber);
  return res.json({
    message: 'Recommend group successfully',
    result
  });
};

export const getRecommendedUsersByGroupController = async (req: Request, res: Response) => {
  const { user_id } = req.decoded_authorization as TokenPayload;
  const { page = '1', limit = '10' } = req.query;

  const pageNumber = parseInt(page as string, 10);
  const limitNumber = parseInt(limit as string, 10);

  const result = await userSuggestionsService.getRecommendedUsersByGroup({
    user_id,
    page: pageNumber,
    limit: limitNumber
  });

  return res.json({
    message: 'Get recommended users by group successfully',
    result
  });
};

export const getRecommendedUsersWithMutualConnectionsController = async (req: Request, res: Response) => {
  const { user_id } = req.decoded_authorization as TokenPayload;

  const { page = '1', limit = '10' } = req.query;
  const pageNumber = parseInt(page as string, 10);
  const limitNumber = parseInt(limit as string, 10);

  const result = await userSuggestionsService.getRecommendedUsersWithMutualConnections({
    user_id,
    page: pageNumber,
    limit: limitNumber
  });

  return res.json({
    message: 'Get recommended users with mutual connections successfully',
    result
  });
};
