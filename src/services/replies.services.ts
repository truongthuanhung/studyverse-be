import { CreateReplyRequestBody, EditReplyRequestBody } from '~/models/requests/Reply.requests';
import databaseService from './database.services';
import Reply from '~/models/schemas/Reply.schema';
import { ObjectId } from 'mongodb';
import { ErrorWithStatus } from '~/models/Errors';
import HTTP_STATUS from '~/constants/httpStatus';
import { EditQuestionRequestBody } from '~/models/requests/Question.requests';

class RepliesService {
  async checkReplyExists(reply_id: string) {
    const reply = await databaseService.replies.findOne({
      _id: new ObjectId(reply_id)
    });
    if (!reply) {
      throw new ErrorWithStatus({
        message: 'Reply not found',
        status: HTTP_STATUS.NOT_FOUND
      });
    }
    return reply;
  }

  async createReply({
    user_id,
    question_id,
    body
  }: {
    user_id: string;
    question_id: string;
    body: CreateReplyRequestBody;
  }) {
    const { content, medias, parent_id } = body;
    const result = await databaseService.replies.insertOne(
      new Reply({
        content,
        medias: medias || [],
        user_id: new ObjectId(user_id),
        question_id: new ObjectId(question_id),
        parent_id: parent_id ? new ObjectId(parent_id) : null
      })
    );

    if (!result.insertedId) {
      throw new Error('Failed to create reply');
    }

    const [reply] = await databaseService.replies
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
        { $unwind: '$user_info' },
        {
          $lookup: {
            from: 'replies',
            let: { questionId: '$question_id' },
            pipeline: [{ $match: { $expr: { $eq: ['$question_id', '$$questionId'] } } }, { $count: 'reply_count' }],
            as: 'reply_count_info'
          }
        },
        {
          $addFields: {
            reply_count: { $ifNull: [{ $arrayElemAt: ['$reply_count_info.reply_count', 0] }, 0] }
          }
        },
        {
          $project: {
            _id: 1,
            content: 1,
            question_id: 1,
            medias: 1,
            parent_id: 1,
            created_at: 1,
            updated_at: 1,
            user_info: 1,
            reply_count: 1
          }
        }
      ])
      .toArray();

    return reply;
  }

  async editReply(reply_id: string, payload: EditReplyRequestBody) {
    if (!Object.keys(payload).length) {
      throw new ErrorWithStatus({
        message: 'Payload is invalid',
        status: HTTP_STATUS.BAD_REQUEST
      });
    }
    const result = await databaseService.replies.updateOne({ _id: new ObjectId(reply_id) }, { $set: { ...payload } });

    if (result.matchedCount === 0) {
      throw new ErrorWithStatus({ message: 'Reply not found', status: HTTP_STATUS.NOT_FOUND });
    }

    const [updatedReply] = await databaseService.replies
      .aggregate([
        {
          $match: { _id: new ObjectId(reply_id) }
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
        { $unwind: '$user_info' },
        {
          $lookup: {
            from: 'replies',
            let: { questionId: '$question_id' },
            pipeline: [{ $match: { $expr: { $eq: ['$question_id', '$$questionId'] } } }, { $count: 'reply_count' }],
            as: 'reply_count_info'
          }
        },
        {
          $addFields: {
            reply_count: { $ifNull: [{ $arrayElemAt: ['$reply_count_info.reply_count', 0] }, 0] }
          }
        },
        {
          $project: {
            _id: 1,
            content: 1,
            question_id: 1,
            medias: 1,
            parent_id: 1,
            created_at: 1,
            updated_at: 1,
            user_info: 1,
            reply_count: 1
          }
        }
      ])
      .toArray();

    if (!updatedReply) {
      throw new Error('Failed to retrieve updated reply');
    }

    return updatedReply;
  }

  async getRepliesByQuestionId({
    question_id,
    page = 1,
    limit = 10
  }: {
    question_id: string;
    page?: number;
    limit?: number;
  }) {
    page = Math.max(1, page);
    limit = Math.max(1, Math.min(limit, 100));
    const skip = (page - 1) * limit;

    const [result, total] = await Promise.all([
      databaseService.replies
        .aggregate([
          {
            $match: {
              question_id: new ObjectId(question_id)
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
              question_id: 1,
              medias: 1,
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
      databaseService.replies.countDocuments({
        question_id: new ObjectId(question_id)
      })
    ]);

    const total_pages = Math.ceil(total / limit);

    return {
      replies: result,
      total,
      page,
      limit,
      total_pages
    };
  }

  async deleteReply(reply_id: string) {
    const result = await databaseService.replies.findOneAndDelete({
      _id: new ObjectId(reply_id)
    });

    if (!result) {
      throw new ErrorWithStatus({
        message: 'Reply not found',
        status: HTTP_STATUS.NOT_FOUND
      });
    }

    const question_id = result.question_id;

    const [replyCountInfo] = await databaseService.replies
      .aggregate([
        {
          $match: { question_id: question_id }
        },
        {
          $count: 'reply_count'
        }
      ])
      .toArray();

    const reply_count = replyCountInfo ? replyCountInfo.reply_count : 0;

    return {
      deleted_reply: result,
      reply_count
    };
  }
}

const repliesService = new RepliesService();

export default repliesService;
