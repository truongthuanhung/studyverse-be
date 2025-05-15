import databaseService from './database.services';
import { ObjectId } from 'mongodb';
import { ErrorWithStatus } from '~/models/Errors';
import HTTP_STATUS from '~/constants/httpStatus';
import { SEARCH_MESSAGES } from '~/constants/messages';
import { PostPrivacy, SearchTargetType, SearchType } from '~/constants/enums';

class SearchService {
  private async addGroupSearchHistory(user_id: string, group_id: string, content: string) {
    const userId = new ObjectId(user_id);
    const groupId = new ObjectId(group_id);
    const currentDate = new Date();

    const result = await databaseService.search_history.findOneAndUpdate(
      {
        user_id: userId,
        search_type: SearchType.Group,
        group_id: groupId,
        content: content
      },
      {
        $set: {
          updated_at: currentDate
        },
        $setOnInsert: {
          user_id: userId,
          search_type: SearchType.Group,
          group_id: groupId,
          target_id: groupId,
          target_type: SearchTargetType.Group,
          content: content,
          created_at: currentDate
        }
      },
      {
        upsert: true,
        returnDocument: 'after'
      }
    );

    return result;
  }

  private async addGeneralSearchHistory(user_id: string, content: string) {
    const userId = new ObjectId(user_id);
    const currentDate = new Date();

    const result = await databaseService.search_history.findOneAndUpdate(
      {
        user_id: userId,
        search_type: SearchType.General,
        group_id: null,
        content: content
      },
      {
        $set: {
          updated_at: currentDate
        },
        $setOnInsert: {
          user_id: userId,
          search_type: SearchType.General,
          group_id: null,
          target_id: null,
          target_type: null,
          content: content,
          created_at: currentDate
        }
      },
      {
        upsert: true,
        returnDocument: 'after'
      }
    );

    return result;
  }

