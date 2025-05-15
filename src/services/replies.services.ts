import { CreateReplyRequestBody, EditReplyRequestBody } from '~/models/requests/Reply.requests';
import databaseService from './database.services';
import Reply from '~/models/schemas/Reply.schema';
import { ObjectId } from 'mongodb';
import { ErrorWithStatus } from '~/models/Errors';
import HTTP_STATUS from '~/constants/httpStatus';
import { NotificationType, ReplyApprovedByType, VoteType } from '~/constants/enums';
import notificationsService from './notifications.services';
import studyGroupsService from './studyGroups.services';
import { POINTS } from '~/constants/points';

class RepliesService {
  private async deleteChildReplies(question_id: ObjectId, parent_id: ObjectId) {
    // Tìm và xóa tất cả child replies
    const deleteResult = await databaseService.replies.deleteMany({
      question_id,
      parent_id
    });

    // Tính toán số lượng replies bị xóa (1 cho reply cha + số lượng con)
    const totalDeletedReplies = deleteResult.deletedCount + 1; // +1 for the parent reply

    // Cập nhật reply_count trong question
    const updatedQuestion = await databaseService.questions.findOneAndUpdate(
      { _id: question_id },
      {
        $inc: { reply_count: -totalDeletedReplies }
      },
      {
        returnDocument: 'after',
        projection: { reply_count: 1, upvotes: 1, downvotes: 1 }
      }
    );

    if (!updatedQuestion) {
      throw new ErrorWithStatus({
        message: 'Question not found',
        status: HTTP_STATUS.NOT_FOUND
      });
    }

    return {
      question: updatedQuestion,
      deletedCount: deleteResult.deletedCount
    };
  }

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
    const questionObjectId = new ObjectId(question_id);
    const userObjectId = new ObjectId(user_id);

    // Tạo reply mới
    const newReply = new Reply({
      content,
      medias: medias || [],
      user_id: userObjectId,
      question_id: questionObjectId,
      parent_id: parent_id ? new ObjectId(parent_id) : null
    });

    // Thực hiện song song:
    // 1. Lưu reply mới
    // 2. Cập nhật reply_count trong question và lấy thông tin question
    const [insertResult, question, _] = await Promise.all([
      databaseService.replies.insertOne(newReply),
      databaseService.questions.findOneAndUpdate(
        { _id: questionObjectId },
        { $inc: { reply_count: 1 } },
        { returnDocument: 'after' }
      ),
      newReply.parent_id !== null &&
        databaseService.replies.findOneAndUpdate(
          { _id: new ObjectId(newReply.parent_id) },
          { $inc: { reply_count: 1 } },
          { returnDocument: 'after' }
        )
    ]);

    if (!insertResult.insertedId) {
      throw new Error('Failed to create reply');
    }

    // Lấy thông tin user (có thể cache thông tin này nếu cần)
    const user = await databaseService.users.findOne(
      { _id: userObjectId },
      { projection: { _id: 1, name: 1, username: 1, avatar: 1 } }
    );

    // Thực hiện song song các tác vụ phụ (không cần đợi)
    if (question) {
      Promise.all([
        studyGroupsService.addPointsToMember({
          user_id: user_id,
          group_id: question.group_id.toString(),
          pointsToAdd: POINTS.REPLY_CREATED
        }),

        question.user_id.toString() !== user_id
          ? notificationsService.createNotification({
              user_id: question.user_id.toString(),
              actor_id: user_id,
              reference_id: question_id,
              type: NotificationType.Group,
              content: `replied to your question`,
              target_url: `/groups/${question.group_id}/questions/${question_id}?replyId=${insertResult.insertedId}`,
              group_id: question.group_id.toString()
            })
          : Promise.resolve()
      ]);
    }

    return {
      _id: insertResult.insertedId,
      content,
      question_id: questionObjectId,
      medias: medias || [],
      parent_id: parent_id ? new ObjectId(parent_id) : null,
      created_at: newReply.created_at,
      updated_at: newReply.updated_at,
      user_info: user,
      reply_count: 0,
      upvotes: 0,
      downvotes: 0,
      user_vote: null,
      question_info: {
        reply_count: question?.reply_count,
        upvotes: question?.upvotes,
        downvotes: question?.downvotes
      }
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

    const pipeline = [
      {
        $match: {
          question_id: new ObjectId(question_id),
          parent_id: null
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
          user_vote: 1,
          reply_count: 1,
          approved_by_user: 1,
          approved_by_teacher: 1
        }
      },
      {
        $sort: { created_at: -1 }
      },
      {
        $facet: {
          replies: [{ $skip: skip }, { $limit: limit }],
          totalCount: [{ $count: 'count' }]
        }
      }
    ];

    const result = await databaseService.replies.aggregate(pipeline).toArray();

    // Extract data from facet results
    const replies = result[0].replies || [];
    const totalCount = result[0].totalCount[0]?.count || 0;
    const total_pages = Math.ceil(totalCount / limit);

    return {
      replies,
      total: totalCount,
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
            user_vote: 1,
            approved_by_user: 1,
            approved_by_teacher: 1
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

    const { question, deletedCount } = await this.deleteChildReplies(result.question_id, result._id);

    return {
      deleted_reply: result,
      question_info: question,
      child_replies_deleted: deletedCount
    };
  }

  async approveReply(reply_id: string, type: ReplyApprovedByType) {
    const updateData: any = {
      updated_at: new Date()
    };

    if (type === ReplyApprovedByType.User) {
      updateData.approved_by_user = true;
    } else if (type === ReplyApprovedByType.Teacher) {
      updateData.approved_by_teacher = true;
    }

    const updatedReply = await databaseService.replies.findOneAndUpdate(
      { _id: new ObjectId(reply_id) },
      { $set: updateData },
      { returnDocument: 'after' } // Trả về document sau khi cập nhật
    );

    if (!updatedReply) {
      throw new Error('Reply not found or cannot be updated');
    }

    return updatedReply;
  }

  async getChildReplies({
    reply_id,
    user_id,
    page = 1,
    limit = 10
  }: {
    reply_id: string;
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
              parent_id: new ObjectId(reply_id)
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
              user_vote: 1,
              approved_by_user: 1,
              approved_by_teacher: 1
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
        parent_id: new ObjectId(reply_id)
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
}

const repliesService = new RepliesService();

export default repliesService;
