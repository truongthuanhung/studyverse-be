import { ObjectId } from 'mongodb';
import databaseService from './database.services';
import natural from 'natural';
import { StudyGroupRole } from '~/constants/enums';

class RecommendationsService {
  /**
   * Recommend study groups based on their description using TF-IDF
   */
  async recommendGroupsByDescription(user_id: string) {
    const studyGroups = await databaseService.study_groups.find().toArray();
    if (studyGroups.length === 0) return [];

    // Lấy thông tin của user để tìm sở thích từ các nhóm đã tham gia
    const userGroups = await databaseService.study_group_members.find({ user_id: new ObjectId(user_id) }).toArray();

    const userGroupIds = userGroups.map((group) => group.group_id);
    const userDescriptions = await databaseService.study_groups.find({ _id: { $in: userGroupIds } }).toArray();

    const userQuery = userDescriptions.map((g) => g.description).join(' ');

    const tfidf = new natural.TfIdf();
    studyGroups.forEach((group) => tfidf.addDocument(group.description));

    const scores: any[] = [];
    tfidf.tfidfs(userQuery, (i, measure) => {
      // Chỉ đề xuất các nhóm mà người dùng chưa tham gia
      if (!userGroupIds.some((id) => id.toString() === studyGroups[i]._id.toString())) {
        scores.push({ group: studyGroups[i], score: measure });
      }
    });

    scores.sort((a, b) => b.score - a.score);

    return scores.slice(0, 5).map((s) => s.group);
  }

  /**
   * Recommend study groups based on user profile and interests
   */
  async recommendGroupsByUserProfile(user_id: string) {
    const studyGroups = await databaseService.study_groups.find().toArray();
    if (studyGroups.length === 0) return [];

    // Lấy thông tin người dùng
    const user = await databaseService.users.findOne({ _id: new ObjectId(user_id) });
    if (!user) return [];

    // Tạo query từ profile và nhóm đã tham gia
    let userQuery = `${user.bio || ''} ${user.location || ''} ${user.name || ''}`;

    // Thêm thông tin từ nhóm đã tham gia
    const userGroups = await databaseService.study_group_members.find({ user_id: new ObjectId(user_id) }).toArray();
    const userGroupIds = userGroups.map((group) => group.group_id);
    const userDescriptions = await databaseService.study_groups.find({ _id: { $in: userGroupIds } }).toArray();
    userQuery += ' ' + userDescriptions.map((g) => g.description).join(' ');

    // Sử dụng TF-IDF để tìm các nhóm phù hợp
    const tfidf = new natural.TfIdf();
    studyGroups.forEach((group) => tfidf.addDocument(group.description));

    const scores: any[] = [];
    tfidf.tfidfs(userQuery, (i, measure) => {
      // Chỉ đề xuất các nhóm mà người dùng chưa tham gia
      if (!userGroupIds.some((id) => id.toString() === studyGroups[i]._id.toString())) {
        scores.push({ group: studyGroups[i], score: measure });
      }
    });

    scores.sort((a, b) => b.score - a.score);

    return scores.slice(0, 5).map((s) => s.group);
  }

  /**
   * Recommend study groups using collaborative filtering (based on similar users)
   */
  async recommendGroupsBySimilarUsers(user_id: string) {
    // Tìm nhóm user đã tham gia
    const userGroups = await databaseService.study_group_members.find({ user_id: new ObjectId(user_id) }).toArray();

    if (userGroups.length === 0) {
      return [];
    }

    const userGroupIds = userGroups.map((group) => group.group_id);

    // Tìm người dùng tương tự (tham gia cùng nhóm)
    const similarUsers = await databaseService.study_group_members
      .aggregate([
        { $match: { group_id: { $in: userGroupIds }, user_id: { $ne: new ObjectId(user_id) } } },
        { $group: { _id: '$user_id', commonGroups: { $sum: 1 } } },
        { $sort: { commonGroups: -1 } }, // Ưu tiên người dùng có nhiều nhóm chung nhất
        { $limit: 20 }
      ])
      .toArray();

    const similarUserIds = similarUsers.map((u: any) => u._id);
    if (similarUserIds.length === 0) return [];

    // Tìm nhóm mà người dùng tương tự đã tham gia nhưng user chưa tham gia
    const recommendedGroups = await databaseService.study_group_members
      .aggregate([
        { $match: { user_id: { $in: similarUserIds }, group_id: { $nin: userGroupIds } } },
        { $group: { _id: '$group_id', count: { $sum: 1 } } },
        { $sort: { count: -1 } }, // Nhóm có nhiều user chung sẽ được ưu tiên
        { $limit: 5 }
      ])
      .toArray();

    if (recommendedGroups.length === 0) return [];

    return databaseService.study_groups.find({ _id: { $in: recommendedGroups.map((g) => g._id) } }).toArray();
  }

