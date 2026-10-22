import { beforeEach, describe, expect, it, vi } from 'vitest';
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

describe('API service', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    apiMocks.get.mockReset();
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
});
