import { CreateQuestionRequestBody, EditQuestionRequestBody } from '~/models/requests/Question.requests';
import databaseService from './database.services';
import Question from '~/models/schemas/Question.schema';
import { ObjectId } from 'mongodb';
import { NotificationType, QuestionStatus, StudyGroupRole, VoteType } from '~/constants/enums';
import { ErrorWithStatus } from '~/models/Errors';
import HTTP_STATUS from '~/constants/httpStatus';
import cloudinary from '~/configs/cloudinary';
import { extractPublicId } from '~/utils/file';
import QUESTION_MESSAGES from '~/constants/questionMessages';
import notificationsService from './notifications.services';
import { getIO, getUserSocketId } from '~/configs/socket';

class QuestionsService {
  async checkQuestionExists(question_id: string) {
    const question = await databaseService.questions.findOne({
      _id: new ObjectId(question_id)
    });
    if (!question_id) {
      throw new ErrorWithStatus({
        message: QUESTION_MESSAGES.NOT_FOUND,
        status: HTTP_STATUS.NOT_FOUND
      });
    }
    return question;
  }

  async createQuestion({
    user_id,
    role,
    group_id,
    question
  }: {
    user_id: string;
    group_id: string;
    role: StudyGroupRole;
    question: CreateQuestionRequestBody;
  }) {
    const { insertedId } = await databaseService.questions.insertOne(
      new Question({
        title: question.title,
        content: question.content,
        status: role === StudyGroupRole.Admin ? QuestionStatus.Open : QuestionStatus.Pending,
        user_id: new ObjectId(user_id),
        group_id: new ObjectId(group_id),
        approved_at: role === StudyGroupRole.Admin ? new Date() : null,
        medias: question.medias,
        tags: question.tags.map((tag) => new ObjectId(tag)),
        mentions: question.mentions.map((mention) => new ObjectId(mention))
      })
    );

    const io = getIO();

    if (role !== StudyGroupRole.Admin) {
      // Get all admin members of the group
      const adminMembers = await databaseService.study_group_members
        .find({
          group_id: new ObjectId(group_id),
          role: StudyGroupRole.Admin
        })
        .toArray();

      // Create notifications for each admin
      const notificationPromises = adminMembers.map((admin) => {
        const notificationBody = {
          user_id: admin.user_id.toString(),
          actor_id: user_id,
          reference_id: insertedId.toString(),
          type: NotificationType.Group,
          content: `requests to post a question: ${
            question.title.length > 10 ? question.title.substring(0, 10) + '...' : question.title
          }`,
          target_url: `/groups/${group_id}/manage-questions?questionId=${insertedId}`
        };
        const adminSocketId = getUserSocketId(admin.user_id.toString());
        if (adminSocketId) {
          io.to(adminSocketId).emit('new_pending_question', group_id);
        }
        return notificationsService.createNotification(notificationBody);
      });

      // Send notifications in parallel
      Promise.all(notificationPromises);
    }

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

  async deleteQuestion(question_id: string) {
    // Find question before deleting to get media list
    const question = await databaseService.questions.findOne({
      _id: new ObjectId(question_id)
    });

    if (!question) {
      throw new ErrorWithStatus({
        message: 'Question not found',
        status: HTTP_STATUS.NOT_FOUND
      });
    }

    // Delete all files from Cloudinary
    if (question.medias && question.medias.length > 0) {
      const deletePromises = question.medias.map(async (url: string) => {
        const publicId = extractPublicId(url);
        if (publicId) {
          const result = await cloudinary.uploader.destroy(publicId, { invalidate: true });
          if (result.result !== 'ok') {
            console.error(`Failed to delete file ${publicId} from Cloudinary:`, result);
          }
        }
      });

      // Wait for all deletion operations to complete
      await Promise.allSettled(deletePromises);
    }

    // Delete question from database
    const result = await databaseService.questions.findOneAndDelete({
      _id: new ObjectId(question_id)
    });

    return result;
  }

  async approveQuestion(question_id: string) {
    const question = await databaseService.questions.findOneAndUpdate(
      {
        _id: new ObjectId(question_id)
      },
      {
        $set: {
          status: QuestionStatus.Open
        },
        $currentDate: {
          approved_at: true,
          updated_at: true
        }
      },
      {
        returnDocument: 'after'
      }
    );
    return question;
  }

  async rejectQuestion(question_id: string) {
    const question = await databaseService.questions.findOneAndUpdate(
      {
        _id: new ObjectId(question_id)
      },
      {
        $set: {
          status: QuestionStatus.Rejected
        },
        $currentDate: {
          updated_at: true
        }
      },
      {
        returnDocument: 'after'
      }
    );
    return question;
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

  async getQuestionById(question_id: string, user_id: string) {
    const [result] = await databaseService.questions
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

        // Check current user's vote status
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

    return result
      ? {
          ...result,
          upvotes: result.upvotes.count,
          downvotes: result.downvotes.count,
          user_vote: result.user_vote,
          replies: result.replies_count
        }
      : null;
  }

  async getQuestionsByGroupId({
    group_id,
    user_id,
    page,
    limit,
    sortBy,
    status
  }: {
    group_id: string;
    user_id: string;
    page: number;
    limit: number;
    sortBy: 'newest' | 'oldest';
    status: QuestionStatus;
  }) {
    page = Math.max(1, page);
    limit = Math.max(1, Math.min(limit, 100));
    const skip = (page - 1) * limit;
    const sortOrder = sortBy === 'newest' ? -1 : 1;
    const sortField = status === QuestionStatus.Pending ? 'created_at' : 'approved_at';

    const [result, total] = await Promise.all([
      databaseService.questions
        .aggregate([
          {
            $match: {
              group_id: new ObjectId(group_id),
              status
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

          // Check current user's vote status
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
            $sort: { [sortField]: sortOrder }
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

  async getPendingQuestionsCount(group_id: string) {
    const total = await databaseService.questions.countDocuments({
      group_id: new ObjectId(group_id),
      status: QuestionStatus.Pending
    });

    return { total };
  }
}

const questionsService = new QuestionsService();

export default questionsService;
