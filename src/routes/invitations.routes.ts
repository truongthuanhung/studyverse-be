import { Router } from 'express';
import {
  approveInvitationController,
  declineInvitationController,
  getInvitationByIdController,
  getInvitationsController
} from '~/controllers/studyGroupInvitations.controllers';
import { invitationIdValidator } from '~/middlewares/studyGroupInvitations.middlewares';
import { accessTokenValidator } from '~/middlewares/users.middlewares';
import { wrapRequestHandler } from '~/utils/handlers';

const invitationsRouter = Router();

invitationsRouter.post(
  '/:invitation_id/approve',
  accessTokenValidator,
  invitationIdValidator,
  wrapRequestHandler(approveInvitationController)
);

invitationsRouter.post(
  '/:invitation_id/decline',
  accessTokenValidator,
  invitationIdValidator,
  wrapRequestHandler(declineInvitationController)
);

invitationsRouter.get('/', accessTokenValidator, wrapRequestHandler(getInvitationsController));

invitationsRouter.get(
  '/:invitation_id',
  accessTokenValidator,
  invitationIdValidator,
  wrapRequestHandler(getInvitationByIdController)
);

export default invitationsRouter;
