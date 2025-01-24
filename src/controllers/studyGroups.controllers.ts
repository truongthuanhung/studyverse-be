import { Request, Response } from 'express';
import { ParamsDictionary } from 'express-serve-static-core';
import { StudyGroupRole } from '~/constants/enums';
import HTTP_STATUS from '~/constants/httpStatus';
import { CreateStudyGroupRequestBody, TokenPayload } from '~/models/requests/User.requests';
import studyGroupsService from '~/services/studyGroups.services';

export const createStudyGroupController = async (
  req: Request<ParamsDictionary, any, CreateStudyGroupRequestBody>,
  res: Response
) => {
  const { user_id } = req.decoded_authorization as TokenPayload;
  const payload = req.body;
  const result = await studyGroupsService.createStudyGroup(user_id, payload);
  return res.status(HTTP_STATUS.CREATED).json({
    message: 'Create study group successfully',
    result
  });
};

export const getStudyGroupsController = async (req: Request, res: Response) => {
  const { user_id } = req.decoded_authorization as TokenPayload;
  const { type } = req.query;

  const studyGroups = await studyGroupsService.getStudyGroups(user_id, type as string);
  return res.json({
    message: 'Get study groups successfully',
    result: studyGroups
  });
};

export const getStudyGroupByIdController = async (req: Request, res: Response) => {
  const { user_id } = req.decoded_authorization as TokenPayload;
  const { study_group_id } = req.params;

  const result = await studyGroupsService.getStudyGroupById(user_id, study_group_id);
  return res.json({
    message: 'Get study group successfully',
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
    message: 'Request to join group successfully',
    result
  });
};

export const acceptJoinRequestController = async (req: Request, res: Response) => {
  const { user_id } = req.decoded_authorization as TokenPayload;
  const { join_request_id } = req.params;
  const result = await studyGroupsService.acceptJoinRequest(user_id, join_request_id);
  return res.json(result);
};

export const declineJoinRequestController = async (req: Request, res: Response) => {
  const { user_id } = req.decoded_authorization as TokenPayload;
  const { join_request_id } = req.params;
  const result = await studyGroupsService.declineJoinRequest(user_id, join_request_id);
  return res.json(result);
};

export const getJoinRequestsController = async (req: Request, res: Response) => {
  const { group_id } = req.params;
  const result = await studyGroupsService.getJoinRequests(group_id);
  return res.json({
    message: 'Get join requests successfully',
    result
  });
};
