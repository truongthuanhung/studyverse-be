import { ObjectId } from 'mongodb';

interface IBadge {
  _id?: ObjectId;
  name: string;
  description: string;
  icon_url: string;
  points_required: number;
  created_at?: Date;
}

class Badge {
  _id?: ObjectId;
  name: string;
  description: string;
  icon_url: string;
  points_required: number;
  created_at?: Date;
  constructor(badge: IBadge) {
    this._id = badge._id;
    this.name = badge.name;
    this.description = badge.description;
    this.icon_url = badge.icon_url;
    this.points_required = badge.points_required;
    this.created_at = badge.created_at || new Date();
  }
}

export default Badge;
