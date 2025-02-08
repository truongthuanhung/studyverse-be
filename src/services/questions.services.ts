import { CreateQuestionRequestBody, EditQuestionRequestBody } from '~/models/requests/Question.requests';
import databaseService from './database.services';
import Question from '~/models/schemas/Question.schema';
import { ObjectId } from 'mongodb';
import { QuestionStatus, VoteType } from '~/constants/enums';
import { ErrorWithStatus } from '~/models/Errors';
import HTTP_STATUS from '~/constants/httpStatus';

class QuestionsService {
  async checkQuestionExists(question_id: string) {
    const question = await databaseService.questions.findOne({
      _id: new ObjectId(question_id)
    });
    if (!question_id) {
      throw new ErrorWithStatus({
        message: 'Question not found',
        status: HTTP_STATUS.NOT_FOUND
      });
    }
    return question;
  }

  async createQuestion({
    user_id,
    group_id,
    question
  }: {
    user_id: string;
    group_id: string;
    question: CreateQuestionRequestBody;
  }) {
    const { insertedId } = await databaseService.questions.insertOne(
      new Question({
        title: question.title,
        content: question.content,
        status: QuestionStatus.Pending,
        user_id: new ObjectId(user_id),
        group_id: new ObjectId(group_id),
        medias: question.medias,
        tags: question.tags.map((tag) => new ObjectId(tag)),
        mentions: question.mentions.map((mention) => new ObjectId(mention))
      })
    );

    // Get question with additional fields using aggregation
    const [result] = await databaseService.questions
      .aggregate([
        {
          $match: {
            _id: insertedId
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
        { $unwind: { path: '$user_info', preserveNullAndEmptyArrays: true } },

        // Count replies
        {
          $lookup: {
            from: 'replies',
            let: { questionId: '$_id' },
            pipeline: [
              {
                $match: {
                  $expr: { $eq: ['$question_id', '$$questionId'] }
                }
              },
              {
                $count: 'total'
              }
            ],
            as: 'replies_count'
          }
        },
        {
          $addFields: {
            replies_count: {
              $ifNull: [{ $arrayElemAt: ['$replies_count.total', 0] }, 0]
            }
          }
        },

        // Get upvotes and downvotes count
        {
          $lookup: {
            from: 'votes',
            let: { questionId: '$_id' },
            pipeline: [
              {
                $match: {
                  $expr: { $eq: ['$target_id', '$$questionId'] }
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

        // Get current user's vote status
        {
          $lookup: {
            from: 'votes',
            let: { questionId: '$_id', userId: new ObjectId(user_id) },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [{ $eq: ['$target_id', '$$questionId'] }, { $eq: ['$user_id', '$$userId'] }]
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
            user_id: 0,
            votes: 0,
            'upvotes._id': 0,
            'downvotes._id': 0
          }
        }
      ])
      .toArray();

    return {
      ...result,
      upvotes: result.upvotes.count,
      downvotes: result.downvotes.count,
      user_vote: result.user_vote,
      replies: result.replies_count
    };
  }

  async editQuestion(question_id: string, payload: EditQuestionRequestBody) {
    if (!Object.keys(payload).length) {
      throw new ErrorWithStatus({
        message: 'Payload is invalid',
        status: HTTP_STATUS.BAD_REQUEST
      });
    }
    const question = await databaseService.questions.findOneAndUpdate(
      {
        _id: new ObjectId(question_id)
      },
      {
        $set: {
          ...payload,
          tags: [],
          mentions: payload.mentions?.map((mention) => new ObjectId(mention)) || []
        },
        $currentDate: {
          updated_at: true
        }
      },
      {
        returnDocument: 'after'
      }
    );
    if (!question) {
      throw new ErrorWithStatus({
        message: 'Question not found',
        status: HTTP_STATUS.NOT_FOUND
      });
    }
    return question;
  }

  async getQuestionById(question_id: string) {
    const [result] = await Promise.all([
      databaseService.questions
        .aggregate([
          {
            $match: {
              _id: new ObjectId(question_id)
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
            $unwind: {
              path: '$user_info',
              preserveNullAndEmptyArrays: true
            }
          },
          {
            $project: {
              user_id: 0 // Loại bỏ user_id
            }
          }
        ])
        .toArray()
    ]);

    return result[0] || null;
  }

  async getQuestionsByGroupId(
    group_id: string,
    user_id: string,
    page: number = 1,
    limit: number = 10,
    sortBy: 'newest' | 'oldest' = 'newest'
  ) {
    page = Math.max(1, page);
    limit = Math.max(1, Math.min(limit, 100));
    const skip = (page - 1) * limit;
    const sortOrder = sortBy === 'newest' ? -1 : 1;

    const [result, total] = await Promise.all([
      databaseService.questions
        .aggregate([
          {
            $match: {
              group_id: new ObjectId(group_id)
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
          { $unwind: { path: '$user_info', preserveNullAndEmptyArrays: true } },

          // Đếm số lượng replies
          {
            $lookup: {
              from: 'replies',
              let: { questionId: '$_id' },
              pipeline: [
                {
                  $match: {
                    $expr: { $eq: ['$question_id', '$$questionId'] }
                  }
                },
                {
                  $count: 'total'
                }
              ],
              as: 'replies_count'
            }
          },
          {
            $addFields: {
              replies_count: {
                $ifNull: [{ $arrayElemAt: ['$replies_count.total', 0] }, 0]
              }
            }
          },

          // Lấy số lượng upvotes và downvotes
          {
            $lookup: {
              from: 'votes',
              let: { questionId: '$_id' },
              pipeline: [
                {
                  $match: {
                    $expr: { $eq: ['$target_id', '$$questionId'] }
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
              let: { questionId: '$_id', userId: new ObjectId(user_id) },
              pipeline: [
                {
                  $match: {
                    $expr: {
                      $and: [{ $eq: ['$target_id', '$$questionId'] }, { $eq: ['$user_id', '$$userId'] }]
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
              user_id: 0,
              votes: 0,
              'upvotes._id': 0,
              'downvotes._id': 0
            }
          },
          {
            $sort: { created_at: sortOrder }
          },
          {
            $skip: skip
          },
          {
            $limit: limit
          }
        ])
        .toArray(),
      databaseService.questions.countDocuments({
        group_id: new ObjectId(group_id)
      })
    ]);

    const total_pages = Math.ceil(total / limit);

    return {
      questions: result.map((q) => ({
        ...q,
        upvotes: q.upvotes.count,
        downvotes: q.downvotes.count,
        user_vote: q.user_vote,
        replies: q.replies_count
      })),
      total,
      page,
      limit,
      total_pages
    };
  }
}

const questionsService = new QuestionsService();

export default questionsService;
