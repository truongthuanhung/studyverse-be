/**
 * Script to generate posts for friends of a specified user
 *
 * Requirements:
 * - Find all friends of the user with ID '6713931d153330d6b91fff76'
 * - Each friend will create 5 random posts
 */

import { faker } from '@faker-js/faker';
import { ObjectId } from 'mongodb';
import { PostPrivacy, PostType } from '~/constants/enums';
import Post from '~/models/schemas/Post.schema';
import databaseService from '~/services/database.services';

// ID của tài khoản của mình
const MY_ID = new ObjectId('6713931d153330d6b91fff76');
// Số lượng bài viết mỗi người bạn cần tạo
const POST_COUNT_PER_FRIEND = 5;

// Hàm tạo nội dung bài post ngẫu nhiên
const createRandomPost = (userId: ObjectId) => {
  const postType = PostType.Post; // Default type is normal post
  const postContent = faker.lorem.paragraphs(2); // Tạo nội dung ngẫu nhiên

  const post = new Post({
    content: postContent,
    type: postType,
    privacy: Math.random() > 0.3 ? PostPrivacy.Public : PostPrivacy.Friends, // 70% là public, 30% là friend
    user_id: userId,
    parent_id: null,
    tags: [],
    medias: Math.random() > 0.5 ? [faker.image.url()] : [], // 50% có media
    mentions: []
  });

  return post;
};

// Hàm tìm danh sách bạn bè của user
const findFriendsOfUser = async (userId: ObjectId) => {
  // Tìm tất cả các bản ghi friend có chứa userId
  const friends = await databaseService.friends
    .find({
      $or: [{ user_id1: userId }, { user_id2: userId }]
    })
    .toArray();

  // Lấy ra danh sách ID của bạn bè
  const friendIds: ObjectId[] = [];

  for (const friend of friends) {
    if (friend.user_id1.equals(userId)) {
      friendIds.push(friend.user_id2);
    } else {
      friendIds.push(friend.user_id1);
    }
  }

  return friendIds;
};

// Hàm tạo bài viết cho các bạn
const createPostsForFriends = async () => {
  console.log(`Starting to create posts for friends of user: ${MY_ID.toString()}`);

  // Tìm danh sách bạn bè
  const friendIds = await findFriendsOfUser(MY_ID);
  console.log(`Found ${friendIds.length} friends`);

  if (friendIds.length === 0) {
    console.log('No friends found. Exiting...');
    return;
  }

  // Lấy thông tin chi tiết của các bạn bè để log
  const friendsInfo = await databaseService.users
    .find({
      _id: { $in: friendIds }
    })
    .project({ name: 1, email: 1 })
    .toArray();

  console.log('Friends found:');
  friendsInfo.forEach((friend, index) => {
    console.log(`${index + 1}. ${friend.name} (${friend.email}) - ID: ${friend._id.toString()}`);
  });

  // Tạo bài viết cho mỗi người bạn
  let totalPostsCreated = 0;

  for (let i = 0; i < friendIds.length; i++) {
    const friendId = friendIds[i];
    const friendInfo = friendsInfo.find((f) => f._id.equals(friendId));

    console.log(`Creating ${POST_COUNT_PER_FRIEND} posts for friend: ${friendInfo?.name || friendId.toString()}`);

    // Tạo POST_COUNT_PER_FRIEND bài viết cho mỗi người bạn
    for (let j = 0; j < POST_COUNT_PER_FRIEND; j++) {
      const newPost = createRandomPost(friendId);
      await databaseService.posts.insertOne(newPost);

      totalPostsCreated++;
      console.log(`Created post ${j + 1}/${POST_COUNT_PER_FRIEND} for friend ${i + 1}/${friendIds.length}`);
    }
  }

  console.log(
    `Successfully created ${totalPostsCreated} posts for ${friendIds.length} friends of user: ${MY_ID.toString()}`
  );
};

// Thực thi script
createPostsForFriends()
  .then(() => {
    console.log('Script completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Error executing script:', error);
    process.exit(1);
  });
