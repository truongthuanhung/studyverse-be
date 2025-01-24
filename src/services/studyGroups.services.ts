import { CreateStudyGroupRequestBody, EditStudyGroupRequestBody } from '~/models/requests/User.requests';
import databaseService from './database.services';
import StudyGroup from '~/models/schemas/StudyGroup.schema';
import { ObjectId } from 'mongodb';
import StudyGroupMember from '~/models/schemas/StudyGroupMember.schema';
import { StudyGroupRole } from '~/constants/enums';
import { ErrorWithStatus } from '~/models/Errors';
import HTTP_STATUS from '~/constants/httpStatus';
import JoinRequest from '~/models/schemas/JoinRequest.schema';

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

  async editStudyGroup(study_group_id: string, payload: EditStudyGroupRequestBody) {}

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
          as: 'groupDetails',
          pipeline: [
            {
              $lookup: {
                from: 'study_group_members',
                let: { groupId: '$_id' },
                pipeline: [
                  { $match: { $expr: { $eq: ['$group_id', '$$groupId'] } } },
                  { $group: { _id: null, memberCount: { $sum: 1 } } }
                ],
                as: 'memberInfo'
              }
            },
            {
              $project: {
                _id: 1,
                name: 1,
                privacy: 1,
                description: 1,
                cover_photo: 1,
                member: { $ifNull: [{ $arrayElemAt: ['$memberInfo.memberCount', 0] }, 0] },
                created_at: 1,
                updated_at: 1
              }
            }
          ]
        }
      },
      { $unwind: '$groupDetails' },
      {
        $project: {
          _id: '$groupDetails._id',
          name: '$groupDetails.name',
          privacy: '$groupDetails.privacy',
          description: '$groupDetails.description',
          member: '$groupDetails.member',
          cover_photo: '$groupDetails.cover_photo',
          role: '$role',
          created_at: '$groupDetails.created_at',
          updated_at: '$groupDetails.updated_at'
        }
      }
    ];

    return databaseService.study_group_members.aggregate(pipeline).toArray();
  }

  async getStudyGroupById(user_id: string, group_id: string) {
    const pipeline = [
      // Lọc study_groups theo _id
      {
        $match: {
          _id: new ObjectId(group_id)
        }
      },

      // Join với study_group_members để lấy thông tin vai trò của user
      {
        $lookup: {
          from: 'study_group_members', // Tên collection
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

      // Join với study_group_members để đếm số lượng thành viên trong nhóm
      {
        $lookup: {
          from: 'study_group_members',
          let: { groupId: '$_id' },
          pipeline: [{ $match: { $expr: { $eq: ['$group_id', '$$groupId'] } } }, { $count: 'memberCount' }],
          as: 'memberInfo'
        }
      },

      // Định dạng lại dữ liệu đầu ra
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
          role: { $arrayElemAt: ['$userRole.role', 0] }, // Lấy role của user (nếu có)
          member: { $arrayElemAt: ['$memberInfo.memberCount', 0] } // Lấy số lượng thành viên
        }
      }
    ];

    // Thực thi pipeline
    const result = await databaseService.study_groups.aggregate(pipeline).toArray();

    // Trả về group đầu tiên (nếu tồn tại)
    return result.length > 0 ? result[0] : null;
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
            user_id: 1,
            group_id: 1,
            created_at: 1,
            'user_details.avatar': 1,
            'user_details.name': 1
          }
        }
      ])
      .toArray();

    return join_requests;
  }
}

const studyGroupsService = new StudyGroupsService();

export default studyGroupsService;
