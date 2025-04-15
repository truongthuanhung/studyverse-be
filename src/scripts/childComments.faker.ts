import { faker } from '@faker-js/faker';
import { ObjectId } from 'mongodb';
import { PostPrivacy, PostType } from '~/constants/enums';
import Post from '~/models/schemas/Post.schema';
import Comment from '~/models/schemas/Comment.schema';
import databaseService from '~/services/database.services';

const USER_ID = '6713931d153330d6b91fff76';

async function seedPostWithComplexCommentStructure() {
  try {
    console.log('Bắt đầu tạo dữ liệu bài viết và cấu trúc comments phức tạp...');

    // 1. Tạo bài viết chính
    const post = new Post({
      content: faker.lorem.paragraphs(3),
      type: PostType.Post,
      privacy: PostPrivacy.Public,
      user_id: new ObjectId(USER_ID),
      parent_id: null,
      medias: [],
      mentions: [],
      tags: []
    });

    // Insert bài viết và lấy ID
    const postResult = await databaseService.posts.insertOne(post);
    const postId = postResult.insertedId;

    console.log(`Đã tạo thành công bài viết với ID: ${postId}`);

    // 2. Tạo 25 comments chính (parent comments)
    const parentComments = [];
    for (let i = 0; i < 25; i++) {
      const comment = new Comment({
        user_id: new ObjectId(USER_ID),
        post_id: postId,
        parent_id: null,
        content: faker.lorem.paragraphs(1)
      });
      parentComments.push(comment);
    }

    // Insert tất cả 25 parent comments
    const parentCommentsResult = await databaseService.comments.insertMany(parentComments);
    console.log(`Đã tạo thành công 25 comments cho bài viết`);

    // 3. Chọn 5 parent comments để thêm comments con
    const parentCommentIds = Object.values(parentCommentsResult.insertedIds);
    const selectedParentIds = [
      parentCommentIds[2], // Comment thứ 3
      parentCommentIds[7], // Comment thứ 8
      parentCommentIds[12], // Comment thứ 13
      parentCommentIds[18], // Comment thứ 19
      parentCommentIds[23] // Comment thứ 24
    ];

    // 4. Thêm ~80 comments con cho mỗi selected parent comment
    let totalChildComments = 0;
    for (const parentId of selectedParentIds) {
      // Số lượng comments con ngẫu nhiên từ 75-85 để tạo sự đa dạng
      const childCommentCount = faker.number.int({ min: 75, max: 85 });

      const childComments = [];
      for (let i = 0; i < childCommentCount; i++) {
        const childComment = new Comment({
          user_id: new ObjectId(USER_ID),
          post_id: postId,
          parent_id: parentId,
          content: faker.lorem.paragraph()
        });
        childComments.push(childComment);
      }

      // Insert tất cả child comments cho parent comment hiện tại
      await databaseService.comments.insertMany(childComments);
      console.log(`Đã tạo thành công ${childCommentCount} comments con cho comment ID: ${parentId}`);

      // Cập nhật comment_count cho parent comment
      await databaseService.comments.updateOne({ _id: parentId }, { $set: { comment_count: childCommentCount } });

      totalChildComments += childCommentCount;
    }

    // 5. Cập nhật tổng số comment_count cho post
    const totalComments = 25 + totalChildComments;
    await databaseService.posts.updateOne({ _id: postId }, { $set: { comment_count: totalComments } });

    console.log('Hoàn thành tạo dữ liệu phức tạp!');
    console.log({
      postId: postId.toString(),
      parentCommentCount: 25,
      parentCommentsWithChildren: selectedParentIds.map((id) => id.toString()),
      totalChildComments: totalChildComments,
      totalComments: totalComments
    });

    return {
      postId: postId.toString(),
      totalComments: totalComments
    };
  } catch (error) {
    console.error('Lỗi khi tạo dữ liệu:', error);
    throw error;
  }
}

// Chạy hàm tạo dữ liệu
seedPostWithComplexCommentStructure()
  .then((result) => {
    console.log('Thành công:', result);
  })
  .catch((err) => {
    console.error('Lỗi:', err);
  });
