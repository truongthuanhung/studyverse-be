import { Request, Response } from 'express';
import { ParamsDictionary } from 'express-serve-static-core';
import { GroupTargetType, VoteType } from '~/constants/enums';
import { TokenPayload } from '~/models/requests/User.requests';
import { VoteRequestBody } from '~/models/requests/Vote.requests';
import votesService from '~/services/votes.services';

export const upvoteQuestionController = async (req: Request, res: Response) => {
  const { user_id } = req.decoded_authorization as TokenPayload;
  const { question, study_group } = req;
  const target_owner_id = question?.user_id.toString() as string;
  const result = await votesService.upvote({
    user_id,
    target_type: GroupTargetType.Question,
    target_id: question?._id?.toString() as string,
    group_id: study_group?._id?.toString() as string,
    target_owner_id,
    target_url: `groups/${study_group?._id}/questions/${question?._id?.toString()}`
  });

  return res.json({
    message: 'Upvote question successfully',
    result
  });
};

export const downvoteQuestionController = async (req: Request, res: Response) => {
  const { user_id } = req.decoded_authorization as TokenPayload;
  const { question, study_group } = req;
  const target_owner_id = question?.user_id.toString() as string;
  const result = await votesService.downvote({
    user_id,
    target_type: GroupTargetType.Question,
    target_id: question?._id?.toString() as string,
    group_id: study_group?._id?.toString() as string,
    target_owner_id,
    target_url: `groups/${study_group?._id}/questions/${question?._id?.toString()}`
  });

  return res.json({
    message: 'Downvote question successfully',
    result
  });
};

export const unvoteQuestionController = async (req: Request, res: Response) => {
  const { user_id } = req.decoded_authorization as TokenPayload;
  const { question, study_group } = req;
  const target_owner_id = question?.user_id.toString() as string;
  const result = await votesService.unvote({
    user_id,
    target_type: GroupTargetType.Question,
    target_id: question?._id?.toString() as string,
    group_id: study_group?._id?.toString() as string,
    target_owner_id,
    target_url: `groups/${study_group?._id}/questions/${question?._id?.toString()}`
  });

  return res.json({
    message: 'Unvote question successfully',
    result
  });
};
