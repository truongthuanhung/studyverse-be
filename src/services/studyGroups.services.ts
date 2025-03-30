import databaseService from './database.services';
import StudyGroup from '~/models/schemas/StudyGroup.schema';
import { ClientSession, ObjectId } from 'mongodb';
import StudyGroupMember from '~/models/schemas/StudyGroupMember.schema';
import { NotificationType, StudyGroupRole } from '~/constants/enums';
import { ErrorWithStatus } from '~/models/Errors';
import HTTP_STATUS from '~/constants/httpStatus';
import JoinRequest from '~/models/schemas/JoinRequest.schema';
import { CreateStudyGroupRequestBody, EditStudyGroupRequestBody } from '~/models/requests/StudyGroup.requests';
import notificationsService from './notifications.services';
import { getIO, getUserSocketId } from '~/configs/socket';
import badgesService from './badges.services';
import { STUDY_GROUP_MESSAGES, USERS_MESSAGES } from '~/constants/messages';

class StudyGroupsService {
  async isGroupExists(group_id: string) {
    const group = await databaseService.study_groups.findOne({ _id: new ObjectId(group_id) });
    return Boolean(group);
  }

  async isJoinRequestExists(join_request_id: string) {
    const request = await databaseService.join_requests.findOne({ _id: new ObjectId(join_request_id) });
    return Boolean(request);
  }

  async checkUserJoinRequest(user_id: string, group_id: string) {
    const request = await databaseService.join_requests.findOne({
      user_id: new ObjectId(user_id),
      group_id: new ObjectId(group_id)
    });
    return Boolean(request);
  }

  async checkUserInGroup(user_id: string, group_id: string) {
    const member = await databaseService.study_group_members.findOne({
      user_id: new ObjectId(user_id),
      group_id: new ObjectId(group_id)
    });
    return Boolean(member);
  }

  async createStudyGroup(user_id: string, payload: CreateStudyGroupRequestBody) {
    const session = databaseService.client.startSession();
    try {
      session.startTransaction();

      const group_id = new ObjectId();

      const result = await databaseService.study_groups.insertOne(
        new StudyGroup({
          ...payload,
          _id: group_id,
          user_id: new ObjectId(user_id)
        }),
        { session }
      );

      await databaseService.study_group_members.insertOne(
        new StudyGroupMember({
          user_id: new ObjectId(user_id),
          group_id,
          role: StudyGroupRole.Admin
        }),
        { session }
      );

      await session.commitTransaction();
      return result;
    } catch (error) {
      await session.abortTransaction();
      console.error('Error creating study group:', error);
      throw new Error('Failed to create study group. Please try again.');
    } finally {
      session.endSession();
    }
  }

  async editStudyGroup(group_id: string, payload: EditStudyGroupRequestBody) {
    if (!Object.keys(payload).length) {
      throw new ErrorWithStatus({
        message: 'Payload is invalid',
        status: HTTP_STATUS.BAD_REQUEST
      });
    }
    const group = await databaseService.study_groups.findOneAndUpdate(
      {
        _id: new ObjectId(group_id)
      },
      {
        $set: {
          ...payload
        },
        $currentDate: {
          updated_at: true
        }
      },
      {
        returnDocument: 'after'
      }
    );
    if (!group) {
      throw new ErrorWithStatus({
        message: 'Group not found',
        status: HTTP_STATUS.NOT_FOUND
      });
    }
    return group;
  }

  async getStudyGroups({
    user_id,
    type = 'all',
    page,
    limit
  }: {
    user_id: string;
    type?: string;
    page: number;
    limit: number;
  }) {
    page = Math.max(1, page);
    limit = Math.max(1, Math.min(limit, 100));
    const skip = (page - 1) * limit;

    const matchStage: any = {
      user_id: new ObjectId(user_id)
    };

    if (type !== 'all') {
      matchStage.role = type === 'admin' ? StudyGroupRole.Admin : StudyGroupRole.Member;
    }

    const [result] = await databaseService.study_group_members
      .aggregate([
        { $match: matchStage },
        {
          $lookup: {
            from: 'study_groups',
            localField: 'group_id',
            foreignField: '_id',
            as: 'groupDetails'
          }
        },
        { $unwind: '$groupDetails' }, // Đặt điều kiện unwind trước facet để đảm bảo đếm chính xác
        {
          $facet: {
            study_groups: [
              {
                $lookup: {
                  from: 'study_group_members',
                  localField: 'group_id',
                  foreignField: 'group_id',
                  as: 'members'
                }
              },
              {
                $project: {
                  _id: '$groupDetails._id',
                  name: '$groupDetails.name',
                  privacy: '$groupDetails.privacy',
                  description: '$groupDetails.description',
                  cover_photo: '$groupDetails.cover_photo',
                  role: '$role',
                  joined_at: '$created_at',
                  member_count: { $size: '$members' }
                }
              },
              { $sort: { joined_at: -1 } },
              { $skip: skip },
              { $limit: limit }
            ],
            total: [{ $count: 'count' }]
          }
        }
      ])
      .toArray();

    const studyGroups = result.study_groups || [];
    const total = result.total.length > 0 ? result.total[0].count : 0;
    const totalPages = Math.ceil(total / limit);

    return {
      study_groups: studyGroups,
      pagination: {
        total,
        page,
        limit,
        totalPages
      }
    };
  }

