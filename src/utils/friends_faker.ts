/**
 * Script to create fake friends data
 *
 * Requirements:
 * - Create approximately 20 friend relationships for the specified user
 * - Each friendship requires two follower records (mutual following)
 * - Create a friend document for each friendship
 */

import { faker } from '@faker-js/faker';
import { ObjectId } from 'mongodb';
import { Gender, UserRole, UserVerifyStatus } from '~/constants/enums';
import { RegisterRequestBody } from '~/models/requests/User.requests';
import User from '~/models/schemas/User.schema';
import databaseService from '~/services/database.services';
import { hashPassword } from './crypto';
import { Follower } from '~/models/schemas/Follower.schema';
import { Friend } from '~/models/schemas/Friend.schema';

// ID của tài khoản của mình
const MY_ID = new ObjectId('6713931d153330d6b91fff76');
// Số lượng bạn bè cần tạo
const FRIEND_COUNT = 20;
// Mật khẩu cho các fake user
const PASSWORD = 'Duoc123!';

const createRandomUser = () => {
  const user: RegisterRequestBody = {
    name: faker.internet.displayName(),
    email: faker.internet.email(),
    password: PASSWORD,
    confirm_password: PASSWORD,
    role: UserRole.Student,
    gender: Math.random() > 0.5 ? Gender.Male : Gender.Female,
    date_of_birth: faker.date.past().toISOString()
  };
  return user;
};

const insertUser = async (user: RegisterRequestBody) => {
  const user_id = new ObjectId();
  await databaseService.users.insertOne(
    new User({
      ...user,
      _id: user_id,
      username: `user${user_id.toString()}`,
      password: hashPassword(user.password),
      date_of_birth: new Date(user.date_of_birth),
      verify: UserVerifyStatus.Verified
    })
  );
  return user_id;
};

const createFollowerRelationship = async (user_id: ObjectId, followed_user_id: ObjectId) => {
  await databaseService.followers.insertOne(
    new Follower({
      user_id,
      followed_user_id
    })
  );
};

const createFriendRelationship = async (user_id1: ObjectId, user_id2: ObjectId) => {
  await databaseService.friends.insertOne(
    new Friend({
      user_id1,
      user_id2
    })
  );
};

const createFriendships = async () => {
  console.log('Starting to create friendships...');

  // Tạo danh sách user IDs để lưu trữ các user mới
  const friendUserIds: ObjectId[] = [];

  // Tạo FRIEND_COUNT user mới
  console.log(`Creating ${FRIEND_COUNT} new users...`);
  for (let i = 0; i < FRIEND_COUNT; i++) {
    const newUser = createRandomUser();
    const userId = await insertUser(newUser);
    friendUserIds.push(userId);
    console.log(`Created user ${i + 1}/${FRIEND_COUNT}: ${userId.toString()}`);
  }

  // Tạo mối quan hệ bạn bè (follow hai chiều và bản ghi friend)
  console.log('Creating mutual follow relationships and friend records...');
  for (let i = 0; i < friendUserIds.length; i++) {
    const friendId = friendUserIds[i];

    // Tạo quan hệ follow hai chiều
    await createFollowerRelationship(MY_ID, friendId);
    await createFollowerRelationship(friendId, MY_ID);
    console.log(`Created mutual follow relationship with user: ${friendId.toString()}`);

    // Tạo bản ghi friend
    await createFriendRelationship(MY_ID, friendId);
    console.log(`Created friend record with user: ${friendId.toString()}`);
  }

  console.log(`Successfully created ${FRIEND_COUNT} friendships for user: ${MY_ID.toString()}`);
};

// Thực thi script
createFriendships()
  .then(() => {
    console.log('Script completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Error executing script:', error);
    process.exit(1);
  });
