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

export const searchTagsController = async (req: Request, res: Response) => {
  const { q } = req.query;
  const result = await tagsService.searchTags(q as string);
  return res.json({ message: 'Get tags successfully', result });
};

export const getTagByIdController = async (req: Request, res: Response) => {
  const { tag_id } = req.params;
  const result = await tagsService.getTagById(tag_id);
  return res.json({
    message: 'Get tag successfully',
    result
  });
};

export const getTagInGroupController = async (req: Request, res: Response) => {
  const { group_id, tag_id } = req.params;
  const result = await tagsService.getTagInGroup(tag_id, group_id);
  return res.json({
    message: 'Get tag in group successfully',
    result
  });
};

export const getTagsByUsageInGroupController = async (req: Request, res: Response) => {
  const { group_id } = req.params;
  const { order } = req.query;

  const sortOrder = order === 'asc' ? 'asc' : 'desc';
  const result = await tagsService.getTagsByUsageInGroup(group_id, sortOrder);

  return res.json({
    message: sortOrder === 'desc' ? 'Top 5 most used tags' : 'Top 5 least used tags',
    result
  });
};
