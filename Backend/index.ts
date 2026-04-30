import express, { Request, Response } from 'express';
import swaggerUi from 'swagger-ui-express';
import swaggerJsdoc from 'swagger-jsdoc';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import http from 'http';
import cors from 'cors';
import { initSocket, getIO } from './utils/socket';
import { initSecurityScheduler, initTranscriptProcessor, initTaskReminderScheduler } from './utils/scheduler';
import './middleware/passport'; // Initialize passport strategies

import chatRoutes from './routes/chatRoutes';
import messageRoutes from './routes/messageRoutes';
import userRoutes from './routes/userRoutes';
import storiesRoutes from './routes/storiesRoutes';
import meetRoutes from './routes/meetRoutes';
import meetingRoutes from './routes/meetingRoutes';
import communityRoutes from './routes/communityRoutes';
import feedRoutes from './routes/feedRoutes';
import authRoutes from './routes/authRoutes';
import paymentRoutes from './routes/paymentRoutes';
import securityRoutes from './routes/securityRoutes';
import healthRoutes from './routes/healthRoutes';
import profileRoutes from './routes/profileRoutes';
import workspaceRoutes from './routes/workspaceRoutes';
import taskRoutes from './routes/taskRoutes';
import aidaRoutes from './routes/aidaRoutes';
import notificationRoutes from './routes/notificationRoutes';
import templateRoutes from './routes/templateRoutes';
import activityRoutes from './routes/activityRoutes';
import orgRoutes from './routes/orgRoutes';
import { seedDefaultTemplates } from './controllers/templateController';


// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// JSON Parsing Error Handler
app.use((err: any, req: any, res: any, next: any) => {
  if (err instanceof SyntaxError && 'body' in err) {
    console.error('❌ JSON Syntax Error:', err.message);
    console.error('💡 Body Snippet:', err.body ? String(err.body).substring(0, 100) : 'N/A');
    return res.status(400).json({ message: 'Invalid JSON payload: ' + err.message });
  }
  next();
});

// Attach Socket.io to every request for controller access
app.use((req: any, res, next) => {
  try {
    req.io = getIO();
  } catch (err) {
    // io might not be initialized yet during startup
  }
  next();
});


// Swagger jsdoc setup
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Bubble Chat API',
      version: '1.0.0',
      description: 'API documentation for the Bubble Chat backend',
    },
    servers: [
      {
        url: `http://localhost:${PORT}`,
        description: 'Development server',
      },
    ],
    tags: [
      { name: 'Authentication', description: 'User registration and login operations' },
      { name: 'Messages', description: 'CRUD operations for real-time messaging' },
      { name: 'Chat', description: '1-on-1 and Group Conversation management' },
      { name: 'Users', description: 'User profile, status, and search operations' },
      { name: 'Stories', description: 'User story uploads and retrieval' },
      { name: 'Security', description: 'Protocol key rotation and security numbers' },
      { name: 'Payment', description: 'Stripe anonymous and standard checkout flow' },
      { name: 'Workspace', description: 'Per-user file buckets with access management and sharing' },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
      schemas: {
        User: {
          type: 'object',
          properties: {
            id: { type: 'string', example: '60d0fe4f5311236168a109ca' },
            full_name: { type: 'string', example: 'Desmond Ubi' },
            username: { type: 'string', example: 'desmond_ubi' },
            email: { type: 'string', example: 'ubi@example.com' },
            phone_number: { type: 'string', example: '+1234567890' },
            avatar: { type: 'string', example: 'https://cdn.example.com/avatar.png' },
            gender: { type: 'string', enum: ['male', 'female', 'other', 'prefer_not_to_say'] },
            date_of_birth: { type: 'string', format: 'date' },
            status_message: { type: 'string', example: 'Available' },
            mood_emoji: { type: 'string', example: '😊' },
            hobbies: { type: 'array', items: { type: 'string' } },
            location: {
              type: 'object',
              properties: {
                city: { type: 'string' },
                country: { type: 'string' },
                timezone: { type: 'string', default: 'UTC' }
              }
            },
            isOnline: { type: 'boolean' },
            lastSeen: { type: 'string', format: 'date-time' },
            uniqueTag: { type: 'string', example: 'bubble-A3F9X7K2' },
            bio: { type: 'string' },
            isVerified: { type: 'boolean' },
            isPremium: { type: 'boolean' },
            verified_badge: { type: 'boolean' },
            publicKey: { type: 'string' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' }
          }
        },
        Message: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            content: { type: 'string' },
            message_type: { type: 'string', enum: ['text', 'image', 'video', 'voice', 'file', 'location', 'contact', 'system'] },
            mediaUrl: { type: 'string' },
            mediaType: { type: 'string' },
            fileSize: { type: 'number' },
            is_forwarded: { type: 'boolean' },
            reactions: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  user: { type: 'string' },
                  emoji: { type: 'string' },
                  timestamp: { type: 'string', format: 'date-time' }
                }
              }
            },
            sender: { $ref: '#/components/schemas/User' },
            chat: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                chatName: { type: 'string' },
                isGroupChat: { type: 'boolean' }
              }
            },
            sentAt: { type: 'string', format: 'date-time' }
          }
        },
        Conversation: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            chatName: { type: 'string' },
            isGroupChat: { type: 'boolean' },
            users: { type: 'array', items: { $ref: '#/components/schemas/User' } },
            groupAdmin: { $ref: '#/components/schemas/User' },
            groupIcon: { type: 'string' },
            groupDescription: { type: 'string' },
            latestMessage: { $ref: '#/components/schemas/Message' },
            totalMembers: { type: 'number' },
            theme: { type: 'string' },
            createdAt: { type: 'string', format: 'date-time' }
          }
        },
        Story: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            mediaType: { type: 'string', enum: ['image', 'video', 'audio', 'text'] },
            mediaUrl: { type: 'string' },
            textContent: { type: 'string' },
            author: { $ref: '#/components/schemas/User' },
            viewCount: { type: 'number' },
            remainingSeconds: { type: 'number' },
            createdAt: { type: 'string', format: 'date-time' }
          }
        }
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
  },

  // Paths to files containing OpenAPI definitions
  apis: ['./routes/*.ts', './index.ts'],
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);

