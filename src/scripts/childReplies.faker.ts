import { faker } from '@faker-js/faker';
import { ObjectId } from 'mongodb';
import { QuestionStatus } from '~/constants/enums';
import Question from '~/models/schemas/Question.schema';
import Reply from '~/models/schemas/Reply.schema';
import databaseService from '~/services/database.services';

const USER_ID = '6713931d153330d6b91fff76';
const GROUP_ID = '67f3fdf23c952261db26dd0c';

async function seedComplexQuestionStructure() {
  try {
    console.log('Bắt đầu tạo dữ liệu câu hỏi và cấu trúc replies phức tạp...');

    // 1. Tạo câu hỏi chính
    const question = new Question({
      title: faker.lorem.sentence(),
      content: faker.lorem.paragraphs(3),
      group_id: new ObjectId(GROUP_ID),
      user_id: new ObjectId(USER_ID),
      medias: [],
      mentions: [],
      tags: [],
      status: QuestionStatus.Open
    });

    // Insert câu hỏi và lấy ID
    const questionResult = await databaseService.questions.insertOne(question);
    const questionId = questionResult.insertedId;

    console.log(`Đã tạo thành công câu hỏi với ID: ${questionId}`);

    // 2. Tạo 29 replies chính (parent replies)
    const parentReplies = [];
    for (let i = 0; i < 29; i++) {
      const reply = new Reply({
        user_id: new ObjectId(USER_ID),
        question_id: questionId,
        parent_id: null,
        medias: [],
        content: faker.lorem.paragraphs(1)
      });
      parentReplies.push(reply);
    }

    // Insert tất cả 29 parent replies
    const parentRepliesResult = await databaseService.replies.insertMany(parentReplies);
    console.log(`Đã tạo thành công 29 replies cho câu hỏi`);

    // 3. Chọn 5 parent replies để thêm replies con
    const parentReplyIds = Object.values(parentRepliesResult.insertedIds);
    const selectedParentIds = [
      parentReplyIds[3], // Reply thứ 4
      parentReplyIds[8], // Reply thứ 9
      parentReplyIds[15], // Reply thứ 16
      parentReplyIds[21], // Reply thứ 22
      parentReplyIds[27] // Reply thứ 28
    ];

    // 4. Thêm ~100 replies con cho mỗi selected parent reply
    let totalChildReplies = 0;
    for (const parentId of selectedParentIds) {
      // Số lượng replies con ngẫu nhiên từ 95-105 để tạo sự đa dạng
      const childReplyCount = faker.number.int({ min: 95, max: 105 });

      const childReplies = [];
      for (let i = 0; i < childReplyCount; i++) {
        const childReply = new Reply({
          user_id: new ObjectId(USER_ID),
          question_id: questionId,
          parent_id: parentId,
          medias: [],
          content: faker.lorem.paragraph()
        });
        childReplies.push(childReply);
      }

      // Insert tất cả child replies cho parent reply hiện tại
      await databaseService.replies.insertMany(childReplies);
      console.log(`Đã tạo thành công ${childReplyCount} replies con cho reply ID: ${parentId}`);

      // Cập nhật reply_count cho parent reply
      await databaseService.replies.updateOne({ _id: parentId }, { $set: { reply_count: childReplyCount } });

      totalChildReplies += childReplyCount;
    }

    // 5. Cập nhật tổng số reply_count cho question
    const totalReplies = 29 + totalChildReplies;
    await databaseService.questions.updateOne({ _id: questionId }, { $set: { reply_count: totalReplies } });

    console.log('Hoàn thành tạo dữ liệu phức tạp!');
    console.log({
      questionId: questionId.toString(),
      parentReplyCount: 29,
      parentRepliesWithChildren: selectedParentIds.map((id) => id.toString()),
      totalChildReplies: totalChildReplies,
      totalReplies: totalReplies
    });

    return {
      questionId: questionId.toString(),
      totalReplies: totalReplies
    };
  } catch (error) {
    console.error('Lỗi khi tạo dữ liệu:', error);
    throw error;
  }
}

// Chạy hàm tạo dữ liệu
seedComplexQuestionStructure()
  .then((result) => {
    console.log('Thành công:', result);
  })
  .catch((err) => {
    console.error('Lỗi:', err);
  });
