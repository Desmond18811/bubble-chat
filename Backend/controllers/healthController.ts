import { Request, Response } from 'express';
import mongoose from 'mongoose';
import redisClient from '../utils/redis';

/**
 * Basic health check
 * @route GET /api/v1/health
 */
export const checkHealth = (req: Request, res: Response) => {
  res.status(200).json({
    status_code: 200,
    service: "Skill Stats Backend",
    version: "1.0.0",
    status: "healthy",
  });
};

/**
 * Detailed health check covering DB and Cache
 * @route GET /api/v1/health/detailed
 */
export const checkHealthDetailed = async (req: Request, res: Response) => {
  try {
    // Check MongoDB Status
    const dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
    
    // Check Redis Status 
    let cacheStatus = 'disconnected';
    try {
      if (redisClient.status === 'ready' || redisClient.status === 'connect') {
          const ping = await redisClient.ping();
          if (ping === 'PONG') {
              cacheStatus = 'connected';
          }
      }
    } catch (e) {
      cacheStatus = 'disconnected';
    }

    const overallStatus = (dbStatus === 'connected' && cacheStatus === 'connected') ? 'healthy' : 'degraded';
    const statusCode = overallStatus === 'healthy' ? 200 : 503;

    res.status(statusCode).json({
      status_code: statusCode,
      service: "Skill Stats Backend",
      version: "1.0.0",
      status: overallStatus,
      services: {
        database: {
          status: dbStatus
        },
        cache: {
          status: cacheStatus
        }
      }
    });

  } catch (error) {
    res.status(500).json({
      status_code: 500,
      service: "Skill Stats Backend",
      version: "1.0.0",
      status: "unhealthy",
      error: "Internal health check failed"
    });
  }
};
