import { Request, Response } from 'express';
import tagsService from '~/services/tags.services';

export const getTagByNameController = async (req: Request, res: Response) => {
  const { name } = req.query;
  const result = await tagsService.getTagByName(name as string);
  return res.json({
    message: 'Get tag successfully',
    result
  });
};

export const searchTagsByGroupController = async (req: Request, res: Response) => {
  const { group_id } = req.params;
  const { q } = req.query;
  const result = await tagsService.searchTagsByGroup(group_id, q as string);
  return res.json({ message: 'Get tags successfully', result });
};
