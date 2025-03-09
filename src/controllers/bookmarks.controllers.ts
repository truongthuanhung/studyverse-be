import { Request, Response } from 'express';
import HTTP_STATUS from '~/constants/httpStatus';
import { TokenPayload } from '~/models/requests/User.requests';
import bookmarksService from '~/services/bookmarks.services';

export const bookmarkController = async (req: Request, res: Response) => {
  const { user_id } = req.decoded_authorization as TokenPayload;
  const result = await bookmarksService.bookmark(user_id, req.body.post_id);
  return res.status(HTTP_STATUS.CREATED).json({
    message: 'Bookmark successfully',
    result
  });
};

export const unbookmarkController = async (req: Request, res: Response) => {
  const { user_id } = req.decoded_authorization as TokenPayload;
  const result = await bookmarksService.unbookmark(user_id, req.params.post_id);
  return res.json({
    message: 'Unbookmark successfully',
    result
  });
};
