import { Request, Response, Router } from 'express';
import {
  acceptJoinRequestController,
  createStudyGroupController,
  declineJoinRequestController,
  getJoinRequestsController,
  getStudyGroupByIdController,
  getStudyGroupsController,
  getUserRoleInGroupController,
  requestToJoinGroupController
} from '~/controllers/studyGroups.controllers';
import { filterMiddleware } from '~/middlewares/common.middlewares';
import {
  createStudyGroupValidator,
  getStudyGroupsValidator,
  groupAdminValidator,
  groupValidator,
  joinRequestValidator
} from '~/middlewares/studyGroups.middlewares';
import { accessTokenValidator, teacherValidator } from '~/middlewares/users.middlewares';
import { wrapRequestHandler } from '~/utils/handlers';

const studyGroupRouter = Router();

studyGroupRouter.get('/', accessTokenValidator, getStudyGroupsValidator, wrapRequestHandler(getStudyGroupsController));

studyGroupRouter.get('/:study_group_id', accessTokenValidator, wrapRequestHandler(getStudyGroupByIdController));

studyGroupRouter.post(
  '/',
  accessTokenValidator,
  teacherValidator,
  filterMiddleware(['name', 'privacy', 'description', 'cover_photo']),
  createStudyGroupValidator,
  wrapRequestHandler(createStudyGroupController)
);

studyGroupRouter.get(
  '/:group_id/role',
  accessTokenValidator,
  groupValidator,
  wrapRequestHandler(getUserRoleInGroupController)
);

studyGroupRouter.post(
  '/:group_id/join',
  accessTokenValidator,
  groupValidator,
  wrapRequestHandler(requestToJoinGroupController)
);

studyGroupRouter.post(
  '/join-requests/:join_request_id/accept',
  accessTokenValidator,
  joinRequestValidator,
  wrapRequestHandler(acceptJoinRequestController)
);

studyGroupRouter.post(
  '/join-requests/:join_request_id/decline',
  accessTokenValidator,
  joinRequestValidator,
  wrapRequestHandler(declineJoinRequestController)
);

studyGroupRouter.get(
  '/:group_id/join-requests',
  accessTokenValidator,
  groupValidator,
  groupAdminValidator,
  wrapRequestHandler(getJoinRequestsController)
);
export default studyGroupRouter;
