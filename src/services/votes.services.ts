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

        // Lấy thông tin vote hiện tại
        const existingVote = await databaseService.votes.findOne(
          { user_id: userObjectId, target_id: targetObjectId },
          { session }
        );

        let pointsToAdd = 0;
        let voteOperation;
        let voteChange = { upvotes: 0, downvotes: 0 };

        if (existingVote) {
          if (existingVote.type === type) {
            // Xóa vote nếu người dùng chọn lại cùng loại (undo vote)
            await databaseService.votes.deleteOne({ user_id: userObjectId, target_id: targetObjectId }, { session });

            // Chỉ trừ điểm nếu đang hủy upvote, downvote thì không ảnh hưởng
            pointsToAdd = existingVote.type === VoteType.Upvote ? -POINTS.UPVOTE_RECEIVED : 0;

            // Cập nhật voteChange để giảm số lượng upvote/downvote
            if (existingVote.type === VoteType.Upvote) {
              voteChange.upvotes = -1;
            } else {
              voteChange.downvotes = -1;
            }

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

            // Cập nhật voteChange để chuyển từ upvote sang downvote hoặc ngược lại
            if (existingVote.type === VoteType.Upvote && type === VoteType.Downvote) {
              voteChange.upvotes = -1;
              voteChange.downvotes = 1;
            } else if (existingVote.type === VoteType.Downvote && type === VoteType.Upvote) {
              voteChange.upvotes = 1;
              voteChange.downvotes = -1;
            }
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

          // Cập nhật voteChange để tăng số lượng upvote/downvote
          if (type === VoteType.Upvote) {
            voteChange.upvotes = 1;
          } else {
            voteChange.downvotes = 1;
          }

          voteOperation = newVote;
        }

        // Cập nhật Question nếu là vote cho câu hỏi
        if (target_type === GroupTargetType.Question && (voteChange.upvotes !== 0 || voteChange.downvotes !== 0)) {
          const updateQuery: any = {};

          if (voteChange.upvotes !== 0) {
            updateQuery.$inc = { ...updateQuery.$inc, upvotes: voteChange.upvotes };
          }

          if (voteChange.downvotes !== 0) {
            updateQuery.$inc = { ...updateQuery.$inc, downvotes: voteChange.downvotes };
          }

          await databaseService.questions.updateOne({ _id: targetObjectId }, updateQuery, { session });
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

  async upvote({
    user_id,
    target_id,
    target_type,
    target_url,
    target_owner_id,
    group_id
  }: {
    user_id: string;
    target_id: string;
    target_type: GroupTargetType;
    target_url: string;
    target_owner_id: string;
    group_id: string;
  }) {
    const userObjectId = new ObjectId(user_id);
    const targetObjectId = new ObjectId(target_id);

    // Lấy vote hiện tại nếu có
    const existingVote = await databaseService.votes.findOne({
      user_id: userObjectId,
      target_id: targetObjectId
    });

    // Tạo hoặc cập nhật vote thành upvote
    await databaseService.votes.findOneAndUpdate(
      { user_id: userObjectId, target_id: targetObjectId },
      { $set: { type: VoteType.Upvote, target_type } },
      { returnDocument: 'after', upsert: true }
    );

    // Cập nhật số lượng votes cho target (Question hoặc Reply)
    const targetCollection =
      target_type === GroupTargetType.Question ? databaseService.questions : databaseService.replies;

    if (existingVote && existingVote.type === VoteType.Downvote) {
      // Chuyển từ downvote sang upvote: -1 downvote, +1 upvote
      await targetCollection.updateOne({ _id: targetObjectId }, { $inc: { upvotes: 1, downvotes: -1 } });
    } else if (!existingVote) {
      // Nếu chưa có vote, chỉ cần +1 upvote
      await targetCollection.updateOne({ _id: targetObjectId }, { $inc: { upvotes: 1 } });
    }
    // Nếu đã là upvote, không cần làm gì

    // Cập nhật điểm cho thành viên (chỉ cộng điểm nếu chưa có vote hoặc đang là downvote)
    if (!existingVote || existingVote.type === VoteType.Downvote) {
      studyGroupsService.addPointsToMember({
        user_id: target_owner_id as string,
        group_id,
        pointsToAdd: POINTS.UPVOTE_RECEIVED
      });
    }

    // Tạo thông báo cho người nhận vote
    if (user_id !== target_owner_id) {
      const content =
        existingVote && existingVote.type === VoteType.Downvote
          ? `has changed their downvote to an upvote on ${target_type === GroupTargetType.Question ? 'your question' : 'your reply'}`
          : `has upvoted ${target_type === GroupTargetType.Question ? 'your question' : 'your reply'}`;

      notificationsService.createNotification({
        user_id: target_owner_id,
        actor_id: user_id,
        reference_id: target_id,
        type: NotificationType.Group,
        content,
        target_url: target_url ?? undefined,
        group_id
      });
    }

    const result = await targetCollection.findOne(
      {
        _id: targetObjectId
      },
      {
        projection: {
          upvotes: 1,
          downvotes: 1,
          reply_count: 1,
          parent_id: 1
        }
      }
    );

    return result;
  }

  async downvote({
    user_id,
    target_id,
    target_type,
    target_url,
    target_owner_id,
    group_id
  }: {
    user_id: string;
    target_id: string;
    target_type: GroupTargetType;
    target_url: string;
    target_owner_id: string;
    group_id: string;
  }) {
    const userObjectId = new ObjectId(user_id);
    const targetObjectId = new ObjectId(target_id);

    // Lấy vote hiện tại nếu có
    const existingVote = await databaseService.votes.findOne({
      user_id: userObjectId,
      target_id: targetObjectId
    });

    // Tạo hoặc cập nhật vote thành downvote
    const voteOperation = await databaseService.votes.findOneAndUpdate(
      { user_id: userObjectId, target_id: targetObjectId },
      { $set: { type: VoteType.Downvote, target_type } },
      { returnDocument: 'after', upsert: true }
    );

    // Cập nhật số lượng votes cho target (Question hoặc Reply)
    const targetCollection =
      target_type === GroupTargetType.Question ? databaseService.questions : databaseService.replies;

    if (existingVote && existingVote.type === VoteType.Upvote) {
      // Chuyển từ upvote sang downvote: -1 upvote, +1 downvote
      await targetCollection.updateOne({ _id: targetObjectId }, { $inc: { upvotes: -1, downvotes: 1 } });

      // Trừ điểm khi chuyển từ upvote sang downvote
      studyGroupsService.addPointsToMember({
        user_id: target_owner_id as string,
        group_id,
        pointsToAdd: -POINTS.UPVOTE_RECEIVED
      });
    } else if (!existingVote) {
      // Nếu chưa có vote, chỉ cần +1 downvote
      await targetCollection.updateOne({ _id: targetObjectId }, { $inc: { downvotes: 1 } });
    }
    // Nếu đã là downvote, không cần làm gì

    // Tạo thông báo cho người nhận vote
    if (user_id !== target_owner_id) {
      const content =
        existingVote && existingVote.type === VoteType.Upvote
          ? `has changed their upvote to a downvote on ${target_type === GroupTargetType.Question ? 'your question' : 'your reply'}`
          : `has downvoted ${target_type === GroupTargetType.Question ? 'your question' : 'your reply'}`;

      notificationsService.createNotification({
        user_id: target_owner_id,
        actor_id: user_id,
        reference_id: target_id,
        type: NotificationType.Group,
        content,
        target_url: target_url ?? undefined,
        group_id
      });
    }

    const result = await targetCollection.findOne(
      {
        _id: targetObjectId
      },
      {
        projection: {
          upvotes: 1,
          downvotes: 1,
          reply_count: 1,
          parent_id: 1
        }
      }
    );

    return result;
  }

  // Phương thức unvote giữ nguyên như cũ
  async unvote({
    user_id,
    target_id,
    target_type,
    target_url,
    target_owner_id,
    group_id
  }: {
    user_id: string;
    target_id: string;
    target_type: GroupTargetType;
    target_url: string;
    target_owner_id: string;
    group_id: string;
  }) {
    const userObjectId = new ObjectId(user_id);
    const targetObjectId = new ObjectId(target_id);

    // Sử dụng findOneAndDelete để vừa lấy thông tin vote vừa xóa luôn
    const deletedVote = await databaseService.votes.findOneAndDelete({
      user_id: userObjectId,
      target_id: targetObjectId
    });

    // Nếu không có vote nào tồn tại, không cần làm gì
    if (!deletedVote) {
      return null;
    }

    // Cập nhật số lượng votes cho target (Question hoặc Reply)
    const targetCollection =
      target_type === GroupTargetType.Question ? databaseService.questions : databaseService.replies;

    const updateField = deletedVote.type === VoteType.Upvote ? 'upvotes' : 'downvotes';
    const updateQuery = { $inc: { [updateField]: -1 } };

    await targetCollection.updateOne({ _id: targetObjectId }, updateQuery);

    // Nếu là upvote thì trừ điểm, downvote thì không cần
    const pointsToAdd = deletedVote.type === VoteType.Upvote ? -POINTS.UPVOTE_RECEIVED : 0;

    // Cập nhật điểm và tạo thông báo (chạy song song)
    Promise.all([
      pointsToAdd !== 0 &&
        studyGroupsService.addPointsToMember({
          user_id: target_owner_id as string,
          group_id,
          pointsToAdd
        }),
      user_id !== target_owner_id &&
        notificationsService.createNotification({
          user_id: target_owner_id,
          actor_id: user_id,
          reference_id: target_id,
          type: NotificationType.Group,
          content: `has removed their ${deletedVote.type === VoteType.Upvote ? 'upvote' : 'downvote'} on ${target_type === GroupTargetType.Question ? 'your question' : 'your reply'}`,
          target_url: target_url ?? undefined,
          group_id
        })
    ]);

    const result = await targetCollection.findOne(
      {
        _id: targetObjectId
      },
      {
        projection: {
          upvotes: 1,
          downvotes: 1,
          reply_count: 1,
          parent_id: 1
        }
      }
    );

    return result;
  }
}

const votesService = new VotesService();

export default votesService;
