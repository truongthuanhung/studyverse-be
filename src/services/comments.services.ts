import { CreateCommentRequestBody, UpdateCommentRequestBody } from '~/models/requests/Comment.requests';
import databaseService from './database.services';
import Comment from '~/models/schemas/Comment.schema';
import { ClientSession, ObjectId } from 'mongodb';
import { ErrorWithStatus } from '~/models/Errors';
import HTTP_STATUS from '~/constants/httpStatus';
import tagsService from './tags.services';
import { InteractionType, NotificationType } from '~/constants/enums';
import notificationsService from './notifications.services';
import postsService from './posts.services';

class CommentsService {
  private sendCommentNotification(actor_id: string, user_id: string, post_id: string) {
    notificationsService.createNotification({
      user_id,
      actor_id,
      reference_id: post_id,
      type: NotificationType.Personal,
      content: 'has commented on your post',
      target_url: `/posts/${post_id}`
    });
  }

  async getCommentById(comment_id: string, user_id: string) {
    const [result] = await databaseService.comments
      .aggregate([
        {
          $match: { _id: new ObjectId(comment_id) }
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
        // Lookup to check if the current user has liked this comment
        {
          $lookup: {
            from: 'likes',
            let: { comment_id: '$_id' },
            pipeline: [
              {
                $match: {
                  $and: [{ $expr: { $eq: ['$target_id', '$$comment_id'] } }, { user_id: new ObjectId(user_id) }]
                }
              }
            ],
            as: 'user_likes'
          }
        },
        {
          $project: {
            _id: 1,
            content: 1,
            post_id: 1,
            parent_id: 1,
            created_at: 1,
            updated_at: 1,
            user_info: 1,
            like_count: 1,
            isLiked: { $gt: [{ $size: '$user_likes' }, 0] }
          }
        }
      ])
      .toArray();
    if (!result) {
      return null;
    }

    return result;
  }

  async checkCommentExists(comment_id: string) {
    const comment = await databaseService.comments.findOne({ _id: new ObjectId(comment_id) });
    if (!comment) {
      throw new ErrorWithStatus({ message: 'Comment not found', status: HTTP_STATUS.NOT_FOUND });
    }
  }

  async commentOnPost({
    user_id,
    post_id,
    body
  }: {
    user_id: string;
    post_id: string;
    body: CreateCommentRequestBody;
  }) {
    const session = databaseService.client.startSession();
    try {
      let postOwner: ObjectId | null = null;
      let comment_id: ObjectId | null = null;

      await session.withTransaction(async () => {
        const result = await databaseService.comments.insertOne(
          new Comment({
            ...body,
            user_id: new ObjectId(user_id),
            post_id: new ObjectId(post_id),
            parent_id: body.parent_id ? new ObjectId(body.parent_id) : null
          }),
          { session }
        );

        if (!result.insertedId) {
          throw new Error('Failed to create comment');
        }

        comment_id = result.insertedId;

        // Increment the post's comment count
        await databaseService.posts.updateOne(
          { _id: new ObjectId(post_id) },
          { $inc: { comment_count: 1 } },
          { session }
        );

        // If this is a reply to another comment (has parent_id),
        // increment the parent comment's comment count
        if (body.parent_id) {
          await databaseService.comments.updateOne(
            { _id: new ObjectId(body.parent_id) },
            { $inc: { comment_count: 1 } },
            { session }
          );
        }
      });

      if (!comment_id) {
        throw new Error('Comment ID is null after transaction');
      }

      const [newComment, post, user] = await Promise.all([
        databaseService.comments.findOne({ _id: comment_id as ObjectId }),
        databaseService.posts.findOne({ _id: new ObjectId(post_id) }),
        databaseService.users.findOne(
          { _id: new ObjectId(user_id) },
          {
            projection: { _id: 1, name: 1, username: 1, avatar: 1 },
            session
          }
        )
      ]);

      const comment = {
        ...newComment,
        user_info: user
      };

      if (postOwner && !(postOwner as ObjectId).equals(new ObjectId(user_id))) {
        this.sendCommentNotification(user_id, (postOwner as ObjectId).toString(), post_id);
      }

      return { comment, post };
    } catch (error) {
      throw error;
    } finally {
      // Kết thúc session bất kể có lỗi hay không
      await session.endSession();
    }
  }

  async updateComment(user_id: string, comment_id: string, body: UpdateCommentRequestBody) {
    const { content } = body;
    const result = await databaseService.comments.findOneAndUpdate(
      {
        _id: new ObjectId(comment_id),
        user_id: new ObjectId(user_id)
      },
      {
        $set: {
          content
        },
        $currentDate: {
          updated_at: true
        }
      },
      {
        returnDocument: 'after'
      }
    );
    if (!result) {
      throw new ErrorWithStatus({ message: 'Comment not found', status: HTTP_STATUS.NOT_FOUND });
    }
    return result;
  }

  async deleteComment(user_id: string, comment_id: string) {
    // Start a session for transaction
    const session = databaseService.client.startSession();

    try {
      // Start transaction
      let deletedComment, updatedCommentCount;

      await session.withTransaction(async () => {
        // Find the comment first to get the post_id
        const comment = await databaseService.comments.findOne(
          {
            _id: new ObjectId(comment_id),
            user_id: new ObjectId(user_id)
          },
          { session }
        );

        if (!comment) {
          throw new ErrorWithStatus({
            message: 'Comment not found',
            status: HTTP_STATUS.NOT_FOUND
          });
        }

        // Store post_id to update comment count later
        const post_id = comment.post_id;

        // Delete the main comment
        const result = await databaseService.comments.findOneAndDelete(
          {
            _id: new ObjectId(comment_id),
            user_id: new ObjectId(user_id)
          },
          { session }
        );

        // Delete all child comments recursively
        await this.deleteChildComments(comment_id, session);

        // Decrease comment_count of the post by 1
        await databaseService.posts.updateOne({ _id: post_id }, { $inc: { comment_count: -1 } }, { session });

        // Get updated comment count
        const commentCountResult = await databaseService.comments.countDocuments({ post_id }, { session });

        deletedComment = result;
        updatedCommentCount = commentCountResult;
      });

      return { deletedComment, updatedCommentCount };
    } catch (error) {
      throw error;
    } finally {
      await session.endSession();
    }
  }

  private async deleteChildComments(parentId: string, session: ClientSession) {
    // Find and delete all immediate children
    const childComments = await databaseService.comments.find({ parent_id: new ObjectId(parentId) }).toArray();

    // If there are children, delete them and their children recursively
    for (const child of childComments) {
      await databaseService.comments.deleteOne({ _id: child._id }, { session });
    }
  }

  async getCommentsByPostId({
    post_id,
    user_id,
    page = 1,
    limit = 10
  }: {
    post_id: string;
    user_id: string;
    page?: number;
    limit?: number;
  }) {
    page = Math.max(1, page);
    limit = Math.max(1, Math.min(limit, 100));
    const skip = (page - 1) * limit;

    const result = await databaseService.comments
      .aggregate([
        {
          $match: {
            post_id: new ObjectId(post_id),
            parent_id: null
          }
        },
        {
          $facet: {
            comments: [
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
                $lookup: {
                  from: 'likes',
                  let: { comment_id: '$_id' },
                  pipeline: [
                    {
                      $match: {
                        $expr: {
                          $and: [{ $eq: ['$target_id', '$$comment_id'] }, { $eq: ['$user_id', new ObjectId(user_id)] }]
                        }
                      }
                    }
                  ],
                  as: 'user_likes'
                }
              },
              {
                $project: {
                  _id: 1,
                  content: 1,
                  post_id: 1,
                  parent_id: 1,
                  created_at: 1,
                  updated_at: 1,
                  user_info: 1,
                  like_count: 1,
                  comment_count: 1,
                  isLiked: { $gt: [{ $size: '$user_likes' }, 0] }
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
            ],
            total: [
              {
                $count: 'count'
              }
            ]
          }
        },
        {
          $project: {
            comments: '$comments',
            total: { $arrayElemAt: ['$total.count', 0] }
          }
        }
      ])
      .toArray();

    const total = result[0]?.total || 0;
    const total_pages = Math.ceil(total / limit);

    return {
      comments: result[0]?.comments || [],
      total,
      page,
      limit,
      total_pages
    };
  }

  async getChildComments({
    comment_id,
    user_id,
    page = 1,
    limit = 10
  }: {
    comment_id: string;
    user_id: string;
    page?: number;
    limit?: number;
  }) {
    page = Math.max(1, page);
    limit = Math.max(1, Math.min(limit, 100));
    const skip = (page - 1) * limit;

    const result = await databaseService.comments
      .aggregate([
        {
          $match: {
            parent_id: new ObjectId(comment_id)
          }
        },
        {
          $facet: {
            comments: [
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
              { $unwind: '$user_info' },
              {
                $lookup: {
                  from: 'likes',
                  let: { commentId: '$_id', userId: new ObjectId(user_id) },
                  pipeline: [
                    {
                      $match: {
                        $expr: {
                          $and: [{ $eq: ['$target_id', '$$commentId'] }, { $eq: ['$user_id', '$$userId'] }]
                        }
                      }
                    },
                    {
                      $project: {
                        _id: 1
                      }
                    }
                  ],
                  as: 'user_like'
                }
              },
              {
                $addFields: {
                  user_liked: {
                    $cond: {
                      if: { $gt: [{ $size: '$user_like' }, 0] },
                      then: true,
                      else: false
                    }
                  }
                }
              },
              {
                $project: {
                  _id: 1,
                  content: 1,
                  post_id: 1,
                  parent_id: 1,
                  created_at: 1,
                  updated_at: 1,
                  user_info: 1,
                  like_count: 1,
                  comment_count: 1,
                  user_liked: 1
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
            ],
            total: [
              {
                $count: 'count'
              }
            ]
          }
        },
        {
          $project: {
            comments: '$comments',
            total: { $arrayElemAt: ['$total.count', 0] }
          }
        }
      ])
      .toArray();

    const total = result[0]?.total || 0;
    const total_pages = Math.ceil(total / limit);

    return {
      comments: result[0]?.comments || [],
      total,
      page,
      limit,
      total_pages
    };
  }
}

const commentsService = new CommentsService();
export default commentsService;
