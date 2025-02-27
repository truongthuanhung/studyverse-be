import databaseService from './database.services';
import { ObjectId } from 'mongodb';
import Vote from '~/models/schemas/Vote.schema';
import { GroupTargetType, NotificationType, VoteType } from '~/constants/enums';
import notificationsService from './notifications.services';

class VotesService {
  private async getTargetUrl(target_id: string, target_type: GroupTargetType): Promise<string | null> {
    try {
      if (target_type === GroupTargetType.Question) {
        const question = await databaseService.questions.findOne({ _id: new ObjectId(target_id) });
        if (question) {
          return `/groups/${question.group_id}/questions/${question._id}`;
        }
      } else if (target_type === GroupTargetType.Reply) {
        const reply = await databaseService.replies.findOne({ _id: new ObjectId(target_id) });
        if (reply) {
          const question = await databaseService.questions.findOne({ _id: reply.question_id });
          if (question) {
            return `/groups/${question.group_id}/questions/${question._id}?replyId=${reply._id}`;
          }
        }
      }
      return null;
    } catch (error) {
      console.error('Error building target URL:', error);
      return null;
    }
  }

  private async createVoteNotification({
    user_id,
    target_id,
    target_type,
    vote_type,
    group_id
  }: {
    user_id: string;
    target_id: string;
    target_type: GroupTargetType;
    vote_type: VoteType;
    group_id: string;
  }) {
    // Lấy thông tin về owner của target (người cần nhận thông báo)
    let target_owner_id;

    if (target_type === GroupTargetType.Question) {
      const question = await databaseService.questions.findOne({ _id: new ObjectId(target_id) });
      if (question) {
        target_owner_id = question.user_id.toString();
      }
    } else if (target_type === GroupTargetType.Reply) {
      const reply = await databaseService.replies.findOne({ _id: new ObjectId(target_id) });
      if (reply) {
        target_owner_id = reply.user_id.toString();
      }
    }

    // Nếu người vote không phải là owner của target
    if (target_owner_id && target_owner_id !== user_id) {
      const content = vote_type === VoteType.Upvote ? 'has upvoted' : 'has downvoted';
      const target_url = await this.getTargetUrl(target_id, target_type);

      await notificationsService.createNotification({
        user_id: target_owner_id,
        actor_id: user_id,
        reference_id: target_id,
        type: NotificationType.Group,
        content: `${content} ${target_type === GroupTargetType.Question ? 'your question' : 'your reply'}`,
        target_url: target_url ?? undefined,
        group_id
      });
    }
  }

  async vote({
    user_id,
    target_id,
    target_type,
    type,
    group_id
  }: {
    user_id: string;
    target_id: string;
    target_type: GroupTargetType;
    type: VoteType;
    group_id: string;
  }) {
    console.log(group_id);
    const existingVote = await databaseService.votes.findOne({
      user_id: new ObjectId(user_id),
      target_id: new ObjectId(target_id)
    });

    if (existingVote) {
      if (existingVote.type === type) {
        await databaseService.votes.deleteOne({
          user_id: new ObjectId(user_id),
          target_id: new ObjectId(target_id)
        });
        return null; // Unvote → Trả về null vì không còn vote
      } else {
        const updatedVote = await databaseService.votes.findOneAndUpdate(
          {
            user_id: new ObjectId(user_id),
            target_id: new ObjectId(target_id)
          },
          {
            $set: { type }
          },
          { returnDocument: 'after' } // Trả về document sau khi update
        );
        this.createVoteNotification({ user_id, target_id, target_type, vote_type: type, group_id });
        return updatedVote;
      }
    } else {
      const newVote = new Vote({
        user_id: new ObjectId(user_id),
        target_id: new ObjectId(target_id),
        type,
        target_type
      });

      const insertResult = await databaseService.votes.insertOne(newVote);
      if (insertResult.acknowledged) {
        this.createVoteNotification({ user_id, target_id, target_type, vote_type: type, group_id });
        return newVote;
      }
      return null;
    }
  }
}

const votesService = new VotesService();

export default votesService;
