import { ObjectId } from 'mongodb';

interface IUserBadge {
  _id?: ObjectId;
  user_id: ObjectId;
  group_id: ObjectId;
  badge_id: ObjectId;
  created_at?: Date;
}

class UserBadge {
  _id?: ObjectId;
  user_id: ObjectId;
  group_id: ObjectId;
  badge_id: ObjectId;
  created_at: Date;

  constructor({ _id, user_id, group_id, badge_id, created_at }: IUserBadge) {
    this._id = _id;
    this.user_id = user_id;
    this.group_id = group_id;
    this.badge_id = badge_id;
    this.created_at = created_at || new Date();
  }
}

export default UserBadge;
