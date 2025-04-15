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

  async generalSearch({
    q,
    page = 1,
    limit = 10,
    user_id
  }: {
    q: string;
    page?: number;
    limit?: number;
    user_id: string;
  }) {
    const skip = (page - 1) * limit;
    const userObjectId = new ObjectId(user_id);

    // Define user projection to exclude sensitive fields
    const userProjection = {
      password: 0,
      email_verify_token: 0,
      forgot_password_token: 0,
      verify: 0,
      updated_at: 0
    };

    // Get user's friends and followed users
    const [friendships, followings] = await Promise.all([
      // Find all friendships where the user is either user_id1 or user_id2
      databaseService.friends
        .find({
          $or: [{ user_id1: userObjectId }, { user_id2: userObjectId }]
        })
        .toArray(),

      // Find all users that the current user follows
      databaseService.followers
        .find({
          user_id: userObjectId
        })
        .toArray()
    ]);

    // Extract friend IDs
    const friendIds = friendships.map((friendship) => {
      return friendship.user_id1.equals(userObjectId) ? friendship.user_id2 : friendship.user_id1;
    });

    // Extract followed user IDs
    const followedUserIds = followings.map((follow) => follow.followed_user_id);

    // Construct post privacy filter
    const postPrivacyFilter = {
      $or: [
        { privacy: PostPrivacy.Public }, // Public posts
        {
          user_id: userObjectId // User's own posts regardless of privacy
        },
        {
          privacy: PostPrivacy.Friends,
          user_id: { $in: friendIds } // Friends' posts with Friends privacy
        },
        {
          privacy: PostPrivacy.Follower,
          user_id: { $in: followedUserIds } // Followed users' posts with Follower privacy
        }
      ]
    };

    // Execute queries in parallel for all three collections
    const [users, groups, posts, usersTotal, groupsTotal, postsTotal] = await Promise.all([
      // Search users using text index with projection
      databaseService.users
        .find({
          $text: { $search: q }
        })
        .project(userProjection)
        .sort({ score: { $meta: 'textScore' } })
        .skip(skip)
        .limit(limit)
        .toArray(),

      // Search study groups using text index
      databaseService.study_groups
        .find({
          $text: { $search: q }
        })
        .sort({ score: { $meta: 'textScore' } })
        .skip(skip)
        .limit(limit)
        .toArray(),

      // Search posts with privacy filter
      databaseService.posts
        .find({
          $and: [{ $text: { $search: q } }, postPrivacyFilter]
        })
        .sort({ score: { $meta: 'textScore' } })
        .skip(skip)
        .limit(limit)
        .toArray(),

      // Count total documents for each collection
      databaseService.users.countDocuments({
        $text: { $search: q }
      }),

      databaseService.study_groups.countDocuments({
        $text: { $search: q }
      }),

      // Count posts respecting privacy
      databaseService.posts.countDocuments({
        $and: [{ $text: { $search: q } }, postPrivacyFilter]
      })
    ]);

    // Record search history if it's the first page
    if (page === 1) {
      this.addGeneralSearchHistory(user_id, q).catch((error) => {
        console.error('Error saving general search history:', error);
      });
    }

    const totalResults = usersTotal + groupsTotal + postsTotal;

    return {
      users,
      groups,
      posts,
      pagination: {
        total: totalResults,
        usersTotal,
        groupsTotal,
        postsTotal,
        page,
        limit,
        totalPages: Math.ceil(totalResults / limit)
      }
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
