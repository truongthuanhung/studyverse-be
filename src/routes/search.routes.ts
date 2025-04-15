import { Router } from 'express';
import {
  deleteAllSearchHistoryController,
  deleteSearchHistoryController,
  getSearchHistoryController,
  groupSearchController,
  searchController
} from '~/controllers/search.controllers';
import { groupSearchValidator } from '~/middlewares/search.middlewares';
import { validateGroupMembership } from '~/middlewares/studyGroups.middlewares';
import { accessTokenValidator } from '~/middlewares/users.middlewares';
import { wrapRequestHandler } from '~/utils/handlers';

const searchRouter = Router();

searchRouter.get('/', accessTokenValidator, wrapRequestHandler(searchController));

searchRouter.get('/history', accessTokenValidator, wrapRequestHandler(getSearchHistoryController));

searchRouter.get(
  '/study-groups/:group_id',
  accessTokenValidator,
  validateGroupMembership,
  groupSearchValidator,
  wrapRequestHandler(groupSearchController)
);

searchRouter.get(
  '/study-groups/:group_id/history',
  accessTokenValidator,
  validateGroupMembership,
  wrapRequestHandler(getSearchHistoryController)
);

searchRouter.delete(
  '/study-groups/:group_id/history',
  accessTokenValidator,
  validateGroupMembership,
  wrapRequestHandler(deleteAllSearchHistoryController)
);

searchRouter.delete('/history', accessTokenValidator, wrapRequestHandler(deleteAllSearchHistoryController));

searchRouter.delete(
  '/history/:search_history_id',
  accessTokenValidator,
  wrapRequestHandler(deleteSearchHistoryController)
);

searchRouter.delete(
  '/study-groups/:group_id/history/:search_history_id',
  accessTokenValidator,
  validateGroupMembership,
  wrapRequestHandler(deleteSearchHistoryController)
);

export default searchRouter;