  async getStudyGroupById(user_id: string, group_id: string) {
    const pipeline = [
      // Filter study_groups by id
      { $match: { _id: new ObjectId(group_id) } },

      // Join with study_group_members to get user's role
      {
        $lookup: {
          from: 'study_group_members',
          let: { groupId: '$_id' },
          pipeline: [
            {
              $match: {
                $expr: { $and: [{ $eq: ['$group_id', '$$groupId'] }, { $eq: ['$user_id', new ObjectId(user_id)] }] }
              }
            },
            { $project: { _id: 0, role: 1 } }
          ],
          as: 'userRole'
        }
      },

      // Join with study_group_members to count members
      {
        $lookup: {
          from: 'study_group_members',
          let: { groupId: '$_id' },
          pipeline: [{ $match: { $expr: { $eq: ['$group_id', '$$groupId'] } } }, { $count: 'memberCount' }],
          as: 'memberInfo'
        }
      },

      // Project the output data
      {
        $project: {
          _id: 1,
          name: 1,
          privacy: 1,
          user_id: 1,
          description: 1,
          cover_photo: 1,
          created_at: 1,
          updated_at: 1,
          role: { $arrayElemAt: ['$userRole.role', 0] }, // Get user's role
          member_count: { $arrayElemAt: ['$memberInfo.memberCount', 0] } // Get member count
        }
      }
    ];

    // Execute pipeline
    const result = await databaseService.study_groups.aggregate(pipeline).toArray();

    // Process the result
    if (result.length > 0) {
      const group = result[0];

      // Assign Guest role if no role exists
      group.role = group.role ?? StudyGroupRole.Guest;

      // If role is Guest, check for existing join request
      if (group.role === StudyGroupRole.Guest) {
        const joinRequest = await databaseService.join_requests.findOne({
          user_id: new ObjectId(user_id),
          group_id: new ObjectId(group_id)
        });

        group.hasRequested = !!joinRequest;
      }

      return group;
    }

    // Return null if group not found
    return null;
  }

  async getUserRoleInGroup(user_id: string, group_id: string) {
    const result = await databaseService.study_group_members.findOne({
      user_id: new ObjectId(user_id),
      group_id: new ObjectId(group_id)
    });

    if (result?.role === StudyGroupRole.Admin) {
      return 'admin';
    }
    if (result?.role === StudyGroupRole.Member) {
      return 'member';
    }
    return null;
  }

  async requestToJoinGroup(user_id: string, group_id: string) {
    const [isUserJoined, isUserRequested] = await Promise.all([
      this.checkUserInGroup(user_id, group_id),
      this.checkUserJoinRequest(user_id, group_id)
    ]);

    if (isUserJoined) {
      throw new ErrorWithStatus({
        message: 'User is already a member of this group.',
        status: HTTP_STATUS.BAD_REQUEST
      });
    }

    if (isUserRequested) {
      throw new ErrorWithStatus({
        status: HTTP_STATUS.CONFLICT,
        message: 'User has already requested'
      });
    }

    const result = await databaseService.join_requests.insertOne(
      new JoinRequest({
        user_id: new ObjectId(user_id),
        group_id: new ObjectId(group_id)
      })
    );

    await notificationsService.emitToAdminGroup({
      group_id: group_id,
      event_name: 'new_join_request',
      body: {
        actor_id: user_id,
        reference_id: result.insertedId.toString(),
        type: NotificationType.Group,
        content: `request to join group`,
        target_url: `/groups/${group_id}/requests?requestId=${result.insertedId}`,
        group_id
      }
    });

    return result;
  }

