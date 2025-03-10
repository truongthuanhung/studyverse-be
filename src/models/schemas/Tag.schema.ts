import { ObjectId } from 'mongodb';

interface ITag {
  _id?: ObjectId;
  name: string;
  created_at?: Date;
  updated_at?: Date;
}

class Tag {
  _id?: ObjectId;
  name: string;
  created_at: Date;
  updated_at: Date;

  constructor(tag: ITag) {
    const date = new Date();
    this._id = tag._id || new ObjectId();
    this.name = tag.name;
    this.created_at = tag.created_at || date;
    this.updated_at = tag.updated_at || date;
  }
}

export default Tag;
