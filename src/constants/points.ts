import { InteractionType } from './enums';

export const POINTS = {
  QUESTION_APPROVED: 5,
  REPLY_CREATED: 1,
  ANSWER_ACCEPTED: 10,
  UPVOTE_RECEIVED: 2
} as const;

export const InteractionScore = {
  [InteractionType.Like]: 1,
  [InteractionType.Comment]: 3,
  [InteractionType.Post]: 5,
  [InteractionType.Share]: 4
};
