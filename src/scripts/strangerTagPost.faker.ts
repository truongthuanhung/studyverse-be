/**
 * Script to create non-friend users with various post types
 *
 * This script:
 * 1. Creates non-friend users
 * 2. Creates posts with tags the current user frequently interacts with
 * 3. Creates posts with tags the current user hasn't interacted with
 * 4. Creates posts without tags
 * 5. Creates trending posts with high like counts
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
import UserTagInteraction from '~/models/schemas/UserTagInteraction';
import { hashPassword } from '~/utils/crypto';

// ID của tài khoản của mình
const MY_ID = new ObjectId('6713931d153330d6b91fff76');
// Số lượng user không phải bạn bè cần tạo
const NON_FRIEND_COUNT = 50;
// Số trending post cần tạo
const TRENDING_POST_COUNT = 20;
// Số post có tag người dùng tương tác nhiều
const RELEVANT_TAG_POST_COUNT = 30;
// Số post có tag người dùng chưa tương tác
const IRRELEVANT_TAG_POST_COUNT = 30;
// Số post không có tag
const NO_TAG_POST_COUNT = 20;
// Số lượng like cho trending post (ngẫu nhiên trong khoảng)
const MIN_TRENDING_LIKES = 50;
const MAX_TRENDING_LIKES = 200;
// Mật khẩu cho các fake user
const PASSWORD = 'Duoc123!';

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

// Lấy các tag người dùng tương tác nhiều (top N)
const getTopInteractedTags = async (limit: number) => {
  const interactions = await databaseService.user_tag_interactions
    .find({ user_id: MY_ID })
    .sort({ interaction_score: -1 })
    .limit(limit)
    .toArray();

  const tagIds = interactions.map((interaction) => interaction.tag_id);

  // Lấy thông tin chi tiết của các tag
  const tags = await databaseService.tags.find({ _id: { $in: tagIds } }).toArray();

  return tags.map(
    (doc) =>
      new Tag({
        _id: doc._id,
        name: doc.name,
        created_at: doc.created_at,
        updated_at: doc.updated_at
      })
  );
};

// Lấy các tag người dùng chưa tương tác
const getNonInteractedTags = async (limit: number) => {
  // Lấy danh sách tag_id đã tương tác
  const interactions = await databaseService.user_tag_interactions.find({ user_id: MY_ID }).toArray();

  const interactedTagIds = interactions.map((interaction) => interaction.tag_id);

  // Lấy các tag chưa tương tác
  const nonInteractedTags = await databaseService.tags
    .find({ _id: { $nin: interactedTagIds } })
    .limit(limit)
    .toArray();

  return nonInteractedTags.map(
    (doc) =>
      new Tag({
        _id: doc._id,
        name: doc.name,
        created_at: doc.created_at,
        updated_at: doc.updated_at
      })
  );
};

// Lấy random tags từ database
const getRandomTags = async (limit: number) => {
  const cursor = databaseService.tags.aggregate([{ $sample: { size: limit } }]);
  const tagDocs = await cursor.toArray();

  return tagDocs.map(
    (doc) =>
      new Tag({
        _id: doc._id,
        name: doc.name,
        created_at: doc.created_at,
        updated_at: doc.updated_at
      })
  );
};

// Tạo bài viết với tag
const createPostWithTags = async (user_id: ObjectId, tags: Tag[] = [], includeTags: boolean = true) => {
  let tagIds: ObjectId[] = [];

  if (includeTags && tags.length > 0) {
    // Chọn ngẫu nhiên 1-3 tag cho bài viết
    const postTagCount = Math.floor(Math.random() * 3) + 1;
    const selectedTags = tags.sort(() => 0.5 - Math.random()).slice(0, postTagCount);
    tagIds = selectedTags.map((tag) => tag._id!);
  }

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

// Tạo nhiều like cho một bài viết trending
const createLikesForTrendingPost = async (post: Post, likeCount: number) => {
  // Tạo danh sách các user đã like
  for (let i = 0; i < likeCount; i++) {
    // Tạo một fake user ID để like
    const fakeUserId = new ObjectId();

    // Tạo like cho bài viết
    const like = new Like({
      user_id: fakeUserId,
      target_id: post._id!,
      type: LikeType.PostLike
    });

    await databaseService.likes.insertOne(like);
  }

  // Cập nhật số like của bài viết
  await databaseService.posts.updateOne({ _id: post._id }, { $set: { like_count: likeCount } });

  console.log(`Created ${likeCount} likes for trending post: ${post._id}`);
};

// Thực hiện like một bài viết
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

// Hàm chính để tạo dữ liệu
const createNonFriendsWithPosts = async () => {
  console.log('Starting to create non-friend users with various post types...');

  try {
    // 1. Kết nối đến database
    await databaseService.connect();

    // 2. Lấy tag người dùng tương tác nhiều
    console.log('Fetching tags the user frequently interacts with...');
    const frequentTags = await getTopInteractedTags(10);
    console.log(`Found ${frequentTags.length} frequently interacted tags`);

    // 3. Lấy tag người dùng chưa tương tác
    console.log('Fetching tags the user has not interacted with...');
    const nonInteractedTags = await getNonInteractedTags(10);
    console.log(`Found ${nonInteractedTags.length} non-interacted tags`);

    // 4. Nếu không đủ tag chưa tương tác, lấy thêm tag ngẫu nhiên
    let fallbackTags: Tag[] = [];
    if (nonInteractedTags.length < 10) {
      console.log('Not enough non-interacted tags, fetching random tags as fallback...');
      fallbackTags = await getRandomTags(10 - nonInteractedTags.length);
    }

    const unusedTags = [...nonInteractedTags, ...fallbackTags];

    // 5. Tạo danh sách user IDs để lưu trữ các user mới
    const nonFriendUserIds: ObjectId[] = [];

    // 6. Tạo NON_FRIEND_COUNT user mới không phải là bạn bè
    console.log(`Creating ${NON_FRIEND_COUNT} new non-friend users...`);
    for (let i = 0; i < NON_FRIEND_COUNT; i++) {
      const newUser = createRandomUser();
      const userId = await insertUser(newUser);
      nonFriendUserIds.push(userId);
      console.log(`Created non-friend user ${i + 1}/${NON_FRIEND_COUNT}: ${userId.toString()}`);
    }

    // 7. Tạo bài viết với tag người dùng tương tác nhiều
    console.log(`Creating ${RELEVANT_TAG_POST_COUNT} posts with relevant tags...`);
    const relevantTagPosts: Post[] = [];

    for (let i = 0; i < RELEVANT_TAG_POST_COUNT; i++) {
      // Chọn ngẫu nhiên một user không phải bạn bè
      const randomUserIndex = Math.floor(Math.random() * nonFriendUserIds.length);
      const userId = nonFriendUserIds[randomUserIndex];

      // Tạo bài viết với tag người dùng tương tác nhiều
      const { post } = await createPostWithTags(userId, frequentTags);
      relevantTagPosts.push(post);

      console.log(`Created post ${i + 1}/${RELEVANT_TAG_POST_COUNT} with relevant tags for user ${userId.toString()}`);
    }

    // 8. Tạo bài viết với tag người dùng chưa tương tác
    console.log(`Creating ${IRRELEVANT_TAG_POST_COUNT} posts with irrelevant tags...`);

    for (let i = 0; i < IRRELEVANT_TAG_POST_COUNT; i++) {
      // Chọn ngẫu nhiên một user không phải bạn bè
      const randomUserIndex = Math.floor(Math.random() * nonFriendUserIds.length);
      const userId = nonFriendUserIds[randomUserIndex];

      // Tạo bài viết với tag người dùng chưa tương tác
      const { post } = await createPostWithTags(userId, unusedTags);

      console.log(
        `Created post ${i + 1}/${IRRELEVANT_TAG_POST_COUNT} with irrelevant tags for user ${userId.toString()}`
      );
    }

    // 9. Tạo bài viết không có tag
    console.log(`Creating ${NO_TAG_POST_COUNT} posts without tags...`);

    for (let i = 0; i < NO_TAG_POST_COUNT; i++) {
      // Chọn ngẫu nhiên một user không phải bạn bè
      const randomUserIndex = Math.floor(Math.random() * nonFriendUserIds.length);
      const userId = nonFriendUserIds[randomUserIndex];

      // Tạo bài viết không có tag
      const { post } = await createPostWithTags(userId, [], false);

      console.log(`Created post ${i + 1}/${NO_TAG_POST_COUNT} without tags for user ${userId.toString()}`);
    }

    // 10. Tạo bài viết trending (nhiều like)
    console.log(`Creating ${TRENDING_POST_COUNT} trending posts...`);
    const trendingPosts: Post[] = [];

    for (let i = 0; i < TRENDING_POST_COUNT; i++) {
      // Chọn ngẫu nhiên một user không phải bạn bè
      const randomUserIndex = Math.floor(Math.random() * nonFriendUserIds.length);
      const userId = nonFriendUserIds[randomUserIndex];

      // 70% khả năng dùng tag người dùng tương tác nhiều, 30% dùng tag chưa tương tác
      const useRelevantTags = Math.random() < 0.7;
      const tagsToUse = useRelevantTags ? frequentTags : unusedTags;

      // Tạo bài viết trending
      const { post } = await createPostWithTags(userId, tagsToUse);
      trendingPosts.push(post);

      // Tạo một số lượng like ngẫu nhiên trong khoảng MIN_TRENDING_LIKES và MAX_TRENDING_LIKES
      const likeCount = Math.floor(Math.random() * (MAX_TRENDING_LIKES - MIN_TRENDING_LIKES + 1)) + MIN_TRENDING_LIKES;
      await createLikesForTrendingPost(post, likeCount);

      console.log(
        `Created trending post ${i + 1}/${TRENDING_POST_COUNT} with ${likeCount} likes for user ${userId.toString()}`
      );
    }

    // 11. Tương tác (like) một số bài viết với tag người dùng thường tương tác
    console.log('Creating likes for random posts with relevant tags...');

    // Like khoảng 40% các bài có tag liên quan
    const postsToLike = Math.floor(relevantTagPosts.length * 0.4);
    const postsToLikeIndices = Array.from({ length: relevantTagPosts.length }, (_, i) => i)
      .sort(() => 0.5 - Math.random())
      .slice(0, postsToLike);

    for (const index of postsToLikeIndices) {
      const post = relevantTagPosts[index];
      await likePost(MY_ID, post);
      console.log(`Current user liked post with relevant tags: ${post._id}`);
    }

    console.log('Non-friend users and various post types created successfully!');
    console.log(`- Created ${NON_FRIEND_COUNT} non-friend users`);
    console.log(`- Created ${RELEVANT_TAG_POST_COUNT} posts with relevant tags`);
    console.log(`- Created ${IRRELEVANT_TAG_POST_COUNT} posts with irrelevant tags`);
    console.log(`- Created ${NO_TAG_POST_COUNT} posts without tags`);
    console.log(`- Created ${TRENDING_POST_COUNT} trending posts with high like counts`);
    console.log(`- Current user liked ${postsToLike} posts with relevant tags`);
  } catch (error) {
    console.error('An error occurred:', error);
    throw error;
  }
};

// Định nghĩa điểm tương tác (lấy từ schema của bạn)
const InteractionScore = {
  [InteractionType.Like]: 1,
  [InteractionType.Comment]: 3,
  [InteractionType.Post]: 5,
  [InteractionType.Share]: 4
};

// Thực thi script
createNonFriendsWithPosts()
  .then(() => {
    console.log('Script completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Error executing script:', error);
    process.exit(1);
  });
