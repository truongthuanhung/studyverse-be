import { NotificationType } from '~/constants/enums';

export interface CreateNotificationBody {
  user_id: string;
  actor_id: string;
  reference_id: string;
  type: NotificationType;
  content: string;
  target_url?: string;
}
