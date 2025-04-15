import { ObjectId } from 'mongodb';

interface IGroupTag {
  _id?: ObjectId;
  tag_id: ObjectId;
  group_id: ObjectId;
  usage_count: number;
  created_at?: Date;
  updated_at?: Date;
}

class GroupTag {
  _id?: ObjectId;
  tag_id: ObjectId;
  group_id: ObjectId;
  usage_count: number;
  created_at: Date;
  updated_at: Date;
  constructor({ _id, tag_id, group_id, usage_count, created_at, updated_at }: IGroupTag) {
    const date = new Date();
    this._id = _id;
    this.tag_id = tag_id;
    this.group_id = group_id;
    this.usage_count = usage_count;
    this.created_at = created_at || date;
    this.updated_at = updated_at || date;
  }
}

export default GroupTag;
