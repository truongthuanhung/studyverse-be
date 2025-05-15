import { ObjectId } from 'mongodb';
import databaseService from './database.services';

class UserSuggestionsService {
  private async getExistingConnections(user_id: string) {
    const userObjectId = new ObjectId(user_id);
    // Lấy danh sách bạn bè
    const friends = await databaseService.friends
      .find({
        $or: [{ user_id1: userObjectId }, { user_id2: userObjectId }]
      })
      .toArray();

    // Lấy danh sách người dùng đang theo dõi
    const following = await databaseService.followers
      .find({
        user_id: userObjectId
      })
      .toArray();

    // Kết hợp và loại bỏ trùng lặp
    const connections = new Set<string>();
    connections.add(userObjectId.toString()); // Thêm chính người dùng để loại khỏi kết quả

    friends.forEach((friend) => {
      const friendId = friend.user_id1.equals(userObjectId) ? friend.user_id2 : friend.user_id1;
      connections.add(friendId.toString());
    });

    following.forEach((follow) => {
      connections.add(follow.followed_user_id.toString());
    });

    return Array.from(connections).map((id) => new ObjectId(id));
  }

  async getRecommendedUsersByGroup({
    user_id,
    page = 1,
    limit = 10
  }: {
    user_id: string;
    page: number;
    limit: number;
  }) {
    const userObjectId = new ObjectId(user_id);
    const skip = (page - 1) * limit;
    const existingConnections = await this.getExistingConnections(user_id);

    const userGroups = await databaseService.study_group_members
      .find({
        user_id: userObjectId
      })
      .toArray();

    if (userGroups.length === 0) {
      return {
        users: [],
        pagination: {
          total: 0,
          page,
          limit,
          totalPages: 0
        }
      };
    }

    const groupIds = userGroups.map((group) => group.group_id);

    const result = await databaseService.study_group_members
      .aggregate([
        {
          $match: {
            group_id: { $in: groupIds },
            user_id: { $nin: existingConnections }
          }
        },
        {
          $facet: {
            totalCount: [
              {
                $group: {
                  _id: '$user_id'
                }
              },
              {
                $count: 'total'
              }
            ],
            users: [
              {
                $group: {
                  _id: '$user_id',
                  groupCount: { $sum: 1 },
                  totalPoints: { $sum: '$points' }
                }
              },
              {
                $sort: { groupCount: -1, totalPoints: -1 }
              },
              {
                $skip: skip
              },
              {
                $limit: limit
              },
              {
                $lookup: {
                  from: 'users',
                  localField: '_id',
                  foreignField: '_id',
                  as: 'userInfo'
                }
              },
              {
                $unwind: '$userInfo'
              },
              {
                $replaceRoot: { newRoot: '$userInfo' }
              },
              {
                $project: {
                  _id: 1,
                  username: 1,
                  name: 1,
                  avatar: 1,
                  isFollow: { $literal: false }
                }
              }
            ]
          }
        },
        {
          $project: {
            users: 1,
            total: { $arrayElemAt: ['$totalCount.total', 0] }
          }
        }
      ])
      .toArray();

    const data = result[0] || { users: [], total: 0 };
    const total = data.total || 0;
    const totalPages = Math.ceil(total / limit);

    return {
      users: data.users,
      pagination: {
        total,
        page,
        limit,
        totalPages
      }
    };
  }

  async getRecommendedUsersWithMutualConnections({
    user_id,
    page = 1,
    limit = 10
  }: {
    user_id: string;
    page: number;
    limit: number;
  }) {
    const userObjectId = new ObjectId(user_id);
    const skip = (page - 1) * limit;
    const existingConnections = await this.getExistingConnections(user_id);

    const result = await databaseService.users
      .aggregate([
        {
          // Filter out the current user and existing connections
          $match: {
            _id: { $nin: existingConnections }
          }
        },
        {
          // For each potential user, find mutual friends
          $lookup: {
            from: 'friends',
            let: { userId: '$_id' },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $or: [
                      // Current user's friend is also friend with potential user
                      {
                        $and: [{ $eq: ['$user_id1', userObjectId] }, { $in: ['$user_id2', existingConnections] }]
                      },
                      {
                        $and: [{ $eq: ['$user_id2', userObjectId] }, { $in: ['$user_id1', existingConnections] }]
                      },
                      // Potential user's friend is also friend with current user
                      {
                        $and: [{ $eq: ['$user_id1', '$$userId'] }, { $in: ['$user_id2', existingConnections] }]
                      },
                      {
                        $and: [{ $eq: ['$user_id2', '$$userId'] }, { $in: ['$user_id1', existingConnections] }]
                      }
                    ]
                  }
                }
              },
              {
                $project: {
                  _id: 1
                }
              }
            ],
            as: 'mutualFriends'
          }
        },
        {
          // For each potential user, find mutual followers
          $lookup: {
            from: 'followers',
            let: { userId: '$_id' },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $or: [
                      // Users who follow both current user and potential user
                      {
                        $and: [{ $eq: ['$followed_user_id', userObjectId] }, { $in: ['$user_id', existingConnections] }]
                      },
                      // Users who are followed by both current user and potential user
                      {
                        $and: [{ $eq: ['$user_id', userObjectId] }, { $in: ['$followed_user_id', existingConnections] }]
                      },
                      // Users followed by current user who also follow potential user
                      {
                        $and: [{ $eq: ['$user_id', userObjectId] }, { $eq: ['$followed_user_id', '$$userId'] }]
                      },
                      // Users followed by potential user who also follow current user
                      {
                        $and: [{ $eq: ['$user_id', '$$userId'] }, { $eq: ['$followed_user_id', userObjectId] }]
                      }
                    ]
                  }
                }
              },
              {
                $project: {
                  _id: 1
                }
              }
            ],
            as: 'mutualFollowers'
          }
        },
        {
          // Add new field with total count of mutual connections
          $addFields: {
            mutualConnectionsCount: {
              $add: [{ $size: '$mutualFriends' }, { $size: '$mutualFollowers' }]
            }
          }
        },
        {
          // Filter users with at least one mutual connection
          $match: {
            mutualConnectionsCount: { $gt: 0 }
          }
        },
        {
          // Get total count before pagination
          $facet: {
            totalCount: [{ $count: 'total' }],
            users: [
              {
                $sort: { mutualConnectionsCount: -1 }
              },
              {
                $skip: skip
              },
              {
                $limit: limit
              },
              {
                $project: {
                  _id: 1,
                  username: 1,
                  name: 1,
                  avatar: 1,
                  mutualConnectionsCount: 1,
                  isFollow: { $literal: false }
                }
              }
            ]
          }
        },
        {
          $project: {
            users: 1,
            total: { $arrayElemAt: ['$totalCount.total', 0] }
          }
        }
      ])
      .toArray();

    const data = result[0] || { users: [], total: 0 };
    const total = data.total || 0;
    const totalPages = Math.ceil(total / limit);

    return {
      users: data.users,
      pagination: {
        total,
        page,
        limit,
        totalPages
      }
    };
  }
}

const userSuggestionsService = new UserSuggestionsService();

export default userSuggestionsService;