  /**
   * Recommend study groups based on friends' memberships
   */
  async recommendGroupsByFriends(user_id: string) {
    // Tìm bạn bè
    const friends = await databaseService.friends
      .find({
        $or: [{ user_id1: new ObjectId(user_id) }, { user_id2: new ObjectId(user_id) }]
      })
      .toArray();

    const friendIds = friends.map((f) => (f.user_id1.toString() === user_id.toString() ? f.user_id2 : f.user_id1));

    if (friendIds.length === 0) return [];

    // Tìm nhóm người dùng đã tham gia
    const userGroups = await databaseService.study_group_members.find({ user_id: new ObjectId(user_id) }).toArray();
    const userGroupIds = userGroups.map((g) => g.group_id);

    // Tìm nhóm bạn bè tham gia mà người dùng chưa tham gia
    const friendGroups = await databaseService.study_group_members
      .aggregate([
        { $match: { user_id: { $in: friendIds }, group_id: { $nin: userGroupIds } } },
        { $group: { _id: '$group_id', friendCount: { $sum: 1 } } },
        { $sort: { friendCount: -1 } },
        { $limit: 5 }
      ])
      .toArray();

    if (friendGroups.length === 0) return [];

    return databaseService.study_groups.find({ _id: { $in: friendGroups.map((g) => g._id) } }).toArray();
  }

  /**
   * Recommend groups based on user's activity points in similar groups
   */
  async recommendGroupsByActivityPatterns(user_id: string) {
    // Tìm các nhóm người dùng tham gia và điểm hoạt động
    const userMemberships = await databaseService.study_group_members
      .find({
        user_id: new ObjectId(user_id)
      })
      .toArray();

    if (userMemberships.length === 0) return [];

    const userGroupIds = userMemberships.map((m) => m.group_id);

    // Xác định nhóm có mức độ tham gia cao nhất
    userMemberships.sort((a, b) => b.points - a.points);
    const topGroups = userMemberships.slice(0, 3); // Lấy 3 nhóm có điểm cao nhất

    // Tìm các nhóm tương tự với nhóm tham gia tích cực
    const topGroupsInfo = await databaseService.study_groups
      .find({
        _id: { $in: topGroups.map((g) => g.group_id) }
      })
      .toArray();

    // Tạo query từ mô tả của các nhóm top
    const userQuery = topGroupsInfo.map((g) => g.description).join(' ');

    // Tìm tất cả các nhóm mà người dùng chưa tham gia
    const allGroups = await databaseService.study_groups
      .find({
        _id: { $nin: userGroupIds }
      })
      .toArray();

    if (allGroups.length === 0) return [];

    // Sử dụng TF-IDF để tìm nhóm tương tự
    const tfidf = new natural.TfIdf();
    allGroups.forEach((group) => tfidf.addDocument(group.description));

    const scores: any[] = [];
    tfidf.tfidfs(userQuery, (i, measure) => {
      scores.push({ group: allGroups[i], score: measure });
    });

    scores.sort((a, b) => b.score - a.score);
    return scores.slice(0, 5).map((s) => s.group);
  }

  /**
   * Main recommendation method that combines all approaches
   */
  async recommendStudyGroups(user_id: string) {
    // Lấy trạng thái thành viên của user
    const userGroups = await databaseService.study_group_members.find({ user_id: new ObjectId(user_id) }).toArray();

    // Nếu chưa tham gia nhóm nào thì chỉ dùng content-based
    if (userGroups.length === 0) {
      const contentRecs = await this.recommendGroupsByUserProfile(user_id);
      // Thêm member_count cho các nhóm đề xuất
      const groupsWithMemberCount = await this.addMemberCountToGroups(contentRecs);
      // Thêm hasRequested cho mỗi nhóm
      return this.addJoinRequestStatus(user_id, groupsWithMemberCount);
    }

    // Nếu đã tham gia nhóm, kết hợp các phương pháp
    // 1. Lấy đề xuất từ các phương pháp khác nhau
    const [similarUserRecs, friendRecs, contentRecs, activityRecs] = await Promise.all([
      this.recommendGroupsBySimilarUsers(user_id),
      this.recommendGroupsByFriends(user_id),
      this.recommendGroupsByUserProfile(user_id),
      this.recommendGroupsByActivityPatterns(user_id)
    ]);

    // 2. Kết hợp và sắp xếp kết quả, ưu tiên theo thứ tự:
    // - Đề xuất từ bạn bè
    // - Đề xuất từ người dùng tương tự
    // - Đề xuất từ hoạt động
    // - Đề xuất từ nội dung
    const recommendedGroups = new Map();

    // Gán điểm ưu tiên cho mỗi nguồn đề xuất
    const addRecommendations = (groups: any, baseScore: any) => {
      groups.forEach((group: any, index: number) => {
        const groupId = group._id.toString();
        const score = baseScore - index * 0.1; // Giảm điểm theo thứ tự

        if (recommendedGroups.has(groupId)) {
          // Nếu đã có thì cộng thêm điểm
          recommendedGroups.set(groupId, {
            group,
            score: recommendedGroups.get(groupId).score + score
          });
        } else {
          recommendedGroups.set(groupId, { group, score });
        }
      });
    };

    // Thêm các đề xuất với độ ưu tiên khác nhau
    addRecommendations(friendRecs, 4.0); // Ưu tiên cao nhất
    addRecommendations(similarUserRecs, 3.0); // Ưu tiên thứ hai
    addRecommendations(activityRecs, 2.0); // Ưu tiên thứ ba
    addRecommendations(contentRecs, 1.0); // Ưu tiên thấp nhất

    // Sắp xếp theo điểm và trả về kết quả
    const result = Array.from(recommendedGroups.values())
      .sort((a, b) => b.score - a.score)
      .slice(0, 10)
      .map((item) => item.group);

    // Thêm member_count cho các nhóm đã được sắp xếp
    const groupsWithMemberCount = await this.addMemberCountToGroups(result);

    // Thêm hasRequested cho mỗi nhóm
    return this.addJoinRequestStatus(user_id, groupsWithMemberCount);
  }

