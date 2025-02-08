import { CreateCommentRequestBody, UpdateCommentRequestBody } from '~/models/requests/Comment.requests';
import databaseService from './database.services';
import Comment from '~/models/schemas/Comment.schema';
import { ClientSession, ObjectId } from 'mongodb';
import { ErrorWithStatus } from '~/models/Errors';
import HTTP_STATUS from '~/constants/httpStatus';

class CommentsService {
  async checkCommentExists(comment_id: string) {
    const comment = await databaseService.comments.findOne({ _id: new ObjectId(comment_id) });
    if (!comment) {
      throw new ErrorWithStatus({ message: 'Comment not found', status: HTTP_STATUS.NOT_FOUND });
    }
  }

  async commentOnPost(user_id: string, body: CreateCommentRequestBody) {
    const commentData = new Comment({
      ...body,
      user_id: new ObjectId(user_id),
      post_id: new ObjectId(body.post_id),
      parent_id: body.parent_id ? new ObjectId(body.parent_id) : null
    });

    // Tạo comment mới
    const result = await databaseService.comments.insertOne(commentData);

    if (!result.insertedId) {
      throw new Error('Failed to create comment');
    }

    // Lấy thông tin comment vừa được tạo
    const [comment] = await databaseService.comments
      .aggregate([
        {
          $match: { _id: result.insertedId }
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
            content: 1,
            post_id: 1,
            parent_id: 1,
            created_at: 1,
            updated_at: 1,
            user_info: 1
          }
        }
      ])
      .toArray();

    // Đếm số lượng comment cho bài viết
    const comment_count = await databaseService.comments.countDocuments({
      post_id: new ObjectId(body.post_id)
    });

    // Trả về comment kèm comment_count
    return { comment, comment_count };
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
      await session.withTransaction(async () => {
        // Delete the main comment
        const result = await databaseService.comments.findOneAndDelete(
          {
            _id: new ObjectId(comment_id),
            user_id: new ObjectId(user_id)
          },
          { session }
        );

        if (!result) {
          throw new ErrorWithStatus({
            message: 'Comment not found',
            status: HTTP_STATUS.NOT_FOUND
          });
        }

        // Delete all child comments recursively
        await this.deleteChildComments(comment_id, session);

        return result;
      });
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

      // Recursively delete children of this comment
      await this.deleteChildComments(child._id.toString(), session);
    }
  }

  async getCommentsByPostId(post_id: string, page: number = 1, limit: number = 10) {
    page = Math.max(1, page);
    limit = Math.max(1, Math.min(limit, 100));
    const skip = (page - 1) * limit;

    const [result, total] = await Promise.all([
      databaseService.comments
        .aggregate([
          {
            $match: {
              post_id: new ObjectId(post_id)
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
              content: 1,
              post_id: 1,
              parent_id: 1,
              created_at: 1,
              updated_at: 1,
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
      databaseService.comments.countDocuments({
        post_id: new ObjectId(post_id)
      })
    ]);

    const total_pages = Math.ceil(total / limit);

    return {
      comments: result,
      total,
      page,
      limit,
      total_pages
    };
  }
}

const commentsService = new CommentsService();
export default commentsService;
