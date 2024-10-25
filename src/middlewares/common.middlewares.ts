import { NextFunction, Request, Response } from 'express';
import { pick } from 'lodash';

export const filterMiddleware = (filterKeys: string[]) => (req: Request, res: Response, next: NextFunction) => {
  req.body = pick(req.body, filterKeys);
  next();
};
