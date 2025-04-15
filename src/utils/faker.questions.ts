import { faker } from '@faker-js/faker';
import { ObjectId } from 'mongodb';
import { StudyGroupRole } from '~/constants/enums';
import Question from '~/models/schemas/Question.schema';
import databaseService from '~/services/database.services';
import questionsService from '~/services/questions.services';

const USER_ID = '6713931d153330d6b91fff76';
const GROUP_ID = '67de63d5a61db2cd7070ca34';

const QUANTITY = 1000;
async function seedQuestions() {
  try {
    console.log('🔄 Bắt đầu tạo dữ liệu câu hỏi giả lập...');

    const fakeQuestions = Array.from({ length: QUANTITY }).map(() => ({
      title: faker.lorem.sentence(),
      content: faker.lorem.paragraphs(2)
    }));

    const insertPromises = fakeQuestions.map((question) =>
      databaseService.questions.insertOne(
        new Question({
          title: faker.lorem.sentence(),
          content: faker.lorem.paragraphs(2),
          group_id: new ObjectId(GROUP_ID),
          user_id: new ObjectId(USER_ID),
          medias: [],
          mentions: [],
          tags: [],
          status: 1
        })
      )
    );

    await Promise.all(insertPromises);
    console.log(`✅ Đã tạo thành công ${QUANTITY} câu hỏi!`);
  } catch (error) {
    console.error('❌ Lỗi khi tạo câu hỏi:', error);
  }
}

seedQuestions();
