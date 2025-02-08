import { ObjectId } from 'mongodb';

interface JoinRequestType {
  _id?: ObjectId;
  user_id: ObjectId;
  group_id: ObjectId;
  created_at?: Date;
}

export default class JoinRequest {
  _id?: ObjectId;
  user_id: ObjectId;
  group_id: ObjectId;
  created_at: Date;

  constructor(joinRequest: JoinRequestType) {
    const date = new Date();
    this._id = joinRequest._id;
    this.user_id = joinRequest.user_id;
    this.group_id = joinRequest.group_id;
    this.created_at = joinRequest.created_at || date;
  }
}
