import { CreateReplyRequestBody, EditReplyRequestBody } from '~/models/requests/Reply.requests';
import databaseService from './database.services';
import Reply from '~/models/schemas/Reply.schema';
import { ObjectId } from 'mongodb';
import { ErrorWithStatus } from '~/models/Errors';
import HTTP_STATUS from '~/constants/httpStatus';
import { NotificationType, VoteType } from '~/constants/enums';
import notificationsService from './notifications.services';

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

    const question = await databaseService.questions.findOne({
      _id: new ObjectId(question_id)
    });

    if (question && question.user_id.toString() !== user_id) {
      notificationsService.createNotification({
        user_id: question.user_id.toString(),
        actor_id: user_id,
        reference_id: question_id,
        type: NotificationType.Group,
        content: `replied to your question`,
        target_url: `/groups/${question.group_id}/questions/${question_id}?replyId=${reply._id}`,
        group_id: question.group_id.toString()
      });
    }

    return {
      ...reply,
      upvotes: 0,
      downvotes: 0,
      user_vote: null
    };
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
    user_id,
    page = 1,
    limit = 10
  }: {
    question_id: string;
    user_id: string;
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
          { $unwind: '$user_info' },

          // Lấy số lượng upvotes và downvotes cho mỗi reply
          {
            $lookup: {
              from: 'votes',
              let: { replyId: '$_id' },
              pipeline: [
                {
                  $match: {
                    $expr: { $eq: ['$target_id', '$$replyId'] }
                  }
                },
                {
                  $group: {
                    _id: '$type',
                    count: { $sum: 1 }
                  }
                }
              ],
              as: 'votes'
            }
          },
          {
            $addFields: {
              upvotes: {
                $ifNull: [
                  {
                    $arrayElemAt: [
                      {
                        $filter: {
                          input: '$votes',
                          as: 'vote',
                          cond: { $eq: ['$$vote._id', VoteType.Upvote] }
                        }
                      },
                      0
                    ]
                  },
                  { count: 0 }
                ]
              },
              downvotes: {
                $ifNull: [
                  {
                    $arrayElemAt: [
                      {
                        $filter: {
                          input: '$votes',
                          as: 'vote',
                          cond: { $eq: ['$$vote._id', VoteType.Downvote] }
                        }
                      },
                      0
                    ]
                  },
                  { count: 0 }
                ]
              }
            }
          },

          // Kiểm tra trạng thái vote của người dùng hiện tại
          {
            $lookup: {
              from: 'votes',
              let: { replyId: '$_id', userId: new ObjectId(user_id) },
              pipeline: [
                {
                  $match: {
                    $expr: {
                      $and: [{ $eq: ['$target_id', '$$replyId'] }, { $eq: ['$user_id', '$$userId'] }]
                    }
                  }
                },
                {
                  $project: {
                    _id: 0,
                    type: 1
                  }
                }
              ],
              as: 'user_vote'
            }
          },
          {
            $addFields: {
              user_vote: {
                $ifNull: [{ $arrayElemAt: ['$user_vote.type', 0] }, null]
              }
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
              upvotes: 1,
              downvotes: 1,
              user_vote: 1
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
      replies: result.map((r) => ({
        ...r,
        upvotes: r.upvotes.count,
        downvotes: r.downvotes.count,
        user_vote: r.user_vote
      })),
      total,
      page,
      limit,
      total_pages
    };
  }

  async getReplyById({ reply_id, user_id }: { reply_id: string; user_id: string }) {
    const result = await databaseService.replies
      .aggregate([
        {
          $match: {
            _id: new ObjectId(reply_id)
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
        { $unwind: '$user_info' },

        // Lấy số lượng upvotes và downvotes
        {
          $lookup: {
            from: 'votes',
            let: { replyId: '$_id' },
            pipeline: [
              {
                $match: {
                  $expr: { $eq: ['$target_id', '$$replyId'] }
                }
              },
              {
                $group: {
                  _id: '$type',
                  count: { $sum: 1 }
                }
              }
            ],
            as: 'votes'
          }
        },
        {
          $addFields: {
            upvotes: {
              $ifNull: [
                {
                  $arrayElemAt: [
                    {
                      $filter: {
                        input: '$votes',
                        as: 'vote',
                        cond: { $eq: ['$$vote._id', VoteType.Upvote] }
                      }
                    },
                    0
                  ]
                },
                { count: 0 }
              ]
            },
            downvotes: {
              $ifNull: [
                {
                  $arrayElemAt: [
                    {
                      $filter: {
                        input: '$votes',
                        as: 'vote',
                        cond: { $eq: ['$$vote._id', VoteType.Downvote] }
                      }
                    },
                    0
                  ]
                },
                { count: 0 }
              ]
            }
          }
        },

        // Kiểm tra trạng thái vote của người dùng hiện tại
        {
          $lookup: {
            from: 'votes',
            let: { replyId: '$_id', userId: new ObjectId(user_id) },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [{ $eq: ['$target_id', '$$replyId'] }, { $eq: ['$user_id', '$$userId'] }]
                  }
                }
              },
              {
                $project: {
                  _id: 0,
                  type: 1
                }
              }
            ],
            as: 'user_vote'
          }
        },
        {
          $addFields: {
            user_vote: {
              $ifNull: [{ $arrayElemAt: ['$user_vote.type', 0] }, null]
            }
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
            upvotes: 1,
            downvotes: 1,
            user_vote: 1
          }
        }
      ])
      .toArray();

    if (result.length === 0) {
      throw new ErrorWithStatus({ status: HTTP_STATUS.NOT_FOUND, message: 'Reply not found' });
    }

    const reply = result[0];
    return {
      ...reply,
      upvotes: reply.upvotes.count,
      downvotes: reply.downvotes.count,
      user_vote: reply.user_vote
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
