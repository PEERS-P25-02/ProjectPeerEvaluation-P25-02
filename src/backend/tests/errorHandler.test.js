import { describe, expect, it } from 'vitest';
import errorHandler from '../middleware/errorHandler.js';

describe('errorHandler', () => {
  it('formats custom errors with status, code, details, and timestamp', () => {
    const res = {
      status: (status) => {
        res.statusCode = status;
        return res;
      },
      json: (body) => {
        res.body = body;
      },
    };

    errorHandler(
      {
        message: 'Invalid request',
        code: 'VALIDATION_ERROR',
        status: 400,
        details: { field: 'email' },
      },
      {},
      res,
      () => {},
    );

    expect(res.statusCode).toBe(400);
    expect(res.body).toEqual({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid request',
        details: { field: 'email' },
        timestamp: expect.any(String),
      },
    });
    expect(Number.isNaN(Date.parse(res.body.error.timestamp))).toBe(false);
  });

  it('uses safe defaults for an otherwise empty error', () => {
    const res = {
      status: (status) => {
        res.statusCode = status;
        return res;
      },
      json: (body) => {
        res.body = body;
      },
    };

    errorHandler({}, {}, res, () => {});

    expect(res.statusCode).toBe(500);
    expect(res.body.error.code).toBe('SERVER_ERROR');
    expect(res.body.error.message).toBe('Internal server error');
    expect(res.body.error.details).toEqual({});
  });
});