  async cancelJoinRequest(user_id: string, group_id: string) {
    const isUserJoined = await this.checkUserInGroup(user_id, group_id);

    if (isUserJoined) {
      throw new ErrorWithStatus({
        message: 'User is already a member of this group.',
        status: HTTP_STATUS.BAD_REQUEST
      });
    }

    const result = await databaseService.join_requests.findOneAndDelete({
      user_id: new ObjectId(user_id),
      group_id: new ObjectId(group_id)
    });

    if (!result) {
      throw new ErrorWithStatus({
        message: 'User has not requested yet',
        status: HTTP_STATUS.BAD_REQUEST
      });
    }
    // Create notifications for each admin
    const io = getIO();
    const adminMembers = await databaseService.study_group_members
      .find({
        group_id: new ObjectId(group_id),
        role: StudyGroupRole.Admin
      })
      .toArray();
    const notificationPromises = adminMembers.map((admin) => {
      const adminSocketId = getUserSocketId(admin.user_id.toString());
      if (adminSocketId) {
        io.to(adminSocketId).emit('cancel_join_request', group_id);
      }
    });

    // Send notifications in parallel
    Promise.all(notificationPromises);

    return result;
  }

  async acceptJoinRequest(user_id: string, join_request_id: string) {
    const join_request = await databaseService.join_requests.findOne({
      _id: new ObjectId(join_request_id)
    });

    if (!join_request) {
      throw new ErrorWithStatus({
        status: HTTP_STATUS.NOT_FOUND,
        message: 'Join request not found'
      });
    }

    const { user_id: request_user_id, group_id } = join_request;

    const session = databaseService.client.startSession();
    try {
      session.startTransaction();

      await databaseService.join_requests.findOneAndDelete({ _id: new ObjectId(join_request_id) }, { session });

      await databaseService.study_group_members.insertOne(
        new StudyGroupMember({
          user_id: new ObjectId(request_user_id),
          group_id: new ObjectId(group_id),
          role: StudyGroupRole.Member
        }),
        { session }
      );

      await databaseService.study_groups.updateOne({ _id: new ObjectId(group_id) }, { $inc: { member: 1 } });

      await session.commitTransaction();
      session.endSession();
      databaseService.notifications.deleteMany({
        reference_id: new ObjectId(join_request_id),
        type: NotificationType.Group
      });
      return { message: 'Join request accepted and user added to the group.' };
    } catch (error) {
      await session.abortTransaction();
      session.endSession();
      console.error('Error accepting join request:', error);
      throw new ErrorWithStatus({
        status: HTTP_STATUS.INTERNAL_SERVER_ERROR,
        message: 'Failed to accept join request.'
      });
    }
  }

  async declineJoinRequest(user_id: string, join_request_id: string) {
    const join_request = await databaseService.join_requests.findOne({
      _id: new ObjectId(join_request_id)
    });

    if (!join_request) {
      throw new ErrorWithStatus({
        status: HTTP_STATUS.NOT_FOUND,
        message: 'Join request not found'
      });
    }

    await databaseService.join_requests.findOneAndDelete({
      _id: new ObjectId(join_request_id)
    });

    databaseService.notifications.deleteMany({
      reference_id: new ObjectId(join_request_id),
      type: NotificationType.Group
    });

    return { message: 'Join request declined.' };
  }

