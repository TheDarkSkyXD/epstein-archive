import { Request, Response, NextFunction } from 'express';

// Custom error classes
export class AppError extends Error {
  constructor(
    public message: string,
    public statusCode: number,
    public isOperational: boolean = true,
    public details?: Record<string, any>,
  ) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: Record<string, any>) {
    super(message, 400, true, details);
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = 'Resource not found') {
    super(message, 404, true);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = 'Unauthorized access') {
    super(message, 401, true);
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = 'Access forbidden') {
    super(message, 403, true);
  }
}

export class ConflictError extends AppError {
  constructor(message: string, details?: Record<string, any>) {
    super(message, 409, true, details);
  }
}

// Error response formatter
interface ErrorResponse {
  success: false;
  error: {
    type: string;
    message: string;
    statusCode: number;
    details?: Record<string, any>;
    timestamp: string;
    path?: string;
  };
}

export const formatErrorResponse = (error: AppError, req?: Request): ErrorResponse => {
  return {
    success: false,
    error: {
      type: error.name,
      message: error.message,
      statusCode: error.statusCode,
      details: error.details,
      timestamp: new Date().toISOString(),
      path: req?.path,
    },
  };
};

// Global error handler middleware
// TODO: Use next for error chaining - see UNUSED_VARIABLES_RECOMMENDATIONS.md
export const globalErrorHandler = (
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction,
): void => {
  console.error('Global error handler caught:', {
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    userAgent: req.get('User-Agent'),
  });

  // If it's our custom AppError
  if (err instanceof AppError) {
    const errorResponse = formatErrorResponse(err, req);

    // Log operational errors as warnings
    if (err.isOperational) {
      console.warn(`Operational error: ${err.message}`, {
        statusCode: err.statusCode,
        path: req.path,
      });
    } else {
      // Log programming errors as errors
      console.error(`Programming error: ${err.message}`, {
        stack: err.stack,
        path: req.path,
      });
    }

    res.status(err.statusCode).json(errorResponse);
    return;
  }

  // For unexpected errors
  const unexpectedError = new AppError('An unexpected error occurred', 500, false);

  const errorResponse = formatErrorResponse(unexpectedError, req);
  res.status(500).json(errorResponse);
};

// Async wrapper for route handlers
export const catchAsync = (
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>,
) => {
  return (req: Request, res: Response, next: NextFunction) => {
    fn(req, res, next).catch(next);
  };
};
