import { ObjectId } from 'mongodb';
import { InvitationStatus, NotificationType, StudyGroupRole } from '~/constants/enums';
import databaseService from './database.services';
import StudyGroupInvitation from '~/models/schemas/StudyGroupInvitation.schema';
import StudyGroupMember from '~/models/schemas/StudyGroupMember.schema';
import { CreateNotificationBody } from '~/models/requests/Notification.requests';
import notificationsService from './notifications.services';

class StudyGroupInvitationsService {
  async getInvitationById(user_id: string, invitation_id: string) {
    // Use aggregation to get invitation with study group and creator information
    const invitations = await databaseService.study_group_invitations
      .aggregate([
        {
          $match: { _id: new ObjectId(invitation_id) }
        },
        {
          $lookup: {
            from: 'users',
            localField: 'created_user_id',
            foreignField: '_id',
            as: 'creator'
          }
        },
        {
          $unwind: {
            path: '$creator',
            preserveNullAndEmptyArrays: true
          }
        },
        {
          $lookup: {
            from: 'study_groups',
            localField: 'group_id',
            foreignField: '_id',
            as: 'group'
          }
        },
        {
          $unwind: {
            path: '$group',
            preserveNullAndEmptyArrays: true
          }
        },
        {
          $project: {
            _id: 1,
            group_id: 1,
            created_user_id: 1,
            invited_user_id: 1,
            status: 1,
            created_at: 1,
            'creator.name': 1,
            'creator.avatar': 1,
            'creator.username': 1,
            'group.name': 1,
            'group.description': 1
          }
        }
      ])
      .toArray();

    // Return the first (and should be only) result, or null if not found
    return invitations[0] || null;
  }

  async getInvitations({
    user_id,
    page,
    limit,
    status
  }: {
    user_id: string;
    page: number;
    limit: number;
    status?: InvitationStatus;
  }) {
    const skip = (page - 1) * limit;

    // Create a match condition based on the invited_user_id and status parameters
    const matchCondition: any = { invited_user_id: new ObjectId(user_id) };

    // Chỉ thêm điều kiện status nếu nó được truyền vào và khác undefined/null
    if (status !== undefined && status !== null) {
      matchCondition.status = status;
    }

    // Use aggregation to get invitations with study group and creator information
    const invitations = await databaseService.study_group_invitations
      .aggregate([
        {
          $match: matchCondition
        },
        {
          $sort: { created_at: -1 } // Sort by created_at in descending order (newest first)
        },
        {
          $skip: skip
        },
        {
          $limit: limit
        },
        {
          $lookup: {
            from: 'users',
            localField: 'created_user_id',
            foreignField: '_id',
            as: 'creator'
          }
        },
        {
          $unwind: {
            path: '$creator',
            preserveNullAndEmptyArrays: true
          }
        },
        {
          $lookup: {
            from: 'study_groups',
            localField: 'group_id',
            foreignField: '_id',
            as: 'group'
          }
        },
        {
          $unwind: {
            path: '$group',
            preserveNullAndEmptyArrays: true
          }
        },
        {
          $project: {
            _id: 1,
            group_id: 1,
            created_user_id: 1,
            invited_user_id: 1,
            status: 1,
            created_at: 1,
            'creator.name': 1,
            'creator.avatar': 1,
            'creator.username': 1,
            'group.name': 1,
            'group.description': 1
          }
        }
      ])
      .toArray();

    // Get total count for pagination
    const total = await databaseService.study_group_invitations.countDocuments(matchCondition);
    const totalPages = Math.ceil(total / limit);

    return {
      invitations,
      pagination: {
        total,
        page,
        limit,
        totalPages
      }
    };
  }

  async inviteFriends({
    group_id,
    created_user_id,
    invited_user_ids
  }: {
    group_id: string;
    created_user_id: string;
    invited_user_ids: string[];
  }) {
    const invitations = invited_user_ids.map(
      (invited_user_id) =>
        new StudyGroupInvitation({
          group_id: new ObjectId(group_id),
          created_user_id: new ObjectId(created_user_id),
          invited_user_id: new ObjectId(invited_user_id),
          status: InvitationStatus.Unread
        })
    );
    const existingInvitations = await databaseService.study_group_invitations
      .find({
        group_id: new ObjectId(group_id),
        invited_user_id: { $in: invited_user_ids.map((id) => new ObjectId(id)) }
      })
      .toArray();
    const existingInvitedUserIds = existingInvitations.map((inv) => inv.invited_user_id.toString());
  
    const newInvitations = invitations.filter(
      (invitation) => !existingInvitedUserIds.includes(invitation.invited_user_id.toString())
    );
  
    const result = await databaseService.study_group_invitations.insertMany(newInvitations);
  
    // Lấy ID của các lời mời mới được tạo
    const newInvitationIds = Object.values(result.insertedIds);
    
    // Tạo các thông báo tương ứng với mỗi lời mời được tạo
    const notificationPromises = newInvitationIds.map((invitationId, index) => {
      const invitation = newInvitations[index];
      
      // Tạo body cho thông báo với target_url theo định dạng yêu cầu
      const notificationBody: CreateNotificationBody = {
        user_id: invitation.invited_user_id.toString(),
        actor_id: created_user_id,
        reference_id: group_id,
        group_id: group_id,
        type: NotificationType.Group,
        content: `has invited you to join their group`,
        target_url: `/invitations?invitationId=${invitationId}`
      };
  
      return notificationsService.createNotification(notificationBody);
    });
  
    // Không đợi các thông báo hoàn thành
    Promise.all(notificationPromises);
  
    return {
      acknowledged: result.acknowledged,
      insertedCount: result.insertedCount,
      insertedIds: result.insertedIds
    };
  }

