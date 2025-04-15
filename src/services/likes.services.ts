import { ObjectId } from 'mongodb';
import { InteractionType, LikeType, NotificationType } from '~/constants/enums';
import { LikeRequestBody } from '~/models/requests/Like.requests';
import Like from '~/models/schemas/Like.schema';
import databaseService from '~/services/database.services';
import tagsService from './tags.services';
import notificationsService from './notifications.services';
import { ErrorWithStatus } from '~/models/Errors';
import HTTP_STATUS from '~/constants/httpStatus';

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

    const existingLike = await databaseService.likes.findOne({
      user_id: userId,
      target_id: targetId
    });

    if (existingLike) {
      throw new ErrorWithStatus({
        message: 'Already liked',
        status: HTTP_STATUS.CONFLICT
      });
    }
    const targetCollection = type === LikeType.PostLike ? databaseService.posts : databaseService.comments;

    await Promise.all([
      databaseService.likes.insertOne(
        new Like({
          user_id: userId,
          target_id: targetId,
          type
        })
      ),
      targetCollection.updateOne({ _id: targetId }, { $inc: { like_count: 1 } })
    ]);

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

    return await targetCollection.findOne({ _id: targetId });
  }

  async unlike(user_id: string, target_id: string) {
    const userId = new ObjectId(user_id);
    const targetId = new ObjectId(target_id);
    const deletedLike = await databaseService.likes.findOneAndDelete({
      user_id: userId,
      target_id: targetId
    });

    if (!deletedLike) {
      throw new ErrorWithStatus({
        message: 'Like not found',
        status: HTTP_STATUS.NOT_FOUND
      });
    }
    const type = deletedLike.type;
    const targetCollection = type === LikeType.PostLike ? databaseService.posts : databaseService.comments;
    await targetCollection.updateOne({ _id: targetId }, { $inc: { like_count: -1 } });
    const targetDocument = await targetCollection.findOne({ _id: targetId });
    return targetDocument;
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
