/**
 * Script to create study groups and invitations
 * 
 * Requirements:
 * - Create approximately 40 study groups for the specified user
 * - Create group member record for the user for each group (as the creator/admin)
 * - Send invitations from each group to a specific user
 */

import { faker } from '@faker-js/faker';
import { ObjectId } from 'mongodb';
import { GroupPrivacy, InvitationStatus, StudyGroupRole } from '~/constants/enums';
import StudyGroup from '~/models/schemas/StudyGroup.schema';
import StudyGroupMember from '~/models/schemas/StudyGroupMember.schema';
import StudyGroupInvitation from '~/models/schemas/StudyGroupInvitation.schema';
import databaseService from '~/services/database.services';

// ID của người dùng cần tạo study group
const MY_ID = new ObjectId('6721ff410e6b93735147fb10');
// ID của người dùng cần gửi lời mời tham gia group
const TARGET_ID = new ObjectId('6713931d153330d6b91fff76');
// Số lượng nhóm học cần tạo
const GROUP_COUNT = 40;

// Danh sách chủ đề học tập để tạo tên nhóm đa dạng
const STUDY_TOPICS = [
  'Lập trình Web',
  'Machine Learning',
  'JavaScript Advanced',
  'React Native',
  'Node.js',
  'Python',
  'Data Science',
  'Thuật toán',
  'Cấu trúc dữ liệu',
  'UX/UI Design',
  'Toán cao cấp',
  'Tiếng Anh',
  'AWS Cloud',
  'Docker & Kubernetes',
  'Flutter',
  'iOS Development',
  'Android Development',
  'PHP Laravel',
  'Blockchain',
  'DevOps'
];

// Loại nhóm học
const GROUP_TYPES = [
  'Nhóm học tập',
  'Nhóm nghiên cứu',
  'Câu lạc bộ',
  'Lớp học',
  'Dự án',
  'Workshop',
  'Seminar',
  'Thảo luận'
];

const createRandomStudyGroup = () => {
  const topic = faker.helpers.arrayElement(STUDY_TOPICS);
  const type = faker.helpers.arrayElement(GROUP_TYPES);
  const name = `${type} ${topic} ${faker.number.int({ min: 1, max: 100 })}`;
  
  const studyGroup: StudyGroup = new StudyGroup({
    name,
    privacy: faker.helpers.arrayElement([GroupPrivacy.Public, GroupPrivacy.Private]),
    user_id: MY_ID,
    description: faker.lorem.paragraph(2),
    cover_photo: faker.image.url()
  });
  
  return studyGroup;
};

const insertStudyGroup = async (studyGroup: StudyGroup) => {
  const group_id = new ObjectId();
  const groupWithId = { ...studyGroup, _id: group_id };
  await databaseService.study_groups.insertOne(groupWithId);
  return group_id;
};

const createGroupMember = async (user_id: ObjectId, group_id: ObjectId, role: StudyGroupRole) => {
  await databaseService.study_group_members.insertOne(
    new StudyGroupMember({
      user_id,
      group_id,
      role,
      points: 0
    })
  );
};

const createGroupInvitation = async (
  group_id: ObjectId,
  created_user_id: ObjectId,
  invited_user_id: ObjectId
) => {
  await databaseService.study_group_invitations.insertOne(
    new StudyGroupInvitation({
      group_id,
      created_user_id,
      invited_user_id,
      status: InvitationStatus.Unread
    })
  );
};

const createStudyGroups = async () => {
  console.log('Bắt đầu tạo các nhóm học tập...');

  // Tạo danh sách group IDs để lưu trữ
  const studyGroupIds: ObjectId[] = [];

  // Tạo GROUP_COUNT nhóm học mới
  console.log(`Tạo ${GROUP_COUNT} nhóm học mới...`);
  for (let i = 0; i < GROUP_COUNT; i++) {
    const newGroup = createRandomStudyGroup();
    const groupId = await insertStudyGroup(newGroup);
    studyGroupIds.push(groupId);
    console.log(`Đã tạo nhóm ${i + 1}/${GROUP_COUNT}: ${newGroup.name} (${groupId.toString()})`);
    
    // Tạo bản ghi thành viên nhóm cho người dùng đã tạo nhóm (vai trò Admin)
    await createGroupMember(MY_ID, groupId, StudyGroupRole.Admin);
    console.log(`Đã thêm người dùng ${MY_ID.toString()} vào nhóm với vai trò Admin`);
  }

  // Gửi lời mời tham gia nhóm đến người dùng mục tiêu
  console.log(`Gửi lời mời tham gia nhóm đến người dùng ${TARGET_ID.toString()}...`);
  for (let i = 0; i < studyGroupIds.length; i++) {
    const groupId = studyGroupIds[i];
    await createGroupInvitation(groupId, MY_ID, TARGET_ID);
    console.log(`Đã gửi lời mời tham gia nhóm ${groupId.toString()} đến người dùng ${TARGET_ID.toString()}`);
  }

  console.log(`Đã tạo thành công ${GROUP_COUNT} nhóm học và gửi lời mời tham gia cho người dùng ${TARGET_ID.toString()}`);
};

// Thực thi script
createStudyGroups()
  .then(() => {
    console.log('Script đã hoàn thành thành công!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Lỗi khi thực thi script:', error);
    process.exit(1);
  });