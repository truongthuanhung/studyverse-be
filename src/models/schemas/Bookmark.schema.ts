import { ObjectId } from 'mongodb';

interface IBookmark {
  _id?: ObjectId;
  user_id: ObjectId;
  post_id: ObjectId;
  created_at?: Date;
}

class Bookmark {
  _id: ObjectId;
  user_id: ObjectId;
  post_id: ObjectId;
  created_at: Date;

  constructor(bookmark: IBookmark) {
    this._id = bookmark._id || new ObjectId();
    this.user_id = bookmark.user_id;
    this.post_id = bookmark.post_id;
    this.created_at = bookmark.created_at || new Date();
  }
}

export default Bookmark;
