/**
 * Script to create fake friends with posts and tag interactions
 *
 * This script:
 * 1. Creates 100 friend users
 * 2. Creates mutual follow relationships and friend records
 * 3. Uses existing tags from the database
 * 4. Has each friend create 3 posts with tags
 * 5. Makes the current user like selected posts to build tag interactions
 */

import { faker } from '@faker-js/faker';
import { ObjectId } from 'mongodb';
import {
  Gender,
  UserRole,
  UserVerifyStatus,
  PostPrivacy,
  PostType,
  LikeType,
  InteractionType
} from '~/constants/enums';
import { RegisterRequestBody } from '~/models/requests/User.requests';
import User from '~/models/schemas/User.schema';
import Post from '~/models/schemas/Post.schema';
import Tag from '~/models/schemas/Tag.schema';
import Like from '~/models/schemas/Like.schema';
import databaseService from '~/services/database.services';
import { Follower } from '~/models/schemas/Follower.schema';
import { Friend } from '~/models/schemas/Friend.schema';
import UserTagInteraction from '~/models/schemas/UserTagInteraction';
import { hashPassword } from '~/utils/crypto';

// ID của tài khoản của mình
const MY_ID = new ObjectId('6713931d153330d6b91fff76');
// Số lượng bạn bè cần tạo
const FRIEND_COUNT = 100;
// Số lượng bài post mỗi người
const POSTS_PER_USER = 3;
// Số lượng tag sẽ sử dụng (từ tags hiện có)
const TAGS_TO_USE = 20;
// Mật khẩu cho các fake user
const PASSWORD = 'Duoc123!';
// Xác suất user chính like một bài viết (50%)
const LIKE_PROBABILITY = 0.5;
// Định nghĩa điểm tương tác
const InteractionScore = {
  [InteractionType.Like]: 1,
  [InteractionType.Comment]: 3,
  [InteractionType.Post]: 5,
  [InteractionType.Share]: 4
};

// Tạo một user ngẫu nhiên
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

// Tạo và lưu user vào database
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

// Tạo quan hệ follow
const createFollowerRelationship = async (user_id: ObjectId, followed_user_id: ObjectId) => {
  await databaseService.followers.insertOne(
    new Follower({
      user_id,
      followed_user_id
    })
  );
};

// Tạo quan hệ bạn bè
const createFriendRelationship = async (user_id1: ObjectId, user_id2: ObjectId) => {
  await databaseService.friends.insertOne(
    new Friend({
      user_id1,
      user_id2
    })
  );
};

// Lấy các tag hiện có từ database
const getExistingTags = async (limit: number) => {
  // Lấy random tags từ collection
  const cursor = databaseService.tags.aggregate([{ $sample: { size: limit } }]);

  // Lấy các document từ database
  const tagDocs = await cursor.toArray();

  // Chuyển đổi từ document sang đối tượng Tag
  const tags: Tag[] = tagDocs.map(
    (doc) =>
      new Tag({
        _id: doc._id,
        name: doc.name,
        created_at: doc.created_at,
        updated_at: doc.updated_at
      })
  );

  console.log(`Fetched ${tags.length} existing tags from database`);
  return tags;
};

// Tạo bài viết với tag
const createPostWithTags = async (user_id: ObjectId, tags: Tag[]) => {
  // Chọn ngẫu nhiên 1-3 tag cho bài viết
  const postTagCount = Math.floor(Math.random() * 3) + 1;
  const selectedTags = tags.sort(() => 0.5 - Math.random()).slice(0, postTagCount);
  const tagIds = selectedTags.map((tag) => tag._id!);

  const post = new Post({
    content: faker.lorem.paragraph(),
    type: PostType.Post,
    privacy: PostPrivacy.Public,
    user_id,
    parent_id: null,
    tags: tagIds
  });

  const result = await databaseService.posts.insertOne(post);
  post._id = result.insertedId;

  return { post, tagIds };
};

// Cập nhật điểm tương tác cho tag
const updateTagInteraction = async (user_id: ObjectId, tag_id: ObjectId, interactionType: InteractionType) => {
  const score = InteractionScore[interactionType];

  // Tìm bản ghi tương tác hiện có
  const existingInteraction = await databaseService.user_tag_interactions.findOne({
    user_id,
    tag_id
  });

  if (existingInteraction) {
    // Cập nhật điểm tương tác
    await databaseService.user_tag_interactions.updateOne(
      { user_id, tag_id },
      {
        $inc: { interaction_score: score },
        $set: { last_interacted_at: new Date() }
      }
    );
  } else {
    // Tạo bản ghi tương tác mới
    const interaction = new UserTagInteraction({
      user_id,
      tag_id,
      interaction_score: score
    });
    await databaseService.user_tag_interactions.insertOne(interaction);
  }
};

