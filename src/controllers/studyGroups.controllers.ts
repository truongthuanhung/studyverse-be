import { Request, Response } from 'express';
import { ParamsDictionary } from 'express-serve-static-core';
import HTTP_STATUS from '~/constants/httpStatus';
import { STUDY_GROUP_MESSAGES } from '~/constants/messages';
import { CreateStudyGroupRequestBody, EditStudyGroupRequestBody } from '~/models/requests/StudyGroup.requests';
import { TokenPayload } from '~/models/requests/User.requests';
import studyGroupsService from '~/services/studyGroups.services';

export const createStudyGroupController = async (
  req: Request<ParamsDictionary, any, CreateStudyGroupRequestBody>,
  res: Response
) => {
  const { user_id } = req.decoded_authorization as TokenPayload;
  const payload = req.body;
  const result = await studyGroupsService.createStudyGroup(user_id, payload);
  return res.status(HTTP_STATUS.CREATED).json({
    message: STUDY_GROUP_MESSAGES.GROUP_CREATED,
    result
  });
};

export const getStudyGroupsController = async (req: Request, res: Response) => {
  const { user_id } = req.decoded_authorization as TokenPayload;
  const { type, page = '1', limit = '10' } = req.query;

  // Convert string query parameters to numbers
  const pageNumber = parseInt(page as string, 10);
  const limitNumber = parseInt(limit as string, 10);

  const result = await studyGroupsService.getStudyGroups({
    user_id,
    type: (type as string) || 'all',
    page: pageNumber,
    limit: limitNumber
  });

  return res.json({
    message: STUDY_GROUP_MESSAGES.GROUP_RETRIEVED,
    result: result
  });
};

export const getStudyGroupByIdController = async (req: Request, res: Response) => {
  const { user_id } = req.decoded_authorization as TokenPayload;
  const { group_id } = req.params;

  const result = await studyGroupsService.getStudyGroupById(user_id, group_id);
  return res.json({
    message: STUDY_GROUP_MESSAGES.GROUP_CREATED,
    result
  });
};

export const editStudyGroupController = async (req: Request, res: Response) => {
  const { group_id } = req.params;
  const payload = req.body as EditStudyGroupRequestBody;
  const result = await studyGroupsService.editStudyGroup(group_id, payload);
  return res.json({
    message: STUDY_GROUP_MESSAGES.GROUP_UPDATED,
    result
  });
};

export const getUserRoleInGroupController = async (req: Request, res: Response) => {
  const { group_id } = req.params;
  const { user_id } = req.decoded_authorization as TokenPayload;

  const role = await studyGroupsService.getUserRoleInGroup(user_id, group_id);

  const userRole = role ?? 'guest';

  return res.json({
    group_id,
    role: userRole
  });
};

export const requestToJoinGroupController = async (req: Request, res: Response) => {
  const { user_id } = req.decoded_authorization as TokenPayload;
  const { group_id } = req.params;
  const result = await studyGroupsService.requestToJoinGroup(user_id, group_id);
  return res.json({
    message: STUDY_GROUP_MESSAGES.JOIN_REQUEST_SENT,
    result
  });
};

export const cancelJoinRequestController = async (req: Request, res: Response) => {
  const { user_id } = req.decoded_authorization as TokenPayload;
  const { group_id } = req.params;
  const result = await studyGroupsService.cancelJoinRequest(user_id, group_id);
  return res.json({
    message: STUDY_GROUP_MESSAGES.JOIN_REQUEST_CANCELED,
    result
  });
};

export const acceptJoinRequestController = async (req: Request, res: Response) => {
  const { user_id } = req.decoded_authorization as TokenPayload;
  const { join_request_id } = req.params;
  const result = await studyGroupsService.acceptJoinRequest(user_id, join_request_id);
  return res.json({
    message: STUDY_GROUP_MESSAGES.JOIN_REQUEST_APPROVED,
    result
  });
};

export const declineJoinRequestController = async (req: Request, res: Response) => {
  const { user_id } = req.decoded_authorization as TokenPayload;
  const { join_request_id } = req.params;
  const result = await studyGroupsService.declineJoinRequest(user_id, join_request_id);
  return res.json({
    message: STUDY_GROUP_MESSAGES.JOIN_REQUEST_DECLINED,
    result
  });
};

export const getJoinRequestsController = async (req: Request, res: Response) => {
  const { group_id } = req.params;
  const result = await studyGroupsService.getJoinRequests(group_id);
  return res.json({
    message: STUDY_GROUP_MESSAGES.JOIN_REQUEST_RETRIEVED,
    result
  });
};

export const getJoinRequestsCountController = async (req: Request, res: Response) => {
  const { group_id } = req.params;
  const result = await studyGroupsService.getJoinRequestsCount(group_id);
  return res.json({
    message: STUDY_GROUP_MESSAGES.JOIN_REQUEST_COUNT_RETRIEVED,
    result
  });
};

export const getMembersController = async (req: Request, res: Response) => {
  const { group_id } = req.params;
  const { role } = req.query;

  const roleEnum = role !== undefined ? Number(role) : undefined;
  const result = await studyGroupsService.getMembers(group_id, roleEnum);
  return res.json({
    message: STUDY_GROUP_MESSAGES.MEMBERS_RETRIEVED,
    result
  });
};

export const promoteMemberController = async (req: Request, res: Response) => {
  const { group_id, user_id } = req.params;
  const current_user_id = req.decoded_authorization?.user_id as string;
  const result = await studyGroupsService.promoteMember({ group_id, user_id, current_user_id });
  return res.json({
    message: STUDY_GROUP_MESSAGES.MEMBER_PROMOTED,
    result
  });
};

export const demoteMemberController = async (req: Request, res: Response) => {
  const { group_id, user_id } = req.params;
  const current_user_id = req.decoded_authorization?.user_id as string;
  const result = await studyGroupsService.demoteMember({ group_id, user_id, current_user_id });
  return res.json({
    message: STUDY_GROUP_MESSAGES.MEMBER_DEMOTED,
    result
  });
};

export const removeMemberController = async (req: Request, res: Response) => {
  const { group_id, user_id } = req.params;
  const current_user_id = req.decoded_authorization?.user_id as string;
  const result = await studyGroupsService.removeMember({ group_id, user_id, current_user_id });
  return res.json({
    message: STUDY_GROUP_MESSAGES.MEMBERS_RETRIEVED,
    result
  });
};

export const getGroupUserStatsController = async (req: Request, res: Response) => {
  const { group_id, user_id } = req.params;
  const current_user_id = req.decoded_authorization?.user_id as string;
  const result = await studyGroupsService.getUserStats({ group_id, user_id, current_user_id });
  return res.json({
    message: STUDY_GROUP_MESSAGES.MEMBER_STATS_RETRIEVED,
    result
  });
};
