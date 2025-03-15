import { Router } from 'express';
import { getFriendsToInviteController, inviteFriendsController } from '~/controllers/studyGroupInvitations.controllers';
import {
  acceptJoinRequestController,
  cancelJoinRequestController,
  createStudyGroupController,
  declineJoinRequestController,
  demoteMemberController,
  editStudyGroupController,
  getGroupUserStatsController,
  getJoinRequestsController,
  getJoinRequestsCountController,
  getMembersController,
  getStudyGroupByIdController,
  getStudyGroupsController,
  getUserRoleInGroupController,
  promoteMemberController,
  removeMemberController,
  requestToJoinGroupController
} from '~/controllers/studyGroups.controllers';
import { getTagInGroupController, searchTagsByGroupController } from '~/controllers/tags.controllers';
import { filterMiddleware } from '~/middlewares/common.middlewares';
import {
  adminValidator,
  createStudyGroupValidator,
  getMembersValidator,
  getStudyGroupsValidator,
  groupAdminValidator,
  groupIdValidator,
  inviteFriendsValidator,
  joinRequestValidator,
  validateGroupMembership
} from '~/middlewares/studyGroups.middlewares';
import { accessTokenValidator, teacherValidator } from '~/middlewares/users.middlewares';
import { wrapRequestHandler } from '~/utils/handlers';

const studyGroupRouter = Router();

studyGroupRouter.get('/', accessTokenValidator, getStudyGroupsValidator, wrapRequestHandler(getStudyGroupsController));

studyGroupRouter.get(
  '/:group_id/users/:user_id/stats',
  accessTokenValidator,
  wrapRequestHandler(getGroupUserStatsController)
);

studyGroupRouter.get(
  '/:group_id/tags',
  accessTokenValidator,
  validateGroupMembership,
  wrapRequestHandler(searchTagsByGroupController)
);

studyGroupRouter.get(
  '/:group_id/tags/:tag_id',
  accessTokenValidator,
  validateGroupMembership,
  wrapRequestHandler(getTagInGroupController)
);

studyGroupRouter.get(
  '/:group_id',
  accessTokenValidator,
  groupIdValidator,
  wrapRequestHandler(getStudyGroupByIdController)
);

studyGroupRouter.patch(
  '/:group_id/members/:user_id/promote',
  accessTokenValidator,
  groupIdValidator,
  groupAdminValidator,
  wrapRequestHandler(promoteMemberController)
);

studyGroupRouter.patch(
  '/:group_id/members/:user_id/demote',
  accessTokenValidator,
  groupIdValidator,
  groupAdminValidator,
  wrapRequestHandler(demoteMemberController)
);

studyGroupRouter.delete(
  '/:group_id/members/:user_id/remove',
  accessTokenValidator,
  groupIdValidator,
  groupAdminValidator,
  wrapRequestHandler(removeMemberController)
);

studyGroupRouter.patch(
  '/:group_id',
  accessTokenValidator,
  groupIdValidator,
  groupAdminValidator,
  filterMiddleware(['name', 'privacy', 'description', 'cover_photo']),
  wrapRequestHandler(editStudyGroupController)
);

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
  groupIdValidator,
  wrapRequestHandler(getUserRoleInGroupController)
);

studyGroupRouter.post(
  '/:group_id/join',
  accessTokenValidator,
  groupIdValidator,
  wrapRequestHandler(requestToJoinGroupController)
);

studyGroupRouter.post(
  '/:group_id/join/cancel',
  accessTokenValidator,
  groupIdValidator,
  wrapRequestHandler(cancelJoinRequestController)
);

studyGroupRouter.post(
  '/:group_id/join-requests/:join_request_id/accept',
  accessTokenValidator,
  validateGroupMembership,
  adminValidator,
  joinRequestValidator,
  wrapRequestHandler(acceptJoinRequestController)
);

studyGroupRouter.post(
  '/:group_id/join-requests/:join_request_id/decline',
  accessTokenValidator,
  validateGroupMembership,
  adminValidator,
  joinRequestValidator,
  wrapRequestHandler(declineJoinRequestController)
);

studyGroupRouter.get(
  '/:group_id/invite-friends',
  accessTokenValidator,
  validateGroupMembership,
  adminValidator,
  wrapRequestHandler(getFriendsToInviteController)
);

studyGroupRouter.post(
  '/:group_id/invite-friends',
  accessTokenValidator,
  validateGroupMembership,
  adminValidator,
  inviteFriendsValidator,
  wrapRequestHandler(inviteFriendsController)
);

studyGroupRouter.get(
  '/:group_id/join-requests-count',
  accessTokenValidator,
  groupIdValidator,
  groupAdminValidator,
  wrapRequestHandler(getJoinRequestsCountController)
);

studyGroupRouter.get(
  '/:group_id/join-requests',
  accessTokenValidator,
  groupIdValidator,
  groupAdminValidator,
  wrapRequestHandler(getJoinRequestsController)
);

studyGroupRouter.get(
  '/:group_id/members',
  accessTokenValidator,
  groupIdValidator,
  getMembersValidator,
  wrapRequestHandler(getMembersController)
);

export default studyGroupRouter;