// Serve Swagger UI
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

/**
 * @swagger
 * /api/health:
 *   get:
 *     summary: Health check endpoint
 *     description: Returns the health status of the API
 *     responses:
 *       200:
 *         description: API is healthy
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: OK
 *                 message:
 *                   type: string
 *                   example: Server is running smooth
 */
app.get('/api/health', (req: Request, res: Response) => {
  res.status(200).json({ status: 'OK', message: 'Server is running smooth' });
});

// API Routes
app.use('/api/v1/chat', chatRoutes);
app.use('/api/v1/message', messageRoutes);
app.use('/api/v1/user', userRoutes);
app.use('/api/v1/story', storiesRoutes);
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/profile', profileRoutes);
app.use('/api/v1/health', healthRoutes);
app.use('/api/v1/meet', meetRoutes);
app.use('/api/v1/meetings', meetingRoutes);
app.use('/api/v1/community', communityRoutes);
app.use('/api/v1/feed', feedRoutes);
app.use('/api/v1/payment', paymentRoutes);
app.use('/api/v1/security', securityRoutes);
app.use('/api/v1/workspace', workspaceRoutes);
app.use('/api/v1/tasks', taskRoutes);
app.use('/api/v1/aida', aidaRoutes);
app.use('/api/v1/notifications', notificationRoutes);
app.use('/api/v1/templates', templateRoutes);
app.use('/api/v1/activity', activityRoutes);
app.use('/api/v1/org', orgRoutes);





// Database Connection
const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/bubble-chat';

const server = http.createServer(app);

mongoose.connect(mongoURI)
  .then(async () => {
    console.log('✅ MongoDB connected successfully.');

    // Initialize services that depend on the database
    initSecurityScheduler();
    initTranscriptProcessor();
    initTaskReminderScheduler();

    // Seed default platform templates (no-op if already seeded)
    const systemUser = await import('./models/users').then(m => m.User.findOne({ is_bot: true }));
    if (systemUser) await seedDefaultTemplates(String(systemUser._id));

    // Start the HTTP Server
    server.listen(PORT, () => {
      console.log(`🚀 Server is running on http://localhost:${PORT}`);
      console.log(`📄 Swagger docs are available on http://localhost:${PORT}/api-docs`);
    });
  })
  .catch((err) => {
    console.error('❌ MongoDB connection error:', err);
    process.exit(1); // Exit if DB connection fails on startup
  });

initSocket(server);

