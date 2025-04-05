import { faker } from '@faker-js/faker';
import { ObjectId } from 'mongodb';
import { QuestionStatus } from '~/constants/enums';
import Question from '~/models/schemas/Question.schema';
import Reply from '~/models/schemas/Reply.schema';
import databaseService from '~/services/database.services';

const USER_ID = '6713931d153330d6b91fff76';
const GROUP_ID = '67dff95c40aa450210dad711';

async function seedQuestionWithReplies() {
  try {
    console.log('🔄 Bắt đầu tạo dữ liệu câu hỏi và trả lời...');

    // Create one main question
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

    // Insert the question and get its ID
    const questionResult = await databaseService.questions.insertOne(question);
    const questionId = questionResult.insertedId;

    console.log(`✅ Đã tạo thành công câu hỏi với ID: ${questionId}`);

    // Create 11 direct replies to the question
    const parentReplies = [];
    for (let i = 0; i < 11; i++) {
      const reply = new Reply({
        user_id: new ObjectId(USER_ID),
        question_id: questionId,
        parent_id: null,
        medias: [],
        content: faker.lorem.paragraphs(1)
      });
      parentReplies.push(reply);
    }

    // Insert all 11 parent replies
    const parentRepliesResult = await databaseService.replies.insertMany(parentReplies);
    console.log(`✅ Đã tạo thành công 11 trả lời cho câu hỏi`);

    // Get the ID of the 3rd reply (index 2) to add 100 child replies to it
    const parentReplyIds = Object.values(parentRepliesResult.insertedIds);
    const targetParentId = parentReplyIds[2]; // Third reply

    // Create 100 child replies to the target parent reply
    const childReplies = [];
    for (let i = 0; i < 100; i++) {
      const childReply = new Reply({
        user_id: new ObjectId(USER_ID),
        question_id: questionId,
        parent_id: targetParentId,
        medias: [],
        content: faker.lorem.paragraph()
      });
      childReplies.push(childReply);
    }

    // Insert all 100 child replies
    await databaseService.replies.insertMany(childReplies);
    console.log(`✅ Đã tạo thành công 100 trả lời con cho trả lời có ID: ${targetParentId}`);

    // Update the reply count of the question
    await databaseService.questions.updateOne(
      { _id: questionId },
      { $set: { reply_count: 111 } } // 11 parent replies + 100 child replies
    );

    console.log('✅ Hoàn thành tạo dữ liệu!');
    console.log({
      questionId: questionId.toString(),
      parentReplyWithChildren: targetParentId.toString(),
      totalReplies: 111
    });
  } catch (error) {
    console.error('❌ Lỗi khi tạo dữ liệu:', error);
  } finally {
    // Optional: Close database connection if needed
    // await databaseService.client.close();
  }
}

seedQuestionWithReplies();
