import axios from 'axios';
import { jest } from '@jest/globals';

// Test configuration
const API_URL = process.env.API_URL || 'http://localhost:3000/api';
const TEST_TIMEOUT = 30000; // 30 seconds

// Test data
const testUser = {
  name: 'Test User',
  email: `test${Date.now()}@example.com`,
  password: 'TestPassword123!',
  role: 'freelancer'
};

const testClient = {
  name: 'Test Client',
  email: `client${Date.now()}@example.com`,
  password: 'ClientPass123!',
  role: 'client'
};

const testJob = {
  title: 'Test Job Position',
  description: 'This is a test job posting',
  budget: {
    minimum: 1000,
    maximum: 5000
  },
  skills: ['JavaScript', 'React', 'Node.js'],
  type: 'fixed',
  duration: '1-3 months'
};

describe('Workflow Tests', () => {
  let freelancerToken;
  let clientToken;
  let jobId;

  // Helper function to make authenticated requests
  const authenticatedRequest = async (token) => {
    return axios.create({
      baseURL: API_URL,
      headers: { Authorization: `Bearer ${token}` }
    });
  };

  describe('Authentication & User Management', () => {
    test('Should register a new freelancer', async () => {
      const response = await axios.post(`${API_URL}/auth/register`, testUser);
      expect(response.status).toBe(201);
      expect(response.data).toHaveProperty('token');
      freelancerToken = response.data.token;
    }, TEST_TIMEOUT);

    test('Should register a new client', async () => {
      const response = await axios.post(`${API_URL}/auth/register`, testClient);
      expect(response.status).toBe(201);
      expect(response.data).toHaveProperty('token');
      clientToken = response.data.token;
    }, TEST_TIMEOUT);

    test('Should login as freelancer', async () => {
      const response = await axios.post(`${API_URL}/auth/login`, {
        email: testUser.email,
        password: testUser.password
      });
      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('token');
    }, TEST_TIMEOUT);

    test('Should get freelancer profile', async () => {
      const client = await authenticatedRequest(freelancerToken);
      const response = await client.get('/user/profile');
      expect(response.status).toBe(200);
      expect(response.data.email).toBe(testUser.email);
    }, TEST_TIMEOUT);
  });

  describe('Job Management', () => {
    test('Should create a new job posting', async () => {
      const client = await authenticatedRequest(clientToken);
      const response = await client.post('/jobs', testJob);
      expect(response.status).toBe(201);
      expect(response.data).toHaveProperty('_id');
      jobId = response.data._id;
    }, TEST_TIMEOUT);

    test('Should list available jobs', async () => {
      const client = await authenticatedRequest(freelancerToken);
      const response = await client.get('/jobs');
      expect(response.status).toBe(200);
      expect(Array.isArray(response.data)).toBe(true);
      expect(response.data.length).toBeGreaterThan(0);
    }, TEST_TIMEOUT);

    test('Should get specific job details', async () => {
      const client = await authenticatedRequest(freelancerToken);
      const response = await client.get(`/jobs/${jobId}`);
      expect(response.status).toBe(200);
      expect(response.data._id).toBe(jobId);
      expect(response.data.title).toBe(testJob.title);
    }, TEST_TIMEOUT);
  });

  describe('Application Process', () => {
    test('Should submit job application', async () => {
      const client = await authenticatedRequest(freelancerToken);
      const application = {
        coverLetter: 'I am interested in this position',
        proposedBudget: 3000,
        estimatedDuration: '2 months'
      };
      const response = await client.post(`/jobs/${jobId}/apply`, application);
      expect(response.status).toBe(201);
      expect(response.data).toHaveProperty('status', 'pending');
    }, TEST_TIMEOUT);

    test('Should list job applications for client', async () => {
      const client = await authenticatedRequest(clientToken);
      const response = await client.get(`/jobs/${jobId}/applications`);
      expect(response.status).toBe(200);
      expect(Array.isArray(response.data)).toBe(true);
      expect(response.data.length).toBeGreaterThan(0);
    }, TEST_TIMEOUT);
  });

  describe('Cleanup', () => {
    test('Should delete test job', async () => {
      const client = await authenticatedRequest(clientToken);
      const response = await client.delete(`/jobs/${jobId}`);
      expect(response.status).toBe(200);
    }, TEST_TIMEOUT);

    test('Should delete test users', async () => {
      // Note: This would typically require admin privileges or special test endpoints
      const clientAuth = await authenticatedRequest(clientToken);
      const freelancerAuth = await authenticatedRequest(freelancerToken);
      
      await clientAuth.delete('/user/profile');
      await freelancerAuth.delete('/user/profile');
    }, TEST_TIMEOUT);
  });
});