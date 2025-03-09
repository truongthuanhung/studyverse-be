import { ObjectId } from 'mongodb';

interface IFriend {
  _id?: ObjectId;
  user_id1: ObjectId;
  user_id2: ObjectId;
  created_at?: Date;
}

export class Friend {
  _id?: ObjectId;
  user_id1: ObjectId;
  user_id2: ObjectId;
  created_at: Date;

  constructor(friend: IFriend) {
    this._id = friend._id;
    const [smallerId, largerId] = this.sortUserIds(friend.user_id1, friend.user_id2);
    this.user_id1 = smallerId;
    this.user_id2 = largerId;
    this.created_at = friend.created_at || new Date();
  }

  private sortUserIds(id1: ObjectId, id2: ObjectId): [ObjectId, ObjectId] {
    if (id1.toString() < id2.toString()) {
      return [id1, id2];
    }
    return [id2, id1];
  }
}
