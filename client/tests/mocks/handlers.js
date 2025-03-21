import { rest } from 'msw';

const API_URL = 'http://localhost:5000/api/v1';

export const handlers = [
  // Auth endpoints
  rest.post(`${API_URL}/auth/register`, (req, res, ctx) => {
    return res(
      ctx.status(201),
      ctx.json({
        token: 'mock-token',
        user: {
          id: '1',
          ...req.body
        }
      })
    );
  }),

  rest.post(`${API_URL}/auth/login`, async (req, res, ctx) => {
    const { email, password } = await req.json();
    
    if (email === 'test@example.com' && password === 'Password123!') {
      return res(
        ctx.status(200),
        ctx.json({
          success: true,
          user: { id: '1', name: 'Test User', email, role: 'freelancer' },
          token: 'mock-token'
        })
      );
    }
    
    return res(
      ctx.status(401),
      ctx.json({ message: 'Invalid credentials' })
    );
  }),

  rest.get(`${API_URL}/user/profile`, (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json({
        id: '1',
        email: testUser.email,
        name: testUser.name,
        role: testUser.role
      })
    );
  }),

  rest.post(`${API_URL}/jobs`, (req, res, ctx) => {
    return res(
      ctx.status(201),
      ctx.json({
        _id: 'mock-job-id',
        ...req.body
      })
    );
  }),

  rest.get(`${API_URL}/jobs`, (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json([
        {
          _id: 'mock-job-id',
          title: req.body.title || 'Test Job Position',
          description: req.body.description || 'This is a test job posting'
        }
      ])
    );
  }),

  rest.get(`${API_URL}/jobs/:jobId`, (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json({
        _id: req.params.jobId,
        title: testJob.title,
        description: testJob.description
      })
    );
  }),

  rest.post(`${API_URL}/jobs/:jobId/apply`, (req, res, ctx) => {
    return res(
      ctx.status(201),
      ctx.json({
        _id: 'mock-application-id',
        jobId: req.params.jobId,
        status: 'pending',
        ...req.body
      })
    );
  }),

  rest.get(`${API_URL}/jobs/:jobId/applications`, (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json([
        {
          _id: 'mock-application-id',
          jobId: req.params.jobId,
          status: 'pending'
        }
      ])
    );
  }),

  rest.delete(`${API_URL}/jobs/:jobId`, (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json({ message: 'Job deleted successfully' })
    );
  }),

  rest.delete(`${API_URL}/user/profile`, (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json({ message: 'User deleted successfully' })
    );
  })
];
