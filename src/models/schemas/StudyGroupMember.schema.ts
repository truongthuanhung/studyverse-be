import { ObjectId } from 'mongodb';
import { StudyGroupRole } from '~/constants/enums';

interface StudyGroupMemberType {
  _id?: ObjectId;
  user_id: ObjectId;
  group_id: ObjectId;
  role: StudyGroupRole;
  points?: number;
  created_at?: Date;
  updated_at?: Date;
}

export default class StudyGroupMember {
  _id?: ObjectId;
  user_id: ObjectId;
  group_id: ObjectId;
  role: StudyGroupRole;
  points: number;
  created_at: Date;
  updated_at: Date;

  constructor(member: StudyGroupMemberType) {
    const date = new Date();
    this._id = member._id;
    this.user_id = member.user_id;
    this.group_id = member.group_id;
    this.role = member.role;
    this.points = member.points || 0;
    this.created_at = member.created_at || date;
    this.updated_at = member.updated_at || date;
  }
}
