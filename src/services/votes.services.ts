import databaseService from './database.services';
import { ObjectId } from 'mongodb';
import Vote from '~/models/schemas/Vote.schema';
import { GroupTargetType, NotificationType, VoteType } from '~/constants/enums';
import notificationsService from './notifications.services';
import studyGroupsService from './studyGroups.services';
import { POINTS } from '~/constants/points';

class VotesService {
  async vote({
    user_id,
    target_id,
    target_type,
    type,
    target_url,
    target_owner_id,
    group_id
  }: {
    user_id: string;
    target_id: string;
    target_type: GroupTargetType;
    type: VoteType;
    target_url: string;
    target_owner_id: string;
    group_id: string;
  }) {
    const session = databaseService.client.startSession();
    try {
      await session.withTransaction(async () => {
        const userObjectId = new ObjectId(user_id);
        const targetObjectId = new ObjectId(target_id);

        // Lấy thông tin vote hiện tại & target_owner_id
        const existingVote = await databaseService.votes.findOne(
          { user_id: userObjectId, target_id: targetObjectId },
          { session }
        );

        let pointsToAdd = 0;
        let voteOperation;

        if (existingVote) {
          if (existingVote.type === type) {
            // Xóa vote nếu người dùng chọn lại cùng loại (undo vote)
            await databaseService.votes.deleteOne({ user_id: userObjectId, target_id: targetObjectId }, { session });

            // Chỉ trừ điểm nếu đang hủy upvote, downvote thì không ảnh hưởng
            pointsToAdd = existingVote.type === VoteType.Upvote ? -POINTS.UPVOTE_RECEIVED : 0;
            voteOperation = null;
          } else {
            // Cập nhật nếu loại vote khác nhau
            voteOperation = await databaseService.votes.findOneAndUpdate(
              { user_id: userObjectId, target_id: targetObjectId },
              { $set: { type } },
              { returnDocument: 'after', session }
            );

            // Nếu đổi từ upvote → downvote: Trừ điểm, ngược lại thì cộng điểm
            pointsToAdd = existingVote.type === VoteType.Upvote ? -POINTS.UPVOTE_RECEIVED : POINTS.UPVOTE_RECEIVED;
          }
        } else {
          // Tạo vote mới
          const newVote = new Vote({
            user_id: userObjectId,
            target_id: targetObjectId,
            type,
            target_type
          });

          const insertResult = await databaseService.votes.insertOne(newVote, { session });
          if (!insertResult.acknowledged) throw new Error('Insert vote failed');

          // Nếu là upvote thì mới cộng điểm, còn downvote thì giữ nguyên
          pointsToAdd = type === VoteType.Upvote ? POINTS.UPVOTE_RECEIVED : 0;
          voteOperation = newVote;
        }

        // Cập nhật điểm và tạo thông báo (chạy song song)
        await Promise.all([
          pointsToAdd !== 0 &&
            studyGroupsService.addPointsToMember(
              {
                user_id: target_owner_id as string,
                group_id,
                pointsToAdd
              },
              session
            ),
          voteOperation &&
            user_id !== target_owner_id &&
            notificationsService.createNotification({
              user_id: target_owner_id,
              actor_id: user_id,
              reference_id: target_id,
              type: NotificationType.Group,
              content: `has ${type === VoteType.Upvote ? 'upvoted' : 'downvoted'} ${target_type === GroupTargetType.Question ? 'your question' : 'your reply'}`,
              target_url: target_url ?? undefined,
              group_id
            })
        ]);

        return voteOperation;
      });
    } catch (error) {
      console.error('Vote transaction failed:', error);
      throw error;
    } finally {
      await session.endSession();
    }
  }
}

const votesService = new VotesService();

export default votesService;
