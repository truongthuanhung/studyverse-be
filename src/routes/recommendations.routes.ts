import { Router } from 'express';
import {
  getRecommendedUsersByGroupController,
  getRecommendedUsersWithMutualConnectionsController,
  recommendStudyGroupsController
} from '~/controllers/recommendations.controllers';
import { accessTokenValidator } from '~/middlewares/users.middlewares';
import { wrapRequestHandler } from '~/utils/handlers';

const recommendationsRouter = Router();

recommendationsRouter.get('/study-groups', accessTokenValidator, wrapRequestHandler(recommendStudyGroupsController));

recommendationsRouter.get(
  '/study-group-users',
  accessTokenValidator,
  wrapRequestHandler(getRecommendedUsersByGroupController)
);

recommendationsRouter.get(
  '/mutual-connections-users',
  accessTokenValidator,
  wrapRequestHandler(getRecommendedUsersWithMutualConnectionsController)
);

export default recommendationsRouter;
