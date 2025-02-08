import { faker } from '@faker-js/faker';
import questionsService from '~/services/questions.services';

const USER_ID = '6713931d153330d6b91fff76';
const GROUP_ID = '676e1e1a6f85a279399367e0';

async function seedQuestions() {
  try {
    console.log('🔄 Bắt đầu tạo dữ liệu câu hỏi giả lập...');

    const fakeQuestions = Array.from({ length: 10 }).map(() => ({
      title: faker.lorem.sentence(),
      content: faker.lorem.paragraphs(2),
      medias: [],
      tags: [],
      mentions: []
    }));

    const insertPromises = fakeQuestions.map((question) =>
      questionsService.createQuestion({
        user_id: USER_ID,
        group_id: GROUP_ID,
        question
      })
    );

    await Promise.all(insertPromises);
    console.log('✅ Đã tạo thành công 10 câu hỏi!');
  } catch (error) {
    console.error('❌ Lỗi khi tạo câu hỏi:', error);
  }
}

seedQuestions();
