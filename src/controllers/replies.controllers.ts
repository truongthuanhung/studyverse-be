import { Request, Response } from 'express';
import { ParamsDictionary } from 'express-serve-static-core';
import { GroupTargetType, ReplyApprovedByType, VoteType } from '~/constants/enums';
import HTTP_STATUS from '~/constants/httpStatus';
import { EditQuestionRequestBody } from '~/models/requests/Question.requests';
import { TokenPayload } from '~/models/requests/User.requests';
import { VoteRequestBody } from '~/models/requests/Vote.requests';
import repliesService from '~/services/replies.services';
import votesService from '~/services/votes.services';

export const createReplyController = async (req: Request, res: Response) => {
  const { user_id } = req.decoded_authorization as TokenPayload;
  const { question_id } = req.params;
  const result = await repliesService.createReply({ user_id, question_id, body: req.body });
  return res.status(HTTP_STATUS.CREATED).json({
    message: 'Create reply successfully',
    result
  });
};

export const getRepliesByQuestionIdController = async (req: Request, res: Response) => {
  const { question_id } = req.params;
  const { page = '1', limit = '10' } = req.query;

  const { user_id } = req.decoded_authorization as TokenPayload;

  const pageNumber = parseInt(page as string);
  const limitNumber = parseInt(limit as string);

  const result = await repliesService.getRepliesByQuestionId({
    question_id,
    user_id,
    page: pageNumber,
    limit: limitNumber
  });
  return res.json({
    message: 'Replies retrieved successfully',
    result
  });
};

export const getReplyByIdController = async (req: Request, res: Response) => {
  const { user_id } = req.decoded_authorization as TokenPayload;
  const { reply_id } = req.params;
  const result = await repliesService.getReplyById({
    reply_id,
    user_id
  });
  return res.json({
    message: 'Get reply successfully',
    result
  });
};

export const deleteReplyController = async (req: Request, res: Response) => {
  const { reply_id } = req.params;
  const result = await repliesService.deleteReply(reply_id);
  return res.json({
    message: 'Delete reply successfully',
    result
  });
};

export const editReplyController = async (req: Request, res: Response) => {
  const { reply_id } = req.params;
  const result = await repliesService.editReply(reply_id, req.body as EditQuestionRequestBody);
  return res.json({
    message: 'Edit reply successfully',
    result
  });
};

export const voteReplyController = async (req: Request<ParamsDictionary, any, VoteRequestBody>, res: Response) => {
  const { user_id } = req.decoded_authorization as TokenPayload;
  const { reply, study_group, question } = req;
  const target_owner_id = reply?.user_id.toString() as string;
  const result = await votesService.vote({
    user_id,
    target_type: GroupTargetType.Reply,
    target_id: reply?._id.toString() as string,
    type: req.body.type,
    group_id: study_group?._id?.toString() as string,
    target_owner_id,
    target_url: `groups/${study_group?._id}/questions/${question?._id?.toString()}/replies/${reply?._id.toString()}`
  });

  return res.json({
    message: 'Vote successfully',
    result
  });
};

export const upvoteReplyController = async (req: Request<ParamsDictionary, any, VoteRequestBody>, res: Response) => {
  const { user_id } = req.decoded_authorization as TokenPayload;
  const { reply, study_group, question } = req;
  const target_owner_id = reply?.user_id.toString() as string;
  const result = await votesService.upvote({
    user_id,
    target_type: GroupTargetType.Reply,
    target_id: reply?._id.toString() as string,
    group_id: study_group?._id?.toString() as string,
    target_owner_id,
    target_url: `groups/${study_group?._id}/questions/${question?._id?.toString()}/replies/${reply?._id.toString()}`
  });

  return res.json({
    message: 'Upvote reply successfully',
    result
  });
};

export const downvoteReplyController = async (req: Request<ParamsDictionary, any, VoteRequestBody>, res: Response) => {
  const { user_id } = req.decoded_authorization as TokenPayload;
  const { reply, study_group, question } = req;
  const target_owner_id = reply?.user_id.toString() as string;
  const result = await votesService.downvote({
    user_id,
    target_type: GroupTargetType.Reply,
    target_id: reply?._id.toString() as string,
    group_id: study_group?._id?.toString() as string,
    target_owner_id,
    target_url: `groups/${study_group?._id}/questions/${question?._id?.toString()}/replies/${reply?._id.toString()}`
  });

  return res.json({
    message: 'Downvote reply successfully',
    result
  });
};

export const unvoteReplyController = async (req: Request<ParamsDictionary, any, VoteRequestBody>, res: Response) => {
  const { user_id } = req.decoded_authorization as TokenPayload;
  const { reply, study_group, question } = req;
  const target_owner_id = reply?.user_id.toString() as string;
  const result = await votesService.unvote({
    user_id,
    target_type: GroupTargetType.Reply,
    target_id: reply?._id.toString() as string,
    group_id: study_group?._id?.toString() as string,
    target_owner_id,
    target_url: `groups/${study_group?._id}/questions/${question?._id?.toString()}/replies/${reply?._id.toString()}`
  });

  return res.json({
    message: 'Unvote reply successfully',
    result
  });
};

export const approveReplyByTeacherAdminController = async (req: Request, res: Response) => {
  const { reply_id } = req.params;

  const result = await repliesService.approveReply(reply_id, ReplyApprovedByType.Teacher);

  return res.json({
    message: 'Approve reply successfully',
    result
  });
};

export const approveReplyByQuestionOwnerController = async (req: Request, res: Response) => {
  const { reply_id } = req.params;

  const result = await repliesService.approveReply(reply_id, ReplyApprovedByType.User);

  return res.json({
    message: 'Approve reply successfully',
    result
  });
};
