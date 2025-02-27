import { Request, Response } from 'express';
import { ParamsDictionary } from 'express-serve-static-core';
import { GroupTargetType, VoteType } from '~/constants/enums';
import { TokenPayload } from '~/models/requests/User.requests';
import { VoteRequestBody } from '~/models/requests/Vote.requests';
import votesService from '~/services/votes.services';

export const voteQuestionController = async (req: Request<ParamsDictionary, any, VoteRequestBody>, res: Response) => {
  const { user_id } = req.decoded_authorization as TokenPayload;
  const { question_id, group_id } = req.params;

  const result = await votesService.vote({
    user_id,
    target_type: GroupTargetType.Question,
    target_id: question_id,
    type: req.body.type
  });

  return res.json({
    message: 'Vote successfully',
    result
  });
};
