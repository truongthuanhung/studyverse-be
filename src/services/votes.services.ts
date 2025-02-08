import databaseService from './database.services';
import { ObjectId } from 'mongodb';
import Vote from '~/models/schemas/Vote.schema';
import { GroupTargetType, VoteType } from '~/constants/enums';

class VotesService {
  async vote({
    user_id,
    target_id,
    target_type,
    type
  }: {
    user_id: string;
    target_id: string;
    target_type: GroupTargetType;
    type: VoteType;
  }) {
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
        return newVote;
      }

      return null; // Trả về null nếu insert thất bại
    }
  }
}

const votesService = new VotesService();

export default votesService;