  // Helper method để thêm thông tin join request vào các nhóm
  private async addJoinRequestStatus(user_id: string, groups: any[]) {
    if (!groups || groups.length === 0) return groups;

    // Lấy các nhóm mà user chưa là thành viên (Guest)
    const guestGroups = groups.filter((group) => !group.role || group.role === StudyGroupRole.Guest);

    if (guestGroups.length === 0) return groups;

    const guestGroupIds = guestGroups.map((group) => new ObjectId(group._id));

    // Tìm các join request hiện có
    const joinRequests = await databaseService.join_requests
      .find({
        user_id: new ObjectId(user_id),
        group_id: { $in: guestGroupIds }
      })
      .toArray();

    // Tạo map từ groupId -> hasRequested
    const requestMap = new Map();
    joinRequests.forEach((request) => {
      requestMap.set(request.group_id.toString(), true);
    });

    // Thêm trường hasRequested vào mỗi nhóm
    return groups.map((group) => {
      if (!group.role || group.role === StudyGroupRole.Guest) {
        group.hasRequested = requestMap.has(group._id.toString()) || false;
      }
      return group;
    });
  }

  // Hàm helper để thêm member_count vào danh sách nhóm
  async addMemberCountToGroups(groups: any[]) {
    if (groups.length === 0) return [];

    // Lấy danh sách ID của các group
    const groupIds = groups.map((group) => group._id);

    // Truy vấn để đếm số lượng thành viên cho mỗi nhóm
    const memberCountsResult = await databaseService.study_group_members
      .aggregate([{ $match: { group_id: { $in: groupIds } } }, { $group: { _id: '$group_id', count: { $sum: 1 } } }])
      .toArray();

    // Tạo map để lưu số lượng thành viên theo group ID
    const memberCountMap = new Map();
    memberCountsResult.forEach((item) => {
      memberCountMap.set(item._id.toString(), item.count);
    });

    // Thêm member_count vào mỗi nhóm
    return groups.map((group) => {
      const groupId = group._id.toString();
      return {
        ...group,
        member_count: memberCountMap.get(groupId) || 0
      };
    });
  }
  /**
   * Recommend trending study groups based on recent activity and growth
   */
  async recommendTrendingGroups(limit = 5) {
    // Tính toán xu hướng dựa trên số lượng thành viên mới trong 30 ngày qua
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const trendingGroups = await databaseService.study_group_members
      .aggregate([
        { $match: { created_at: { $gte: thirtyDaysAgo } } },
        { $group: { _id: '$group_id', newMembers: { $sum: 1 } } },
        { $sort: { newMembers: -1 } },
        { $limit: limit }
      ])
      .toArray();

    if (trendingGroups.length === 0) {
      // Nếu không có nhóm trending, lấy các nhóm có nhiều thành viên nhất
      const popularGroups = await databaseService.study_group_members
        .aggregate([
          { $group: { _id: '$group_id', memberCount: { $sum: 1 } } },
          { $sort: { memberCount: -1 } },
          { $limit: limit }
        ])
        .toArray();

      return databaseService.study_groups
        .find({
          _id: { $in: popularGroups.map((g) => g._id) }
        })
        .toArray();
    }

    return databaseService.study_groups
      .find({
        _id: { $in: trendingGroups.map((g) => g._id) }
      })
      .toArray();
  }
}

const recommendationsService = new RecommendationsService();
export default recommendationsService;
