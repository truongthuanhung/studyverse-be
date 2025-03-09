import { ObjectId } from 'mongodb';
import { NotificationStatus, NotificationType } from '~/constants/enums';

interface INotification {
  _id?: ObjectId;
  user_id: ObjectId;
  actor_id: ObjectId;
  reference_id: ObjectId;
  type: NotificationType;
  content: string;
  status: NotificationStatus;
  group_id?: ObjectId;
  target_url?: string;
  created_at?: Date;
}

export default class Notification {
  _id?: ObjectId;
  user_id: ObjectId;
  actor_id: ObjectId;
  reference_id: ObjectId;
  type: NotificationType;
  content: string;
  status: NotificationStatus;
  group_id?: ObjectId;
  target_url?: string;
  created_at: Date;

  constructor(notification: INotification) {
    this._id = notification._id;
    this.user_id = notification.user_id;
    this.actor_id = notification.actor_id;
    this.reference_id = notification.reference_id;
    this.type = notification.type;
    this.content = notification.content;
    this.status = notification.status;
    this.group_id = notification.group_id;
    this.target_url = notification.target_url;
    this.created_at = notification.created_at || new Date();
  }
}
