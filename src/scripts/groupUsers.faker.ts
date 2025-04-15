/**
 * Script to create test data for user recommendations based on shared study groups
 *
 * This script will:
 * 1. Create multiple users
 * 2. Make the target user join study groups
 * 3. Make other users join the same groups
 * 4. Create friend/follower relationships between users
 * 5. Handle bidirectional follows as friends
 */

import { faker } from '@faker-js/faker';
import { ObjectId } from 'mongodb';
import { Gender, UserRole, UserVerifyStatus, GroupPrivacy, StudyGroupRole } from '~/constants/enums';
import User from '~/models/schemas/User.schema';
import StudyGroup from '~/models/schemas/StudyGroup.schema';
import StudyGroupMember from '~/models/schemas/StudyGroupMember.schema';
import { Friend } from '~/models/schemas/Friend.schema';
import { Follower } from '~/models/schemas/Follower.schema';
import databaseService from '~/services/database.services';

// Configuration
const TARGET_USER_ID = new ObjectId('6713931d153330d6b91fff76');
const NUM_USERS = 50; // Total number of users to create
const NUM_STUDY_GROUPS = 20; // Total number of study groups to create
const MAX_USERS_PER_GROUP = 15; // Maximum users per group
const FRIEND_PROBABILITY = 0.2; // Probability of two users being friends
const FOLLOW_PROBABILITY = 0.3; // Probability of one user following another

// Use the STUDY_TOPICS and GROUP_TYPES from your original script
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

// Helper function to create a random user
const createRandomUser = () => {
  const gender = faker.helpers.arrayElement([Gender.Male, Gender.Female, Gender.Other]);
  const firstName = gender === Gender.Female ? faker.person.firstName('female') : faker.person.firstName('male');
  const lastName = faker.person.lastName();
  const name = `${firstName} ${lastName}`;

  return new User({
    name,
    email: faker.internet.email({ firstName, lastName }),
    role: UserRole.Teacher,
    gender,
    date_of_birth: faker.date.birthdate({ min: 18, max: 65, mode: 'age' }),
    password: faker.internet.password(),
    username: faker.internet.username({ firstName, lastName }),
    bio: faker.lorem.sentence(),
    location: faker.location.city(),
    website: faker.internet.url(),
    avatar: faker.image.avatar(),
    cover_photo: faker.image.url(),
    verify: UserVerifyStatus.Verified
  });
};

// Helper function to create a random study group
const createRandomStudyGroup = (creator_id: ObjectId) => {
  const topic = faker.helpers.arrayElement(STUDY_TOPICS);
  const type = faker.helpers.arrayElement(GROUP_TYPES);
  const name = `${type} ${topic} ${faker.number.int({ min: 1, max: 100 })}`;

  return new StudyGroup({
    name,
    privacy: faker.helpers.arrayElement([GroupPrivacy.Public, GroupPrivacy.Private]),
    user_id: creator_id,
    description: faker.lorem.paragraph(2),
    cover_photo: faker.image.url()
  });
};