  async getFriendsToInvite(user_id: string, group_id: string, page: number = 1, limit: number = 10) {
    // Tính toán skip cho phân trang
    const skip = (page - 1) * limit;

    // Chuyển đổi string ID thành ObjectId
    const userObjectId = new ObjectId(user_id);
    const groupObjectId = new ObjectId(group_id);

    // Lấy danh sách ID của các thành viên hiện tại trong nhóm
    const currentMembers = await databaseService.study_group_members.find({ group_id: groupObjectId }).toArray();
    const currentMemberIds = currentMembers.map((member) => member.user_id);

    // Lấy danh sách ID của những người đã được mời nhưng chưa phản hồi
    const pendingInvitations = await databaseService.study_group_invitations
      .find({
        group_id: groupObjectId
      })
      .toArray();

    const pendingInvitationUserIds = pendingInvitations.map((invite) => invite.invited_user_id);

    // Kết hợp danh sách người dùng cần loại trừ
    const excludedUserIds = [...currentMemberIds, ...pendingInvitationUserIds];

    // Pipeline cơ bản để lấy bạn bè không thuộc danh sách loại trừ
    const basePipeline = [
      {
        $match: {
          $or: [{ user_id1: userObjectId }, { user_id2: userObjectId }]
        }
      },
      {
        $project: {
          friend_id: {
            $cond: {
              if: { $eq: ['$user_id1', userObjectId] },
              then: '$user_id2',
              else: '$user_id1'
            }
          }
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: 'friend_id',
          foreignField: '_id',
          as: 'friend'
        }
      },
      {
        $unwind: '$friend'
      },
      {
        $match: {
          'friend._id': { $nin: excludedUserIds }
        }
      },
      {
        $project: {
          _id: '$friend._id',
          name: '$friend.name',
          username: '$friend.username',
          avatar: '$friend.avatar'
        }
      }
    ];

    // Lấy danh sách bạn bè với phân trang
    const friends = await databaseService.friends
      .aggregate([
        ...basePipeline,
        {
          $sort: { name: 1 } // Sắp xếp theo tên
        },
        {
          $skip: skip
        },
        {
          $limit: limit
        }
      ])
      .toArray();

    // Đếm tổng số kết quả để tính toán phân trang
    const countPipeline = [
      ...basePipeline,
      {
        $count: 'total'
      }
    ];

    const countResult = await databaseService.friends.aggregate(countPipeline).toArray();
    const total = countResult.length > 0 ? countResult[0].total : 0;
    const totalPages = Math.ceil(total / limit);

    // Trả về kết quả với thông tin phân trang
    return {
      friends,
      pagination: {
        total,
        page,
        limit,
        totalPages
      }
    };
  }

  async approveInvitation(user_id: string, invitation_id: string) {
    // Convert string IDs to ObjectId
    const userObjectId = new ObjectId(user_id);
    const invitationObjectId = new ObjectId(invitation_id);

    // Start a MongoDB session for the transaction
    const session = databaseService.client.startSession();

    try {
      // Start transaction
      let invitation: StudyGroupInvitation | null = null;
      let groupId: ObjectId | null = null;

      await session.withTransaction(async () => {
        // 1. Find and get the invitation details
        invitation = await databaseService.study_group_invitations.findOne(
          { _id: invitationObjectId, invited_user_id: userObjectId },
          { session }
        );

        if (!invitation) {
          throw new Error('Invitation not found or you are not the invited user');
        }

        // Store the group_id before deleting the invitation
        groupId = invitation.group_id;

        // 2. Delete the invitation
        await databaseService.study_group_invitations.deleteOne({ _id: invitationObjectId }, { session });

        // 3. Create a new member object
        const newMember = new StudyGroupMember({
          user_id: userObjectId,
          group_id: groupId,
          role: StudyGroupRole.Member
        });

        // 4. Insert the new member into the study group
        await databaseService.study_group_members.insertOne(newMember, { session });
      });

      return { message: 'Invitation accepted successfully', group_id: groupId };
    } catch (error) {
      throw error;
    } finally {
      await session.endSession();
    }
  }

  async declineInvitation(user_id: string, invitation_id: string) {
    // Convert string IDs to ObjectId
    const userObjectId = new ObjectId(user_id);
    const invitationObjectId = new ObjectId(invitation_id);

    try {
      // Find the invitation first to verify it exists and belongs to the user
      const invitation = await databaseService.study_group_invitations.findOne({
        _id: invitationObjectId,
        invited_user_id: userObjectId
      });

      if (!invitation) {
        throw new Error('Invitation not found or you are not the invited user');
      }

      // Delete the invitation
      const result = await databaseService.study_group_invitations.deleteOne({
        _id: invitationObjectId
      });

      if (result.deletedCount === 0) {
        throw new Error('Failed to delete the invitation');
      }

      return { message: 'Invitation declined successfully' };
    } catch (error) {
      throw error;
    }
  }
}

const studyGroupInvitationsService = new StudyGroupInvitationsService();

export default studyGroupInvitationsService;
