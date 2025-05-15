import { Request, Response } from 'express';
import { ParamsDictionary } from 'express-serve-static-core';
import { SEARCH_MESSAGES } from '~/constants/messages';
import { SearchQuery } from '~/models/requests/Search.requests';
import { TokenPayload } from '~/models/requests/User.requests';
import searchService from '~/services/search.services';

export const searchController = async (req: Request<ParamsDictionary, any, any, SearchQuery>, res: Response) => {
  const { user_id } = req.decoded_authorization as TokenPayload;
  const { q = '', page = '1', limit = '10', type } = req.query;
  const pageNumber = parseInt(page as string, 10);
  const limitNumber = parseInt(limit as string, 10);
  if (type === 'group' || type === 'post' || type === 'user') {
    const result = await searchService.search({ q, user_id, type, page: pageNumber, limit: limitNumber });
    return res.json({ message: SEARCH_MESSAGES.SEARCH_SUCCESS, result });
  }
  const result = await searchService.generalSearch({ q, user_id });
  return res.json({ message: SEARCH_MESSAGES.SEARCH_SUCCESS, result });
};

export const groupSearchController = async (req: Request<ParamsDictionary, any, any, SearchQuery>, res: Response) => {
  const { user_id } = req.decoded_authorization as TokenPayload;
  const { group_id } = req.params;
  const { q = '', page = '1', limit = '10' } = req.query;

  const pageNumber = parseInt(page as string, 10);
  const limitNumber = parseInt(limit as string, 10);

  const result = await searchService.groupSearch({
    q,
    user_id,
    group_id,
    page: pageNumber,
    limit: limitNumber
  });

  return res.json({
    message: SEARCH_MESSAGES.SEARCH_SUCCESS,
    result
  });
};

export const getSearchHistoryController = async (req: Request, res: Response) => {
  const { user_id } = req.decoded_authorization as TokenPayload;
  const { group_id } = req.params;

  const result = await searchService.getSearchHistory(user_id, group_id);
  return res.json({
    message: SEARCH_MESSAGES.RETRIVE_HISTORY_SUCCESS,
    result
  });
};

export const deleteAllSearchHistoryController = async (req: Request, res: Response) => {
  const { user_id } = req.decoded_authorization as TokenPayload;
  const { group_id } = req.params;

  const result = await searchService.deleteAllSearchHistory(user_id, group_id);
  return res.json({
    message: SEARCH_MESSAGES.DELETE_HISTORY_SUCCESS,
    result
  });
};

export const deleteSearchHistoryController = async (req: Request, res: Response) => {
  const { user_id } = req.decoded_authorization as TokenPayload;
  const { group_id, search_history_id } = req.params;

  const result = await searchService.deleteSearchHistory({
    user_id,
    group_id,
    search_history_id
  });

  return res.json({
    message: SEARCH_MESSAGES.DELETE_HISTORY_SUCCESS,
    result
  });
};
