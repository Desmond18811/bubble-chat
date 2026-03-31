import express, { Request, Response } from 'express';
import swaggerUi from 'swagger-ui-express';
import swaggerJsdoc from 'swagger-jsdoc';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import http from 'http';
import cors from 'cors';
import { initSocket, getIO } from './utils/socket';
import { initSecurityScheduler } from './utils/scheduler';

import chatRoutes from './routes/chatRoutes';
import messageRoutes from './routes/messageRoutes';
import userRoutes from './routes/userRoutes';
import storiesRoutes from './routes/storiesRoutes';
import authRoutes from './routes/authRoutes';
import paymentRoutes from './routes/paymentRoutes';
import securityRoutes from './routes/securityRoutes';
import healthRoutes from './routes/healthRoutes';





// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

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
    ],
    components: {

      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
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
app.use('/api/v1/health', healthRoutes); 
app.use('/api/v1/payment', paymentRoutes);
app.use('/api/v1/security', securityRoutes);





// Database Connection
const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/bubble-chat';
mongoose.connect(mongoURI)
  .then(() => console.log('✅ MongoDB connected successfully.'))
  .catch((err) => console.error('❌ MongoDB connection error:', err));

// Create HTTP Server & Initialize Socket.IO
const server = http.createServer(app);
initSocket(server);

// Initialize Security Scheduler
initSecurityScheduler();


// Start the HTTP Server
server.listen(PORT, () => {
  console.log(`🚀 Server is running on http://localhost:${PORT}`);
  console.log(`📄 Swagger docs are available on http://localhost:${PORT}/api-docs`);
});
