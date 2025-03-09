import { Router } from 'express';
import { recommendStudyGroupsController } from '~/controllers/recommendations.controllers';
import { accessTokenValidator } from '~/middlewares/users.middlewares';
import { wrapRequestHandler } from '~/utils/handlers';

const recommendationsRouter = Router();

recommendationsRouter.get('/study-groups', accessTokenValidator, wrapRequestHandler(recommendStudyGroupsController));
export default recommendationsRouter;
