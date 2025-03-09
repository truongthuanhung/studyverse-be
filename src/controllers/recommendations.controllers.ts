import { Request, Response } from 'express';
import { TokenPayload } from '~/models/requests/User.requests';
import recommendationsService from '~/services/recommendations.services';

export const recommendStudyGroupsController = async (req: Request, res: Response) => {
  const { user_id } = req.decoded_authorization as TokenPayload;
  const result = await recommendationsService.recommendStudyGroups(user_id);
  return res.json({
    message: 'Recommend group successfully',
    result
  });
};
