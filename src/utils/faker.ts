/**
 * Yêu cầu: Mọi người phải cài đặt `@faker-js/faker` vào project
 * Cài đặt: `npm i @faker-js/faker`
 */

import { faker } from '@faker-js/faker';
import { ObjectId } from 'mongodb';
import { Gender, PostPrivacy, PostType, UserRole, UserVerifyStatus } from '~/constants/enums';
import { CreatePostRequestBody } from '~/models/requests/Post.requests';
import { RegisterRequestBody } from '~/models/requests/User.requests';
import User from '~/models/schemas/User.schema';
import databaseService from '~/services/database.services';
import { hashPassword } from './crypto';
import { Follower } from '~/models/schemas/Follower.schema';
import Post from '~/models/schemas/Post.schema';

// Mật khẩu cho các fake user
const PASSWORD = 'Duoc123!';
// ID của tài khoản của mình, dùng để follow người khác
const MYID = new ObjectId('6721ff410e6b93735147fb10');

// Số lượng user được tạo, mỗi user sẽ mặc định tweet 2 cái
const USER_COUNT = 5;

const createRandomUser = () => {
  const user: RegisterRequestBody = {
    name: faker.internet.displayName(),
    email: faker.internet.email(),
    password: PASSWORD,
    confirm_password: PASSWORD,
    role: UserRole.Student,
    gender: Gender.Male,
    date_of_birth: faker.date.past().toISOString()
  };
  return user;
};

const createRandomPost = () => {
  const post: CreatePostRequestBody = {
    privacy: PostPrivacy.Public,
    content: faker.lorem.paragraph({
      min: 10,
      max: 160
    }),
    tags: [],
    medias: [],
    mentions: [],
    parent_id: null
  };
  return post;
};
const users: RegisterRequestBody[] = faker.helpers.multiple(createRandomUser, {
  count: USER_COUNT
});

const insertMultipleUsers = async (users: RegisterRequestBody[]) => {
  console.log('Creating users...');
  const result = await Promise.all(
    users.map(async (user) => {
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
    })
  );
  console.log(`Created ${result.length} users`);
  return result;
};

const followMultipleUsers = async (user_id: ObjectId, followed_user_ids: ObjectId[]) => {
  console.log('Start following...');
  const result = await Promise.all(
    followed_user_ids.map((followed_user_id) =>
      databaseService.followers.insertOne(
        new Follower({
          user_id,
          followed_user_id: new ObjectId(followed_user_id)
        })
      )
    )
  );
  console.log(`Followed ${result.length} users`);
};

const insertPost = async (user_id: ObjectId, body: CreatePostRequestBody) => {
  //const hashtags = await checkAndCreateHashtags(body.hashtags);
  const result = await databaseService.posts.insertOne(
    new Post({
      privacy: PostPrivacy.Public,
      content: body.content,
      tags: [],
      mentions: [],
      medias: body.medias,
      parent_id: body.parent_id ? new ObjectId(body.parent_id) : null,
      type: PostType.Post,
      user_id: new ObjectId(user_id)
    })
  );
  return result;
};

const insertMultipleTweets = async (ids: ObjectId[]) => {
  console.log('Creating tweets...');
  console.log(`Counting...`);
  let count = 0;
  const result = await Promise.all(
    ids.map(async (id, index) => {
      await Promise.all([insertPost(id, createRandomPost()), insertPost(id, createRandomPost())]);
      count += 2;
      console.log(`Created ${count} tweets`);
    })
  );
  return result;
};

insertMultipleUsers(users).then((ids) => {
  followMultipleUsers(new ObjectId(MYID), ids).catch((err) => {
    console.error('Error when following users');
    console.log(err);
  });
  insertMultipleTweets(ids).catch((err) => {
    console.error('Error when creating tweets');
    console.log(err);
  });
});
