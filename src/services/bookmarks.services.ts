import { ObjectId, WithId } from 'mongodb';
import HTTP_STATUS from '~/constants/httpStatus';
import { ErrorWithStatus } from '~/models/Errors';
import Bookmark from '~/models/schemas/Bookmark.schema';
import databaseService from '~/services/database.services';

class BookmarkService {
  async bookmark(user_id: string, post_id: string) {
    const result = await databaseService.bookmarks.findOneAndUpdate(
      {
        user_id: new ObjectId(user_id),
        post_id: new ObjectId(post_id)
      },
      {
        $setOnInsert: new Bookmark({
          user_id: new ObjectId(user_id),
          post_id: new ObjectId(post_id)
        })
      },
      {
        upsert: true,
        returnDocument: 'after'
      }
    );
    return result;
  }
  async unbookmark(user_id: string, post_id: string) {
    const result = await databaseService.bookmarks.findOneAndDelete({
      user_id: new ObjectId(user_id),
      post_id: new ObjectId(post_id)
    });
    if (!result) {
      throw new ErrorWithStatus({
        message: 'Bookmark not found',
        status: HTTP_STATUS.NOT_FOUND
      });
    }
    return result;
  }
}

const bookmarkService = new BookmarkService();
export default bookmarkService;
