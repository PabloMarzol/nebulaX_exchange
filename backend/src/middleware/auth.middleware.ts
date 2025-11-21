import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { AppError } from './error.middleware.js';
import dotenv from "dotenv";
dotenv.config()
export interface AuthRequest extends Request {
  user?: {
    id: string;
    walletAddress: string;
  };
}

export function authenticate(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AppError('No token provided', 401, 'NO_TOKEN');
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, env.JWT_SECRET) as {
      id: string;
      walletAddress: string;
    };

    req.user = decoded;
    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      next(new AppError('Invalid token', 401, 'INVALID_TOKEN'));
    } else {
      next(error);
    }
  }
}

export function optionalAuth(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const decoded = jwt.verify(token, env.JWT_SECRET) as {
        id: string;
        walletAddress: string;
      };
      req.user = decoded;
    }
    next();
  } catch (error) {
    // If token is invalid, just proceed without user
    next();
  }
}

/**
 * Development authentication middleware
 * Uses the Hyperliquid wallet from environment variables when no token is provided
 * This allows testing trading features without setting up authentication
 */
export function devAuth(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;

    // Try to authenticate with JWT token first
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const decoded = jwt.verify(token, env.JWT_SECRET) as {
        id: string;
        walletAddress: string;
      };
      req.user = decoded;
      return next();
    }

    // If no token and in development, use wallet from env vars
    if (env.HYPERLIQUID_WALLET) {
      req.user = {
        id: 'dev-user',
        walletAddress: env.HYPERLIQUID_WALLET,
      };
      console.log('[DevAuth] Using development wallet:', env.HYPERLIQUID_WALLET);
      return next();
    }

    // No token and no dev wallet
    throw new AppError('No token provided and no development wallet configured', 401, 'NO_TOKEN');
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      // If JWT is invalid but we have a dev wallet, use that
      if (env.HYPERLIQUID_WALLET) {
        req.user = {
          id: 'dev-user',
          walletAddress: env.HYPERLIQUID_WALLET,
        };
        return next();
      }
      next(new AppError('Invalid token', 401, 'INVALID_TOKEN'));
    } else {
      next(error);
    }
  }
}