// Main function to create test data
const createTestData = async () => {
  try {
    console.log('Starting test data generation...');

    // Step 1: Check if target user exists, if not create it
    // Find the target user
    const existingTargetUser = await databaseService.users.findOne({ _id: TARGET_USER_ID });

    // Create a variable to store the User object
    let targetUser: User;

    if (!existingTargetUser) {
      console.log(`Target user with ID ${TARGET_USER_ID} not found. Creating it...`);
      targetUser = createRandomUser();
      targetUser._id = TARGET_USER_ID;
      await databaseService.users.insertOne(targetUser);
      console.log(`Created target user: ${targetUser.name}`);
    } else {
      console.log(`Found existing target user: ${existingTargetUser.name}`);
      // Convert the database result to a User object
      targetUser = new User(existingTargetUser);
    }

    // Step 2: Create additional users
    console.log(`Creating ${NUM_USERS} users...`);
    const userIds: ObjectId[] = [TARGET_USER_ID];
    for (let i = 0; i < NUM_USERS; i++) {
      const user = createRandomUser();
      const result = await databaseService.users.insertOne(user);
      userIds.push(result.insertedId);
      console.log(`Created user ${i + 1}/${NUM_USERS}: ${user.name}`);
    }

    // Step 3: Create study groups
    console.log(`Creating ${NUM_STUDY_GROUPS} study groups...`);
    const groupIds: ObjectId[] = [];
    for (let i = 0; i < NUM_STUDY_GROUPS; i++) {
      // Randomly select a creator (could be the target user)
      const creatorId = faker.helpers.arrayElement(userIds);
      const group = createRandomStudyGroup(creatorId);
      const result = await databaseService.study_groups.insertOne(group);
      const groupId = result.insertedId;
      groupIds.push(groupId);

      // Add creator as admin
      await databaseService.study_group_members.insertOne(
        new StudyGroupMember({
          user_id: creatorId,
          group_id: groupId,
          role: StudyGroupRole.Admin
        })
      );

      console.log(`Created study group ${i + 1}/${NUM_STUDY_GROUPS}: ${group.name}`);
    }

    // Step 4: Make target user join some groups (if not already the creator)
    console.log(`Making target user join study groups...`);
    for (const groupId of groupIds) {
      // Check if target user is already in the group
      const existingMembership = await databaseService.study_group_members.findOne({
        user_id: TARGET_USER_ID,
        group_id: groupId
      });

      if (!existingMembership) {
        // Add as a regular member
        await databaseService.study_group_members.insertOne(
          new StudyGroupMember({
            user_id: TARGET_USER_ID,
            group_id: groupId,
            role: StudyGroupRole.Member
          })
        );
        console.log(`Added target user to group ${groupId}`);
      }
    }

    // Step 5: Make other users join groups
    console.log(`Making other users join study groups...`);
    for (const groupId of groupIds) {
      // Determine how many users should join this group (random number up to MAX_USERS_PER_GROUP)
      const numUsersToJoin = faker.number.int({ min: 3, max: MAX_USERS_PER_GROUP });

      // Randomly select users to join this group
      const selectedUserIds = faker.helpers.arrayElements(
        userIds.filter((id) => id.toString() !== TARGET_USER_ID.toString()),
        numUsersToJoin
      );

      for (const userId of selectedUserIds) {
        // Check if user is already a member
        const existingMembership = await databaseService.study_group_members.findOne({
          user_id: userId,
          group_id: groupId
        });

        if (!existingMembership) {
          await databaseService.study_group_members.insertOne(
            new StudyGroupMember({
              user_id: userId,
              group_id: groupId,
              role: StudyGroupRole.Member
            })
          );
          console.log(`Added user ${userId} to group ${groupId}`);
        }
      }
    }

    // Step 6: Create friends and followers
    console.log(`Creating friend and follower relationships...`);

    // Track bidirectional follows to make them friends
    const followPairs = new Set<string>();

    // Process all users (including target user)
    for (let i = 0; i < userIds.length; i++) {
      const userId = userIds[i];

      for (let j = i + 1; j < userIds.length; j++) {
        const otherUserId = userIds[j];

        // Skip self relations
        if (userId.toString() === otherUserId.toString()) continue;

        // Determine if these users should be friends
        if (Math.random() < FRIEND_PROBABILITY) {
          // Create friend relationship (the Friend class already handles sorting user IDs)
          const friend = new Friend({
            user_id1: userId,
            user_id2: otherUserId
          });

          await databaseService.friends.insertOne(friend);
          console.log(`Created friend relationship between ${userId} and ${otherUserId}`);

          // Add bidirectional follows for friends
          await databaseService.followers.insertOne(
            new Follower({
              user_id: userId,
              followed_user_id: otherUserId
            })
          );

          await databaseService.followers.insertOne(
            new Follower({
              user_id: otherUserId,
              followed_user_id: userId
            })
          );

          console.log(`Created bidirectional follows for friends ${userId} and ${otherUserId}`);
        }
        // If not friends, determine if one follows the other
        else {
          // User follows other user
          if (Math.random() < FOLLOW_PROBABILITY) {
            const pairKey1 = `${userId.toString()}-${otherUserId.toString()}`;
            const pairKey2 = `${otherUserId.toString()}-${userId.toString()}`;

            // Check if reverse follow exists
            if (followPairs.has(pairKey2)) {
              // This would make a bidirectional follow, so create a friend relationship instead
              const friend = new Friend({
                user_id1: userId,
                user_id2: otherUserId
              });

              await databaseService.friends.insertOne(friend);
              console.log(
                `Created friend relationship from bidirectional follows between ${userId} and ${otherUserId}`
              );
            } else {
              // Add to follow pairs
              followPairs.add(pairKey1);

              // Create follower relationship
              await databaseService.followers.insertOne(
                new Follower({
                  user_id: userId,
                  followed_user_id: otherUserId
                })
              );
              console.log(`User ${userId} follows ${otherUserId}`);
            }
          }

          // Other user follows user
          if (Math.random() < FOLLOW_PROBABILITY) {
            const pairKey1 = `${otherUserId.toString()}-${userId.toString()}`;
            const pairKey2 = `${userId.toString()}-${otherUserId.toString()}`;

            // Check if reverse follow exists
            if (followPairs.has(pairKey2)) {
              // This would make a bidirectional follow, so create a friend relationship instead
              // But need to check if we already created it in the block above
              const existingFriend = await databaseService.friends.findOne({
                $or: [
                  { user_id1: userId, user_id2: otherUserId },
                  { user_id1: otherUserId, user_id2: userId }
                ]
              });

              if (!existingFriend) {
                const friend = new Friend({
                  user_id1: userId,
                  user_id2: otherUserId
                });

                await databaseService.friends.insertOne(friend);
                console.log(
                  `Created friend relationship from bidirectional follows between ${otherUserId} and ${userId}`
                );
              }
            } else {
              // Add to follow pairs
              followPairs.add(pairKey1);

              // Create follower relationship
              await databaseService.followers.insertOne(
                new Follower({
                  user_id: otherUserId,
                  followed_user_id: userId
                })
              );
              console.log(`User ${otherUserId} follows ${userId}`);
            }
          }
        }
      }
    }

    console.log('Test data generation completed successfully!');

    // Print some stats
    const userCount = await databaseService.users.countDocuments();
    const groupCount = await databaseService.study_groups.countDocuments();
    const membershipCount = await databaseService.study_group_members.countDocuments();
    const friendCount = await databaseService.friends.countDocuments();
    const followerCount = await databaseService.followers.countDocuments();

    console.log('Stats:');
    console.log(`- Users: ${userCount}`);
    console.log(`- Study Groups: ${groupCount}`);
    console.log(`- Group Memberships: ${membershipCount}`);
    console.log(`- Friend Relationships: ${friendCount}`);
    console.log(`- Follower Relationships: ${followerCount}`);
  } catch (error) {
    console.error('Error creating test data:', error);
    throw error;
  }
};

// Execute script
createTestData()
  .then(() => {
    console.log('Script executed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Script execution failed:', error);
    process.exit(1);
  });
