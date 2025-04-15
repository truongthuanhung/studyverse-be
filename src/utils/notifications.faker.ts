import { faker } from '@faker-js/faker';
import { ObjectId } from 'mongodb';
import { NotificationStatus, NotificationType } from '~/constants/enums';
import Notification from '~/models/schemas/Notification.schema';
import databaseService from '~/services/database.services';

const USER_ID = '6721ff410e6b93735147fb10'; // Single user who will receive all notifications
const ACTOR_ID = '6713931d153330d6b91fff76'; // Person who triggers the notification
const GROUP_ID = '676e1e1a6f85a279399367e0';
const QUANTITY = 1000; // Number of notifications to generate

async function seedNotifications() {
  try {
    console.log('🔄 Bắt đầu tạo dữ liệu thông báo giả lập...');

    const notificationTypes = Object.values(NotificationType).filter((type) => typeof type === 'number');

    const insertPromises = [];

    for (let i = 0; i < QUANTITY; i++) {
      // Generate a random reference ID (could be a question, answer, comment, etc.)
      const referenceId = new ObjectId();

      // Random notification type
      const randomTypeIndex = Math.floor(Math.random() * notificationTypes.length);
      const notificationType = notificationTypes[randomTypeIndex] as NotificationType;

      // Generate content based on notification type
      let content = 'has interacted with your content';

      // Generate target URL
      const targetUrl = `groups/${GROUP_ID}/questions/${referenceId}`;

      const notification = new Notification({
        user_id: new ObjectId(USER_ID),
        actor_id: new ObjectId(ACTOR_ID),
        reference_id: referenceId,
        type: notificationType,
        content: content,
        status: NotificationStatus.Unread, // Default to unread
        group_id: new ObjectId(GROUP_ID),
        target_url: targetUrl
      });

      insertPromises.push(databaseService.notifications.insertOne(notification));
    }

    await Promise.all(insertPromises);
    console.log(`✅ Đã tạo thành công ${QUANTITY} thông báo!`);
  } catch (error) {
    console.error('❌ Lỗi khi tạo thông báo:', error);
  }
}

seedNotifications();
