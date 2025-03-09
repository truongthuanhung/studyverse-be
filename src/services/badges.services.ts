import { ClientSession, ObjectId } from 'mongodb';
import databaseService from './database.services';
import StudyGroupMember from '~/models/schemas/StudyGroupMember.schema';
import UserBadge from '~/models/schemas/UserBadge.schema';

class BadgesService {
  async awardBadgeIfEligible(member: StudyGroupMember, session?: ClientSession) {
    const userPoint = member.points;

    // Find the highest badge the user is eligible for based on points
    const highestEligibleBadge = await databaseService.badges
      .find({ points_required: { $lte: userPoint } })
      .sort({ points_required: -1 }) // Sort by points in descending order to get the highest badge first
      .limit(1)
      .toArray()
      .then((badges) => badges[0]);

    if (!highestEligibleBadge) {
      return null; // No eligible badges found
    }

    // Check if the user already has this exact badge
    const existingBadge = await databaseService.user_badges.findOne(
      {
        user_id: member.user_id,
        group_id: member.group_id,
        badge_id: highestEligibleBadge._id
      },
      { session }
    );

    // If the user already has this badge, no need to do anything
    if (existingBadge) {
      return null;
    }

    // Remove all existing badges for this user in this group
    await databaseService.user_badges.deleteMany(
      {
        user_id: member.user_id,
        group_id: member.group_id
      },
      { session }
    );

    // Create a new UserBadge record for the highest eligible badge
    const newUserBadge = new UserBadge({
      user_id: member.user_id,
      group_id: member.group_id,
      badge_id: highestEligibleBadge._id
    });

    // Save the new UserBadge record to the database
    await databaseService.user_badges.insertOne(newUserBadge, { session });

    // Return the newly awarded badge
    return highestEligibleBadge;
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
