import { Request, Response } from 'express';
import { TokenPayload } from '~/models/requests/User.requests';
import studyGroupInvitationsService from '~/services/studyGroupInvitations.services';
import studyGroupsService from '~/services/studyGroups.services';

export const getFriendsToInviteController = async (req: Request, res: Response) => {
  const { user_id } = req.decoded_authorization as TokenPayload;
  const { group_id } = req.params;

  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;

  const result = await studyGroupInvitationsService.getFriendsToInvite(user_id, group_id, page, limit);

  return res.json({
    message: 'Get friends to invite successfully',
    result
  });
};

export const inviteFriendsController = async (req: Request, res: Response) => {
  const { group_id } = req.params;
  const { user_id } = req.decoded_authorization as TokenPayload;
  const { invited_user_ids } = req.body;
  const result = await studyGroupInvitationsService.inviteFriends({
    group_id,
    created_user_id: user_id,
    invited_user_ids
  });
  return res.json({
    message: 'Invitations have been sent successfully',
    result
  });
};

export const approveInvitationController = async (req: Request, res: Response) => {
  const { invitation_id } = req.params;
  const { user_id } = req.decoded_authorization as TokenPayload;
  const result = await studyGroupInvitationsService.approveInvitation(user_id, invitation_id);
  return res.json(result);
};

export const declineInvitationController = async (req: Request, res: Response) => {
  const { invitation_id } = req.params;
  const { user_id } = req.decoded_authorization as TokenPayload;
  const result = await studyGroupInvitationsService.declineInvitation(user_id, invitation_id);
  return res.json(result);
};

export const getInvitationsController = async (req: Request, res: Response) => {
  const { user_id } = req.decoded_authorization as TokenPayload;
  const { page = '1', limit = '10' } = req.query;

  const pageNumber = parseInt(page as string, 10);
  const limitNumber = parseInt(limit as string, 10);

  const result = await studyGroupInvitationsService.getInvitations({
    user_id,
    page: pageNumber,
    limit: limitNumber
  });

  return res.json({
    message: 'Invitations have been retrieved successfully',
    result
  });
};

export const getInvitationByIdController = async (req: Request, res: Response) => {
  const { user_id } = req.decoded_authorization as TokenPayload;
  const { invitation_id } = req.params;
  const result = await studyGroupInvitationsService.getInvitationById(user_id, invitation_id);
  return res.json({
    message: 'Invitation has been retrieved successfully',
    result
  });
};