// Like một bài viết và cập nhật tương tác tag
const likePost = async (user_id: ObjectId, post: Post) => {
  // Tạo like cho bài viết
  const like = new Like({
    user_id,
    target_id: post._id!,
    type: LikeType.PostLike
  });

  await databaseService.likes.insertOne(like);

  // Tăng số like của bài viết
  await databaseService.posts.updateOne({ _id: post._id }, { $inc: { like_count: 1 } });

  // Cập nhật điểm tương tác cho mỗi tag trong bài viết
  for (const tag_id of post.tags) {
    await updateTagInteraction(user_id, tag_id, InteractionType.Like);
  }

  return like;
};

// Hàm chính để tạo dữ liệu
const createFriendsWithPosts = async () => {
  console.log('Starting to create friendships, posts, and interactions...');

  try {
    // 1. Kết nối đến database
    await databaseService.connect();

    // 2. Lấy các tag có sẵn
    console.log(`Fetching ${TAGS_TO_USE} existing tags from database...`);
    const tags = await getExistingTags(TAGS_TO_USE);

    if (tags.length === 0) {
      throw new Error('Could not fetch any tags from the database');
    }

    // 3. Tạo danh sách user IDs để lưu trữ các user mới
    const friendUserIds: ObjectId[] = [];
    const friendPostsMap: Map<string, Post[]> = new Map();

    // 4. Tạo FRIEND_COUNT user mới
    console.log(`Creating ${FRIEND_COUNT} new users...`);
    for (let i = 0; i < FRIEND_COUNT; i++) {
      const newUser = createRandomUser();
      const userId = await insertUser(newUser);
      friendUserIds.push(userId);
      console.log(`Created user ${i + 1}/${FRIEND_COUNT}: ${userId.toString()}`);

      // 5. Tạo quan hệ follow hai chiều
      await createFollowerRelationship(MY_ID, userId);
      await createFollowerRelationship(userId, MY_ID);

      // 6. Tạo bản ghi friend
      await createFriendRelationship(MY_ID, userId);

      // 7. Tạo bài viết cho user
      const userPosts: Post[] = [];
      for (let j = 0; j < POSTS_PER_USER; j++) {
        const { post } = await createPostWithTags(userId, tags);
        userPosts.push(post);
        console.log(`Created post ${j + 1}/${POSTS_PER_USER} for user ${userId.toString()}`);
      }

      friendPostsMap.set(userId.toString(), userPosts);
    }

    // 8. Like một số bài viết để tạo điểm tương tác
    console.log('Creating likes and tag interactions...');

    // Tạo một phân phối không đồng đều cho các tag để một số tag được tương tác nhiều hơn
    const tagPreferences: ObjectId[] = [];

    // Chọn một số tag ưu tiên (sẽ được tương tác nhiều hơn)
    const priorityTags = tags.slice(0, 5).map((tag) => tag._id!);

    // Thêm các tag ưu tiên nhiều lần vào danh sách để tăng xác suất được chọn
    for (let i = 0; i < 10; i++) {
      tagPreferences.push(...priorityTags);
    }

    // Thêm các tag khác vào danh sách với tần suất thấp hơn
    const otherTags = tags.slice(5).map((tag) => tag._id!);
    tagPreferences.push(...otherTags);

    // Tạo object lưu trữ số lần tương tác với mỗi tag
    const tagInteractionCount: Record<string, number> = {};

    // Like các bài viết
    for (const [userId, posts] of friendPostsMap.entries()) {
      for (const post of posts) {
        // Kiểm tra xem bài viết có chứa tag ưu tiên không
        const hasPreferredTag = post.tags.some((tagId) =>
          priorityTags.some((pt) => pt.toString() === tagId.toString())
        );

        // Tăng xác suất like nếu bài viết có tag ưu tiên
        const adjustedLikeProbability = hasPreferredTag
          ? Math.min(LIKE_PROBABILITY * 2, 0.9) // Tăng gấp đôi nhưng không quá 90%
          : LIKE_PROBABILITY;

        if (Math.random() < adjustedLikeProbability) {
          await likePost(MY_ID, post);

          // Cập nhật số lần tương tác với từng tag
          post.tags.forEach((tagId) => {
            const tagIdStr = tagId.toString();
            tagInteractionCount[tagIdStr] = (tagInteractionCount[tagIdStr] || 0) + 1;
          });

          console.log(`Liked post from user ${userId} with tags: ${post.tags.map((t) => t.toString()).join(', ')}`);
        }
      }
    }

    // In thống kê tương tác tag
    console.log('Tag interaction statistics:');
    for (const [tagId, count] of Object.entries(tagInteractionCount)) {
      const tag = tags.find((t) => t._id!.toString() === tagId);
      if (tag) {
        console.log(`  Tag "${tag.name}": ${count} interactions`);
      }
    }

    console.log(
      `Successfully created ${FRIEND_COUNT} friendships, ${FRIEND_COUNT * POSTS_PER_USER} posts, and tag interactions!`
    );
  } catch (error) {
    console.error('An error occurred:', error);
    throw error;
  }
};

// Thực thi script
createFriendsWithPosts()
  .then(() => {
    console.log('Script completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Error executing script:', error);
    process.exit(1);
  });
