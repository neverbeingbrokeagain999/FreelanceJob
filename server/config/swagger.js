import swaggerJsdoc from 'swagger-jsdoc';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Freelance Platform API',
      version: '1.0.0',
      description: 'API documentation for the Freelance Platform',
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT',
      },
      contact: {
        name: 'API Support',
        url: 'https://freelanceplatform.com/support',
        email: 'support@freelanceplatform.com'
      }
    },
    servers: [
      {
        url: 'http://localhost:5000/api/v1',
        description: 'Development server'
      },
      {
        url: 'https://api.freelanceplatform.com/v1',
        description: 'Production server'
      }
    ],
    components: {
      securitySchemes: {
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        }
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            message: {
              type: 'string'
            },
            code: {
              type: 'string'
            }
          }
        },
        User: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid'
            },
            email: {
              type: 'string',
              format: 'email'
            },
            name: {
              type: 'string'
            },
            role: {
              type: 'string',
              enum: ['client', 'freelancer', 'admin']
            },
            createdAt: {
              type: 'string',
              format: 'date-time'
            },
            updatedAt: {
              type: 'string',
              format: 'date-time'
            }
          }
        },
        Job: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid'
            },
            title: {
              type: 'string'
            },
            description: {
              type: 'string'
            },
            budget: {
              type: 'number'
            },
            skills: {
              type: 'array',
              items: {
                type: 'string'
              }
            },
            status: {
              type: 'string',
              enum: ['draft', 'published', 'in_progress', 'completed', 'cancelled']
            },
            clientId: {
              type: 'string',
              format: 'uuid'
            },
            freelancerId: {
              type: 'string',
              format: 'uuid'
            },
            createdAt: {
              type: 'string',
              format: 'date-time'
            },
            updatedAt: {
              type: 'string',
              format: 'date-time'
            }
          }
        },
        Profile: {
          type: 'object',
          properties: {
            userId: {
              type: 'string',
              format: 'uuid'
            },
            title: {
              type: 'string'
            },
            bio: {
              type: 'string'
            },
            skills: {
              type: 'array',
              items: {
                type: 'string'
              }
            },
            hourlyRate: {
              type: 'number'
            },
            availability: {
              type: 'string',
              enum: ['full_time', 'part_time', 'not_available']
            }
          }
        }
      }
    }
  },
  apis: [
    './server/routes/*.js',
    './server/models/*.js',
    './server/controllers/*.js'
  ]
};

const swaggerSpec = swaggerJsdoc(options);

export default swaggerSpec;
