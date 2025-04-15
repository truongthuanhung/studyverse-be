import { ObjectId } from 'mongodb';
import { SearchTargetType, SearchType } from '~/constants/enums';

interface ISearchHistory {
  _id?: ObjectId;
  user_id: ObjectId;
  search_type: SearchType;
  group_id?: ObjectId | null;
  target_id?: ObjectId | null;
  target_type?: SearchTargetType;
  content: string;
  created_at?: Date;
  updated_at?: Date;
}

class SearchHistory {
  _id?: ObjectId;
  user_id: ObjectId;
  search_type: SearchType;
  group_id: ObjectId | null;
  target_id: ObjectId | null;
  target_type: SearchTargetType | null;
  content: string;
  created_at: Date;
  updated_at: Date;

  constructor({
    _id,
    user_id,
    search_type,
    group_id,
    target_id,
    target_type,
    content,
    created_at,
    updated_at
  }: ISearchHistory) {
    const date = new Date();
    this._id = _id;
    this.user_id = user_id;
    this.search_type = search_type;
    this.group_id = group_id || null;
    this.target_id = target_id || null;
    this.target_type = target_type || null;
    this.content = content;
    this.created_at = created_at || date;
    this.updated_at = updated_at || date;
  }
}

export default SearchHistory;
