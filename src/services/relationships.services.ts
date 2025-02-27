import { ObjectId } from 'mongodb';
import databaseService from './database.services';

class RelationshipsService {
  async getFriends({ user_id, page = 1, limit = 10 }: { user_id: string; page?: number; limit?: number }) {
    page = Math.max(1, page);
    limit = Math.max(1, Math.min(limit, 100));
    const skip = (page - 1) * limit;

    const [friends, total] = await Promise.all([
      databaseService.followers
        .aggregate([
          {
            // Find all users that the current user follows
            $match: {
              user_id: new ObjectId(user_id)
            }
          },
          {
            // Look up if those users follow back
            $lookup: {
              from: 'followers',
              let: {
                followedId: '$followed_user_id'
              },
              pipeline: [
                {
                  $match: {
                    $expr: {
                      $and: [
                        { $eq: ['$user_id', '$$followedId'] },
                        { $eq: ['$followed_user_id', new ObjectId(user_id)] }
                      ]
                    }
                  }
                }
              ],
              as: 'mutual_follow'
            }
          },
          {
            // Keep only mutual follows
            $match: {
              mutual_follow: { $ne: [] }
            }
          },
          {
            // Set created_at as the later timestamp between the two follows
            $addFields: {
              created_at: {
                $cond: {
                  if: { $gt: ['$created_at', { $arrayElemAt: ['$mutual_follow.created_at', 0] }] },
                  then: '$created_at',
                  else: { $arrayElemAt: ['$mutual_follow.created_at', 0] }
                }
              }
            }
          },
          {
            // Look up user information
            $lookup: {
              from: 'users',
              localField: 'followed_user_id',
              foreignField: '_id',
              pipeline: [
                {
                  $project: {
                    _id: 1,
                    username: 1,
                    name: 1,
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
            // Final projection
            $project: {
              _id: '$user_info._id',
              username: '$user_info.username',
              name: '$user_info.name',
              avatar: '$user_info.avatar',
              created_at: 1
            }
          },
          {
            // Sort by the latest follow date (when they became friends)
            $sort: { created_at: -1 }
          },
          { $skip: skip },
          { $limit: limit }
        ])
        .toArray(),
      // Count total mutual friends
      databaseService.followers
        .aggregate([
          {
            $match: {
              user_id: new ObjectId(user_id)
            }
          },
          {
            $lookup: {
              from: 'followers',
              let: {
                followedId: '$followed_user_id'
              },
              pipeline: [
                {
                  $match: {
                    $expr: {
                      $and: [
                        { $eq: ['$user_id', '$$followedId'] },
                        { $eq: ['$followed_user_id', new ObjectId(user_id)] }
                      ]
                    }
                  }
                }
              ],
              as: 'mutual_follow'
            }
          },
          {
            $match: {
              mutual_follow: { $ne: [] }
            }
          },
          {
            $count: 'total'
          }
        ])
        .toArray()
    ]);

    const total_count = total[0]?.total || 0;
    const total_pages = Math.ceil(total_count / limit);

    return {
      friends,
      pagination: {
        total: total_count,
        page,
        limit,
        total_pages
      }
    };
  }

  async getFollowers({ user_id, page = 1, limit = 1 }: { user_id: string; page: number; limit: number }) {
    page = Math.max(1, page);
    limit = Math.max(1, Math.min(limit, 100));
    const skip = (page - 1) * limit;

    const [followers, total] = await Promise.all([
      databaseService.followers
        .aggregate([
          {
            $match: { followed_user_id: new ObjectId(user_id) }
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
                    username: 1,
                    name: 1,
                    avatar: 1,
                    created_at: 1
                  }
                }
              ],
              as: 'user_info'
            }
          },
          { $unwind: '$user_info' },
          { $skip: skip },
          { $limit: limit }
        ])
        .toArray(),
      databaseService.followers.countDocuments({ followed_user_id: new ObjectId(user_id) })
    ]);

    const total_pages = Math.ceil(total / limit);

    return {
      followers: followers.map((f) => ({
        user_id: f.user_info._id,
        username: f.user_info.username,
        name: f.user_info.name,
        avatar: f.user_info.avatar,
        created_at: f.user_info.created_at
      })),
      pagination: { total, page, limit, total_pages }
    };
  }

  async getFollowings({ user_id, page = 1, limit = 1 }: { user_id: string; page: number; limit: number }) {
    page = Math.max(1, page);
    limit = Math.max(1, Math.min(limit, 100));
    const skip = (page - 1) * limit;

    const [following, total] = await Promise.all([
      databaseService.followers
        .aggregate([
          {
            $match: { user_id: new ObjectId(user_id) }
          },
          {
            $lookup: {
              from: 'users',
              localField: 'followed_user_id',
              foreignField: '_id',
              pipeline: [
                {
                  $project: {
                    _id: 1,
                    username: 1,
                    name: 1,
                    avatar: 1,
                    created_at: 1
                  }
                }
              ],
              as: 'user_info'
            }
          },
          { $unwind: '$user_info' },
          { $skip: skip },
          { $limit: limit }
        ])
        .toArray(),
      databaseService.followers.countDocuments({ user_id: new ObjectId(user_id) })
    ]);

    const total_pages = Math.ceil(total / limit);

    return {
      following: following.map((f) => ({
        user_id: f.user_info._id,
        username: f.user_info.username,
        name: f.user_info.name,
        avatar: f.user_info.avatar,
        created_at: f.user_info.created_at
      })),
      pagination: { total, page, limit, total_pages }
    };
  }
}

const relationshipsService = new RelationshipsService();

export default relationshipsService;
