import { NextFunction, Request, Response } from 'express';
import HTTP_STATUS from '~/constants/httpStatus';
import { ErrorWithStatus } from '~/models/Errors';
export const defaultErrorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
  const { status, ...errorWithoutStatus } = err;
  if (err instanceof ErrorWithStatus) {
    return res.status(err.status).json(errorWithoutStatus);
  }
  Object.getOwnPropertyNames(err).forEach((key) => {
    Object.defineProperty(err, key, { enumerable: true });
  });
  res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
    message: err.message,
    errorInfo: err
  });
};
