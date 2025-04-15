import { ClientSession, ObjectId } from 'mongodb';
import databaseService from './database.services';
import StudyGroupMember from '~/models/schemas/StudyGroupMember.schema';
import UserBadge from '~/models/schemas/UserBadge.schema';

class BadgesService {
  async awardBadgeIfEligible(member: StudyGroupMember, session?: ClientSession) {
    const userPoints = member.points;

    // Tìm badge cao nhất mà user đủ điều kiện
    const highestEligibleBadge = await databaseService.badges
      .find({ points_required: { $lte: userPoints } })
      .sort({ points_required: -1 })
      .limit(1)
      .toArray()
      .then((badges) => badges[0]);

    if (!highestEligibleBadge) {
      return null; // Không có badge nào phù hợp
    }

    // Kiểm tra xem user đã có badge này chưa
    const hasBadge = member.badges.some(
      (badge) => badge._id && badge._id.toString() === highestEligibleBadge._id.toString()
    );

    if (hasBadge) {
      return null; // Người dùng đã có badge này, không cần cấp lại
    }

    // Cập nhật danh sách badge
    const updatedMember = await databaseService.study_group_members.findOneAndUpdate(
      { _id: member._id },
      {
        $addToSet: { badges: highestEligibleBadge }, // Đảm bảo không thêm trùng lặp
        $set: { updated_at: new Date() }
      },
      {
        session,
        returnDocument: 'after'
      }
    );

    return updatedMember ? highestEligibleBadge : null;
  }

  // Phương thức lấy tất cả huy hiệu của người dùng trong một nhóm học tập
  async getUserBadgesInGroup(userId: ObjectId, groupId: ObjectId) {
    const userBadges = await databaseService.user_badges
      .find({
        user_id: userId,
        group_id: groupId
      })
      .toArray();

    if (userBadges.length === 0) {
      return [];
    }

    const badgeIds = userBadges.map((ub) => ub.badge_id);

    // Lấy thông tin chi tiết của các huy hiệu
    const badges = await databaseService.badges
      .find({
        _id: { $in: badgeIds }
      })
      .toArray();

    return badges;
  }
}

const badgesService = new BadgesService();

export default badgesService;
