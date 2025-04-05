import { ObjectId } from 'mongodb';
import { InteractionType, LikeType, NotificationType } from '~/constants/enums';
import { LikeRequestBody } from '~/models/requests/Like.requests';
import Like from '~/models/schemas/Like.schema';
import databaseService from '~/services/database.services';
import tagsService from './tags.services';
import notificationsService from './notifications.services';

class LikeService {
  private sendLikeNotification(actor_id: string, user_id: string, post_id: string) {
    // Không cần await
    notificationsService.createNotification({
      user_id,
      actor_id,
      reference_id: post_id,
      type: NotificationType.Personal,
      content: 'has liked your post',
      target_url: `/posts/${post_id}`
    });
  }

  async like(user_id: string, body: LikeRequestBody) {
    const { target_id, type } = body;
    const userId = new ObjectId(user_id);
    const targetId = new ObjectId(target_id);

    const session = databaseService.client.startSession();
    try {
      session.startTransaction();

      const result = await databaseService.likes.findOneAndUpdate(
        {
          user_id: userId,
          target_id: targetId
        },
        {
          $setOnInsert: new Like({
            user_id: userId,
            target_id: targetId,
            type
          })
        },
        {
          upsert: true,
          returnDocument: 'after',
          session
        }
      );

      if (result) {
        const targetCollection = type === LikeType.PostLike ? databaseService.posts : databaseService.comments;
        await targetCollection.updateOne({ _id: targetId }, { $inc: { like_count: 1 } }, { session });

        // Gọi addUserTagInteraction nhưng không chờ kết quả
        if (type === LikeType.PostLike) {
          const post = await databaseService.posts.findOne({ _id: targetId });
          if (post?.tags?.length) {
            post.tags.forEach((tagId: ObjectId) => {
              tagsService.addUserTagInteraction({ user_id, tag_id: tagId.toString(), type: InteractionType.Like });
            });
          }
          if (post && !post.user_id.equals(userId)) {
            this.sendLikeNotification(user_id, post.user_id.toString(), targetId.toString());
          }
        }
      }

      const like_count = await databaseService.likes.countDocuments({ target_id: targetId }, { session });

      await session.commitTransaction();
      return like_count;
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  async unlike(user_id: string, target_id: string) {
    const userId = new ObjectId(user_id);
    const targetId = new ObjectId(target_id);

    const session = databaseService.client.startSession();
    try {
      session.startTransaction();

      const deletedLike = await databaseService.likes.findOneAndDelete(
        {
          user_id: userId,
          target_id: targetId
        },
        { session }
      );

      if (deletedLike) {
        const type = deletedLike.type;
        const targetCollection = type === LikeType.PostLike ? databaseService.posts : databaseService.comments;
        await targetCollection.updateOne({ _id: targetId }, { $inc: { like_count: -1 } }, { session });
      }

      const like_count = await databaseService.likes.countDocuments({ target_id: targetId }, { session });

      await session.commitTransaction();
      return like_count;
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  async getLikesByPostId(post_id: string, page: number = 1, limit: number = 20) {
    page = Math.max(1, page);
    limit = Math.max(1, Math.min(limit, 100));
    const skip = (page - 1) * limit;

    const [result, total] = await Promise.all([
      databaseService.likes
        .aggregate([
          {
            $match: {
              target_id: new ObjectId(post_id)
            }
          },
          {
            $lookup: {
              from: 'users',
              localField: 'user_id',
              foreignField: '_id',
              pipeline: [
                {
                  $project: {
                    _id: 1,
                    name: 1,
                    username: 1,
                    avatar: 1
                  }
                }
              ],
              as: 'user_info'
            }
          },
          {
            $unwind: '$user_info'
          },
          {
            $project: {
              _id: 1,
              target_id: 1,
              user_id: 1,
              created_at: 1,
              user_info: 1
            }
          },
          {
            $sort: { created_at: -1 }
          },
          {
            $skip: skip
          },
          {
            $limit: limit
          }
        ])
        .toArray(),

      databaseService.likes.countDocuments({
        target_id: new ObjectId(post_id)
      })
    ]);

    const total_pages = Math.ceil(total / limit);

    return {
      likes: result,
      total,
      page,
      limit,
      total_pages
    };
  }

  async getLikesByCommentId(comment_id: string, page: number = 1, limit: number = 20) {
    page = Math.max(1, page);
    limit = Math.max(1, Math.min(limit, 100));

    const skip = (page - 1) * limit;

    const [result, total] = await Promise.all([
      databaseService.likes
        .find({
          target_id: new ObjectId(comment_id)
        })
        .sort({ created_at: -1 })
        .skip(skip)
        .limit(limit)
        .toArray(),

      databaseService.likes.countDocuments({
        target_id: new ObjectId(comment_id)
      })
    ]);

    return {
      likes: result,
      total,
      page,
      limit,
      total_pages: Math.ceil(total / limit)
    };
  }
}

const likeService = new LikeService();
export default likeService;
