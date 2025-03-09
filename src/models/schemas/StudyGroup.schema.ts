import { ObjectId } from 'mongodb';
import { GroupPrivacy } from '~/constants/enums';

interface StudyGroupType {
  _id?: ObjectId;
  name: string;
  privacy: GroupPrivacy;
  user_id: ObjectId;
  description?: string;
  cover_photo?: string;
  created_at?: Date;
  updated_at?: Date;
}

export default class StudyGroup {
  _id?: ObjectId;
  name: string;
  privacy: GroupPrivacy;
  user_id: ObjectId;
  description: string;
  cover_photo: string;
  created_at: Date;
  updated_at: Date;

  constructor(studyGroup: StudyGroupType) {
    const date = new Date();
    this._id = studyGroup._id;
    this.name = studyGroup.name;
    this.privacy = studyGroup.privacy;
    this.user_id = studyGroup.user_id;
    this.description = studyGroup.description || '';
    this.cover_photo = studyGroup.cover_photo || '';
    this.created_at = studyGroup.created_at || date;
    this.updated_at = studyGroup.updated_at || date;
  }
}
