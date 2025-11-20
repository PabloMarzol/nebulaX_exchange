import { ZodError } from 'zod';
import { env } from '../config/env.js';
export function errorHandler(err, req, res, next) {
    console.error('Error:', err);
    // Zod validation error
    if (err instanceof ZodError) {
        return res.status(400).json({
            error: 'Validation error',
            details: err.errors,
        });
    }
    // Custom API error
    if (err.statusCode) {
        return res.status(err.statusCode).json({
            error: err.message,
            code: err.code,
        });
    }
    // Default server error
    const statusCode = err.statusCode || 500;
    const message = env.NODE_ENV === 'production' ? 'Internal server error' : err.message;
    res.status(statusCode).json({
        error: message,
        ...(env.NODE_ENV === 'development' && { stack: err.stack }),
    });
}
export class AppError extends Error {
    statusCode;
    code;
    constructor(message, statusCode = 500, code) {
        super(message);
        this.statusCode = statusCode;
        this.code = code;
        this.name = 'AppError';
        Error.captureStackTrace(this, this.constructor);
    }
}
