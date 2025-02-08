import databaseService from './database.services';
import StudyGroup from '~/models/schemas/StudyGroup.schema';
import { ObjectId } from 'mongodb';
import StudyGroupMember from '~/models/schemas/StudyGroupMember.schema';
import { StudyGroupRole } from '~/constants/enums';
import { ErrorWithStatus } from '~/models/Errors';
import HTTP_STATUS from '~/constants/httpStatus';
import JoinRequest from '~/models/schemas/JoinRequest.schema';
import { CreateStudyGroupRequestBody, EditStudyGroupRequestBody } from '~/models/requests/StudyGroup.requests';

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

  async getStudyGroups(user_id: string, type: string = 'all') {
    const matchStage: any = {
      user_id: new ObjectId(user_id)
    };

    if (type !== 'all') {
      matchStage.role = type === 'admin' ? StudyGroupRole.Admin : StudyGroupRole.Member;
    }

    const pipeline = [
      { $match: matchStage },
      {
        $lookup: {
          from: 'study_groups',
          localField: 'group_id',
          foreignField: '_id',
          as: 'groupDetails'
        }
      },
      { $unwind: '$groupDetails' },
      {
        $project: {
          _id: '$groupDetails._id',
          name: '$groupDetails.name',
          privacy: '$groupDetails.privacy',
          description: '$groupDetails.description',
          cover_photo: '$groupDetails.cover_photo',
          role: '$role',
          joined_at: '$created_at'
        }
      }
    ];

    return databaseService.study_group_members.aggregate(pipeline).toArray();
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
          members: { $arrayElemAt: ['$memberInfo.memberCount', 0] } // Get member count
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

    const adminMember = await databaseService.study_group_members.findOne({
      user_id: new ObjectId(user_id),
      group_id: new ObjectId(group_id),
      role: StudyGroupRole.Admin
    });

    if (!adminMember) {
      throw new ErrorWithStatus({
        status: HTTP_STATUS.FORBIDDEN,
        message: 'User has no permission to accept request'
      });
    }

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

      return { message: 'Join request accepted and user added to the group.' };
    } catch (error) {
      await session.abortTransaction();
      console.error('Error accepting join request:', error);
      throw new ErrorWithStatus({
        status: HTTP_STATUS.INTERNAL_SERVER_ERROR,
        message: 'Failed to accept join request.'
      });
    } finally {
      session.endSession();
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

    const { group_id } = join_request;
    const adminMember = await databaseService.study_group_members.findOne({
      user_id: new ObjectId(user_id),
      group_id: new ObjectId(group_id),
      role: StudyGroupRole.Admin
    });

    if (!adminMember) {
      throw new ErrorWithStatus({
        status: HTTP_STATUS.FORBIDDEN,
        message: 'User has no permission to decline request'
      });
    }

    await databaseService.join_requests.findOneAndDelete({
      _id: new ObjectId(join_request_id)
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
}

const studyGroupsService = new StudyGroupsService();

export default studyGroupsService;
