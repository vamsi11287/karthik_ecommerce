import { Response } from 'express';

interface ApiResponseOptions<T> {
  res: Response;
  statusCode?: number;
  message?: string;
  data?: T;
  meta?: any;
}

export const sendResponse = <T>({
  res,
  statusCode = 200,
  message = 'Success',
  data,
  meta,
}: ApiResponseOptions<T>) => {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
    meta,
  });
};
