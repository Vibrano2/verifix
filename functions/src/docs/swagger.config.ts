/**
 * OpenAPI / Swagger Specification Setup
 */

import swaggerJSDoc from 'swagger-jsdoc';

const options: swaggerJSDoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Artiva Backend REST API',
      version: '1.0.0',
      description: 'Production-ready REST API for Artiva — Escrow-backed artisan marketplace with automated priority matching, NDPR compliance, and 4-hour auto-refund scheduler.',
      contact: {
        name: 'Artiva Engineering Team',
        email: 'engineering@verifix.app'
      }
    },
    servers: [
      {
        url: 'http://localhost:5001/verifix-app/us-central1/api',
        description: 'Local Emulator Server'
      },
      {
        url: 'https://us-central1-verifix.cloudfunctions.net/api',
        description: 'Production Cloud Functions Server'
      }
    ],
    components: {
      securitySchemes: {
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Firebase Auth ID token obtained after client phone OTP verification.'
        }
      },
      schemas: {
        ErrorResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            error: {
              type: 'object',
              properties: {
                code: { type: 'string', example: 'UNAUTHORIZED' },
                message: { type: 'string', example: 'Invalid or expired authentication token.' }
              }
            }
          }
        },
        User: {
          type: 'object',
          properties: {
            uid: { type: 'string', example: 'usr_abc123' },
            phone: { type: 'string', example: '+2348012345678' },
            role: { type: 'string', enum: ['client', 'artisan', 'admin'], example: 'client' },
            profile_url: { type: 'string', nullable: true, example: 'https://storage.googleapis.com/avatars/usr_abc123.jpg' },
            is_active: { type: 'boolean', example: true },
            created_at: { type: 'string', format: 'date-time' }
          }
        },
        ArtisanProfile: {
          type: 'object',
          properties: {
            uid: { type: 'string', example: 'usr_artisan789' },
            name: { type: 'string', example: 'Emmanuel Oke' },
            trade: { type: 'string', example: 'plumber' },
            services: { type: 'array', items: { type: 'string' }, example: ['Pipe fitting', 'Leak repair'] },
            location: { type: 'string', example: 'Life Camp' },
            available: { type: 'boolean', example: true },
            work_photos: { type: 'array', items: { type: 'string' } },
            verified: { type: 'boolean', example: true },
            completed_jobs: { type: 'number', example: 14 },
            reputation_score: { type: 'number', example: 4.8 },
            locked_job_value: { type: 'number', example: 15000 },
            no_response_flags: { type: 'number', example: 0 }
          }
        },
        Job: {
          type: 'object',
          properties: {
            job_id: { type: 'string', example: 'job_9982' },
            client_uid: { type: 'string', example: 'usr_client123' },
            trade: { type: 'string', example: 'plumber' },
            description: { type: 'string', example: 'Burst pipe repair in kitchen' },
            location: { type: 'string', example: 'Life Camp' },
            urgency: { type: 'string', enum: ['Today', 'This Week', 'Flexible'], example: 'Today' },
            status: { type: 'string', enum: ['open', 'matched', 'complete', 'refunded'], example: 'open' },
            created_at: { type: 'string', format: 'date-time' }
          }
        },
        Transaction: {
          type: 'object',
          properties: {
            transaction_id: { type: 'string', example: 'tx_5541' },
            match_id: { type: 'string', example: 'match_1120' },
            client_uid: { type: 'string', example: 'usr_client123' },
            artisan_uid: { type: 'string', example: 'usr_artisan789' },
            total_amount: { type: 'number', example: 15500 },
            locked_job_value: { type: 'number', example: 15000 },
            match_fee: { type: 'number', example: 500 },
            commission: { type: 'number', example: 1500 },
            artisan_payout: { type: 'number', example: 13500 },
            status: { type: 'string', enum: ['held', 'released', 'refunded'], example: 'held' },
            paystack_reference: { type: 'string', example: 'artiva_pay_99812' }
          }
        }
      }
    },
    security: [
      {
        BearerAuth: []
      }
    ]
  },
  apis: ['./src/routes/*.ts', './src/controllers/*.ts']
};

export const swaggerSpec = swaggerJSDoc(options);
