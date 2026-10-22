import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getCourseById } from '../services/api';

const apiMocks = vi.hoisted(() => ({
  get: vi.fn(),
  create: vi.fn(),
  requestUse: vi.fn(),
  responseUse: vi.fn(),
}));

vi.mock('axios', () => {
  const apiInstance = {
    get: apiMocks.get,
    interceptors: {
      request: {
        use: apiMocks.requestUse,
      },
      response: {
        use: apiMocks.responseUse,
      },
    },
  };

  apiMocks.create.mockReturnValue(apiInstance);

  return {
    default: {
      create: apiMocks.create,
    },
  };
});

const requestInterceptor = apiMocks.requestUse.mock.calls[0][0];
const requestErrorInterceptor = apiMocks.requestUse.mock.calls[0][1];
const [responseInterceptor, responseErrorInterceptor] =
  apiMocks.responseUse.mock.calls[0];

describe('API service', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    apiMocks.get.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it('fetches a course by its ID and returns the course data', async () => {
    const course = {
      _id: 'course-123',
      course_name: 'Software Engineering',
    };

    apiMocks.get.mockResolvedValueOnce({
      data: course,
    });

    const result = await getCourseById('course-123');

    expect(apiMocks.get).toHaveBeenCalledWith('/courses/course-123');

    expect(result).toEqual(course);
  });

  it('adds a localStorage token to the Authorization header', () => {
    localStorage.setItem('peer_eval_token', 'local-test-token');

    const config = {
      headers: {},
    };

    const result = requestInterceptor(config);

    expect(result.headers.Authorization).toBe('Bearer local-test-token');
  });

  it('uses the sessionStorage token when no localStorage token exists', () => {
    sessionStorage.setItem('peer_eval_session', 'session-test-token');

    const config = {
      headers: {},
    };

    const result = requestInterceptor(config);

    expect(result.headers.Authorization).toBe('Bearer session-test-token');
  });

  it('does not add an Authorization header when no token exists', () => {
    const config = {
      headers: {},
    };

    const result = requestInterceptor(config);

    expect(result.headers.Authorization).toBeUndefined();
  });
  it('prefers a persistent token when both storage locations contain a token', () => {
    localStorage.setItem('peer_eval_token', 'persistent-token');
    sessionStorage.setItem('peer_eval_session', 'session-token');
    expect(requestInterceptor({ headers: {} }).headers.Authorization).toBe(
      'Bearer persistent-token',
    );
  });

  it('preserves rejected requests and successful responses', async () => {
    const error = new Error('Request configuration failed');
    await expect(requestErrorInterceptor(error)).rejects.toBe(error);
    const response = { data: { _id: 'course-1' }, status: 200 };
    expect(responseInterceptor(response)).toBe(response);
  });

  it.each([
    [
      'timeout',
      {
        code: 'ECONNABORTED',
        message: 'Timed out',
        config: { baseURL: '/api', url: '/courses', method: 'get' },
      },
      'Request timed out. The server may be busy, please try again.',
    ],
    [
      'network',
      {
        code: 'ERR_NETWORK',
        message: 'Offline',
        config: { baseURL: '/api', url: '/courses', method: 'get' },
      },
      'Cannot connect to backend server at /api. Please check if the backend is running.',
    ],
    [
      'server',
      {
        response: { status: 503, data: { message: 'Unavailable' } },
        config: { method: 'get' },
      },
      'Server error occurred. Please try again later.',
    ],
    [
      'validation',
      { response: { status: 400, data: { message: 'Invalid input' } } },
      undefined,
    ],
  ])(
    'preserves %s errors and attaches the appropriate user message',
    async (_type, error, message) => {
      vi.spyOn(console, 'error').mockImplementation(() => {});
      await expect(responseErrorInterceptor(error)).rejects.toBe(error);
      expect(error.userMessage).toBe(message);
    },
  );

  it('uses the configured public API destination', async () => {
    // The base URL is chosen at import time, so reload only this module after changing the test environment.
    vi.stubEnv('VITE_API_BASE_URL', '/synthetic-api');
    vi.resetModules();
    await import('../services/api');
    expect(apiMocks.create).toHaveBeenLastCalledWith(
      expect.objectContaining({
        baseURL: '/synthetic-api',
        headers: { 'Content-Type': 'application/json' },
        timeout: 180000,
      }),
    );
  });
});
