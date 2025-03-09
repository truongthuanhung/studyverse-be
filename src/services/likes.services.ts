import { ObjectId, WithId } from 'mongodb';
import { LikeType } from '~/constants/enums';
import HTTP_STATUS from '~/constants/httpStatus';
import { ErrorWithStatus } from '~/models/Errors';
import { LikeRequestBody } from '~/models/requests/Like.requests';
import Like from '~/models/schemas/Like.schema';
import databaseService from '~/services/database.services';
import usersService from './users.services';

class LikeService {
  async like(user_id: string, body: LikeRequestBody) {
    const { target_id, type } = body;

    await databaseService.likes.findOneAndUpdate(
      {
        user_id: new ObjectId(user_id),
        target_id: new ObjectId(target_id)
      },
      {
        $setOnInsert: new Like({
          user_id: new ObjectId(user_id),
          target_id: new ObjectId(target_id),
          type
        })
      },
      {
        upsert: true
      }
    );

    const like_count = await databaseService.likes.countDocuments({
      target_id: new ObjectId(target_id)
    });

    return like_count;
  }

  async unlike(user_id: string, target_id: string) {
    await databaseService.likes.findOneAndDelete({
      user_id: new ObjectId(user_id),
      target_id: new ObjectId(target_id)
    });

    const like_count = await databaseService.likes.countDocuments({
      target_id: new ObjectId(target_id)
    });

    return like_count;
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