  async search({
    q,
    type,
    page = 1,
    limit = 10,
    user_id
  }: {
    q: string;
    page?: number;
    limit?: number;
    user_id: string;
    type?: 'user' | 'post' | 'group';
  }) {
    const skip = (page - 1) * limit;
    const userObjectId = new ObjectId(user_id);

    if (type === 'user') {
      const userProjection = { password: 0, email_verify_token: 0, forgot_password_token: 0, verify: 0, updated_at: 0 };
      const usersAggregation = await databaseService.users
        .aggregate([
          { $match: { $text: { $search: q } } },
          { $sort: { score: { $meta: 'textScore' } } },
          {
            $facet: {
              users: [{ $skip: skip }, { $limit: limit }, { $project: userProjection }],
              usersTotal: [{ $count: 'count' }]
            }
          }
        ])
        .toArray();

      const users = usersAggregation[0].users;
      const total = usersAggregation[0].usersTotal[0]?.count || 0;

      return {
        users,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit)
        }
      };
    } else if (type === 'group') {
      const groupsAggregation = await databaseService.study_groups
        .aggregate([
          { $match: { $text: { $search: q } } },
          { $sort: { score: { $meta: 'textScore' } } },
          {
            $facet: {
              groups: [{ $skip: skip }, { $limit: limit }],
              groupsTotal: [{ $count: 'count' }]
            }
          }
        ])
        .toArray();

      const groups = groupsAggregation[0].groups;
      const groupsTotal = groupsAggregation[0].groupsTotal[0]?.count || 0;

      return {
        groups,
        pagination: {
          total: groupsTotal,
          page,
          limit,
          totalPages: Math.ceil(groupsTotal / limit)
        }
      };
    } else if (type === 'post') {
      const [friendships, followings] = await Promise.all([
        databaseService.friends.find({ $or: [{ user_id1: userObjectId }, { user_id2: userObjectId }] }).toArray(),
        databaseService.followers.find({ user_id: userObjectId }).toArray()
      ]);

      const friendIds = friendships.map((friendship) => {
        return friendship.user_id1.equals(userObjectId) ? friendship.user_id2 : friendship.user_id1;
      });

      // Extract followed user IDs
      const followedUserIds = followings.map((follow) => follow.followed_user_id);

      const postPrivacyFilter = {
        $or: [
          { privacy: PostPrivacy.Public }, // Public posts
          { user_id: userObjectId }, // User's own posts regardless of privacy
          { privacy: PostPrivacy.Friends, user_id: { $in: friendIds } }, // Friends' posts with Friends privacy
          { privacy: PostPrivacy.Follower, user_id: { $in: followedUserIds } } // Followed users' posts with Follower privacy
        ]
      };

      const postAggregation = await databaseService.posts
        .aggregate([
          {
            $match: {
              $and: [{ $text: { $search: q } }, postPrivacyFilter]
            }
          },
          { $sort: { score: { $meta: 'textScore' } } },
          {
            $facet: {
              posts: [{ $skip: skip }, { $limit: limit }],
              postsTotal: [{ $count: 'count' }]
            }
          }
        ])
        .toArray();

      const posts = postAggregation[0].posts;
      const postsTotal = postAggregation[0].postsTotal[0]?.count || 0;

      return {
        posts,
        pagination: {
          total: postsTotal,
          page,
          limit,
          totalPages: Math.ceil(postsTotal / limit)
        }
      };
    }
    return null;
  }

  async generalSearch({ q, user_id }: { q: string; user_id: string }) {
    const previewLimit = 5; // Giới hạn kết quả preview cho mỗi loại
    const userObjectId = new ObjectId(user_id);

    const userProjection = {
      password: 0,
      email_verify_token: 0,
      forgot_password_token: 0,
      verify: 0,
      updated_at: 0
    };

    const [friendships, followings] = await Promise.all([
      databaseService.friends
        .find({
          $or: [{ user_id1: userObjectId }, { user_id2: userObjectId }]
        })
        .toArray(),

      databaseService.followers
        .find({
          user_id: userObjectId
        })
        .toArray()
    ]);

    const friendIds = friendships.map((friendship) => {
      return friendship.user_id1.equals(userObjectId) ? friendship.user_id2 : friendship.user_id1;
    });

    const followedUserIds = followings.map((follow) => follow.followed_user_id);

    const postPrivacyFilter = {
      $or: [
        { privacy: PostPrivacy.Public },
        {
          user_id: userObjectId
        },
        {
          privacy: PostPrivacy.Friends,
          user_id: { $in: friendIds }
        },
        {
          privacy: PostPrivacy.Follower,
          user_id: { $in: followedUserIds }
        }
      ]
    };

    const [users, groups, posts] = await Promise.all([
      databaseService.users
        .find({
          $text: { $search: q }
        })
        .project(userProjection)
        .sort({ score: { $meta: 'textScore' } })
        .limit(previewLimit)
        .toArray(),

      // Search study groups preview using text index
      databaseService.study_groups
        .find({
          $text: { $search: q }
        })
        .sort({ score: { $meta: 'textScore' } })
        .limit(previewLimit)
        .toArray(),

      // Search posts preview with privacy filter
      databaseService.posts
        .find({
          $and: [{ $text: { $search: q } }, postPrivacyFilter]
        })
        .sort({ score: { $meta: 'textScore' } })
        .limit(previewLimit)
        .toArray()
    ]);

    this.addGeneralSearchHistory(user_id, q).catch((error) => {
      console.error('Error saving general search history:', error);
    });

    return {
      users,
      groups,
      posts
    };
  }

  async groupSearch({
    q,
    page = 1,
    limit = 10,
    user_id,
    group_id
  }: {
    q: string;
    page?: number;
    limit?: number;
    user_id: string;
    group_id: string;
  }) {
    const skip = (page - 1) * limit;

    // Create the search query
    const searchQuery: any = {
      $text: { $search: q },
      group_id: new ObjectId(group_id)
    };

    // Execute both queries in parallel
    const [result, total] = await Promise.all([
      databaseService.questions
        .find(searchQuery)
        .sort({ score: { $meta: 'textScore' } }) // Sort by relevance
        .skip(skip)
        .limit(limit)
        .toArray(),

      databaseService.questions.countDocuments(searchQuery)
    ]);

    if (page === 1) {
      this.addGroupSearchHistory(user_id, group_id, q).catch((error) => {
        console.error('Error saving search history:', error);
      });
    }

    return {
      questions: result,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  async getSearchHistory(user_id: string, group_id?: string) {
    try {
      const result = await databaseService.search_history
        .find({
          user_id: new ObjectId(user_id),
          group_id: group_id ? new ObjectId(group_id) : null
        })
        .sort({ updated_at: -1 })
        .limit(5)
        .toArray();

      return result;
    } catch (error) {
      console.error('Error retrieving search history:', error);
      throw error;
    }
  }

  async deleteSearchHistory({
    user_id,
    search_history_id,
    group_id
  }: {
    user_id: string;
    search_history_id: string;
    group_id?: string;
  }) {
    const result = await databaseService.search_history.deleteOne({
      _id: new ObjectId(search_history_id),
      user_id: new ObjectId(user_id),
      group_id: group_id ? new ObjectId(group_id) : null
    });

    if (result.deletedCount === 0) {
      throw new ErrorWithStatus({
        message: SEARCH_MESSAGES.HISTORY_NOT_FOUND,
        status: HTTP_STATUS.NOT_FOUND
      });
    }

    return result;
  }

  async deleteAllSearchHistory(user_id: string, group_id?: string) {
    const result = await databaseService.search_history.deleteMany({
      user_id: new ObjectId(user_id),
      group_id: group_id ? new ObjectId(group_id) : null
    });
    return result;
  }
}

const searchService = new SearchService();

export default searchService;