  async getJoinRequests(group_id: string) {
    const join_requests = await databaseService.join_requests
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
            as: 'user_details'
          }
        },
        {
          $unwind: '$user_details'
        },
        {
          $project: {
            _id: 1,
            group_id: 1,
            created_at: 1,
            user_info: {
              _id: '$user_details._id',
              name: '$user_details.name',
              username: '$user_details.username',
              avatar: '$user_details.avatar'
            }
          }
        }
      ])
      .toArray();

    return join_requests;
  }

  async getJoinRequestsCount(group_id: string) {
    const total = await databaseService.join_requests.countDocuments({
      group_id: new ObjectId(group_id)
    });

    return { total };
  }

  async getMembers(group_id: string, role?: StudyGroupRole) {
    const matchStage: any = {
      $match: {
        group_id: new ObjectId(group_id)
      }
    };

    // Nếu có tham số role, thêm điều kiện lọc
    if (role !== undefined) {
      matchStage.$match.role = role;
    }

    const members = await databaseService.study_group_members
      .aggregate([
        matchStage,
        {
          $lookup: {
            from: 'users',
            localField: 'user_id',
            foreignField: '_id',
            as: 'user_details'
          }
        },
        { $unwind: '$user_details' },
        {
          $project: {
            _id: 1,
            group_id: 1,
            role: 1,
            created_at: 1,
            user_info: {
              _id: '$user_details._id',
              name: '$user_details.name',
              username: '$user_details.username',
              avatar: '$user_details.avatar'
            }
          }
        }
      ])
      .toArray();

    return members;
  }

  async promoteMember({
    group_id,
    user_id,
    current_user_id
  }: {
    group_id: string;
    user_id: string;
    current_user_id: string;
  }) {
    if (user_id === current_user_id) {
      throw new ErrorWithStatus({
        message: 'Cannot remove yourself',
        status: HTTP_STATUS.CONFLICT
      });
    }
    const groupObjectId = new ObjectId(group_id);
    const userObjectId = new ObjectId(user_id);

    const result = await databaseService.study_group_members.findOneAndUpdate(
      { group_id: groupObjectId, user_id: userObjectId, role: StudyGroupRole.Member },
      {
        $set: { role: StudyGroupRole.Admin, updated_at: new Date() }
      },
      { returnDocument: 'after' }
    );

    if (!result) {
      throw new ErrorWithStatus({
        message: 'Member not found',
        status: HTTP_STATUS.NOT_FOUND
      });
    }

    return result;
  }

  async demoteMember({
    group_id,
    user_id,
    current_user_id
  }: {
    group_id: string;
    user_id: string;
    current_user_id: string;
  }) {
    if (user_id === current_user_id) {
      throw new ErrorWithStatus({
        message: 'Cannot remove yourself',
        status: HTTP_STATUS.CONFLICT
      });
    }
    const groupObjectId = new ObjectId(group_id);
    const userObjectId = new ObjectId(user_id);

    const result = await databaseService.study_group_members.findOneAndUpdate(
      { group_id: groupObjectId, user_id: userObjectId, role: StudyGroupRole.Admin },
      {
        $set: { role: StudyGroupRole.Member, updated_at: new Date() }
      },
      { returnDocument: 'after' }
    );

    if (!result) {
      throw new ErrorWithStatus({
        message: 'Member not found',
        status: HTTP_STATUS.NOT_FOUND
      });
    }

    return result;
  }

  async removeMember({
    group_id,
    user_id,
    current_user_id
  }: {
    group_id: string;
    user_id: string;
    current_user_id: string;
  }) {
    if (user_id === current_user_id) {
      throw new ErrorWithStatus({
        message: 'Cannot remove yourself',
        status: HTTP_STATUS.CONFLICT
      });
    }
    const groupObjectId = new ObjectId(group_id);
    const userObjectId = new ObjectId(user_id);

    const result = await databaseService.study_group_members.findOneAndDelete({
      group_id: groupObjectId,
      user_id: userObjectId
    });

    if (!result) {
      throw new ErrorWithStatus({
        message: 'Member not found',
        status: HTTP_STATUS.NOT_FOUND
      });
    }

    return result;
  }

  async addPointsToMember(
    {
      user_id,
      group_id,
      pointsToAdd
    }: {
      user_id: string;
      group_id: string;
      pointsToAdd: number;
    },
    session?: ClientSession // Thêm session vào tham số
  ) {
    const result = await databaseService.study_group_members.findOneAndUpdate(
      {
        user_id: new ObjectId(user_id),
        group_id: new ObjectId(group_id)
      },
      {
        $inc: { points: pointsToAdd },
        $currentDate: { updated_at: true }
      },
      {
        returnDocument: 'after',
        upsert: false,
        session
      }
    );

    if (!result) {
      throw new ErrorWithStatus({
        status: HTTP_STATUS.NOT_FOUND,
        message: STUDY_GROUP_MESSAGES.MEMBER_NOT_FOUND
      });
    }

    const updatedMember = new StudyGroupMember(result);

    // Nếu badgesService cũng hỗ trợ session thì truyền vào
    const newBadges = await badgesService.awardBadgeIfEligible(updatedMember, session);

    return {
      member: updatedMember,
      newBadges
    };
  }

  async getUserStats({
    user_id,
    group_id,
    current_user_id
  }: {
    group_id: string;
    user_id: string;
    current_user_id?: string;
  }) {
    const userObjectId = new ObjectId(user_id);
    const groupObjectId = new ObjectId(group_id);
    const [questionsCount, repliesCount, memberData, userData, followData] = await Promise.all([
      databaseService.questions.countDocuments({ user_id: userObjectId, group_id: groupObjectId }),
      databaseService.replies.countDocuments({ user_id: userObjectId }),
      databaseService.study_group_members.findOne({ user_id: userObjectId, group_id: groupObjectId }),
      databaseService.users.findOne(
        { _id: userObjectId },
        {
          projection: {
            _id: 1,
            username: 1,
            name: 1,
            bio: 1
          }
        }
      ),
      current_user_id !== user_id &&
        databaseService.followers.findOne({
          user_id: new ObjectId(current_user_id),
          followed_user_id: userObjectId
        })
    ]);
    if (!memberData) {
      throw new ErrorWithStatus({
        status: HTTP_STATUS.NOT_FOUND,
        message: USERS_MESSAGES.USER_NOT_FOUND
      });
    }
    return {
      questionsCount,
      repliesCount,
      role: memberData.role,
      points: memberData.points,
      userData,
      isFollow: current_user_id === user_id ? null : Boolean(followData)
    };
  }
}

const studyGroupsService = new StudyGroupsService();

export default studyGroupsService;
