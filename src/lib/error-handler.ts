/**
 * Comprehensive Error Handling Utilities
 * Provides standardized error handling across the application
 */

export interface AppError {
  code: string;
  message: string;
  statusCode: number;
  details?: any;
  timestamp: string;
}

export class ErrorHandler {
  /**
   * Create a standardized error object
   */
  static createError(
    code: string,
    message: string,
    statusCode: number = 500,
    details?: any
  ): AppError {
    return {
      code,
      message,
      statusCode,
      details,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Handle database errors
   */
  static handleDatabaseError(error: any): AppError {
    console.error('Database error:', error);

    if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      return this.createError(
        'DUPLICATE_ENTRY',
        'A record with this information already exists',
        409,
        { constraint: error.message }
      );
    }

    if (error.code === 'SQLITE_CONSTRAINT_FOREIGNKEY') {
      return this.createError(
        'FOREIGN_KEY_VIOLATION',
        'Referenced record does not exist',
        400,
        { constraint: error.message }
      );
    }

    if (error.code === 'SQLITE_CONSTRAINT_NOTNULL') {
      return this.createError(
        'MISSING_REQUIRED_FIELD',
        'Required field is missing',
        400,
        { constraint: error.message }
      );
    }

    return this.createError(
      'DATABASE_ERROR',
      'Database operation failed',
      500,
      { originalError: error.message }
    );
  }

  /**
   * Handle authentication errors
   */
  static handleAuthError(error: any): AppError {
    console.error('Authentication error:', error);

    if (error.message?.includes('Unauthorized')) {
      return this.createError(
        'UNAUTHORIZED',
        'Authentication required',
        401
      );
    }

    if (error.message?.includes('Forbidden')) {
      return this.createError(
        'FORBIDDEN',
        'Insufficient permissions',
        403
      );
    }

    if (error.message?.includes('Invalid token')) {
      return this.createError(
        'INVALID_TOKEN',
        'Invalid or expired authentication token',
        401
      );
    }

    return this.createError(
      'AUTH_ERROR',
      'Authentication failed',
      401,
      { originalError: error.message }
    );
  }

  /**
   * Handle file upload errors
   */
  static handleUploadError(error: any): AppError {
    console.error('Upload error:', error);

    if (error.code === 'LIMIT_FILE_SIZE') {
      return this.createError(
        'FILE_TOO_LARGE',
        'File size exceeds maximum limit',
        413,
        { maxSize: '10MB' }
      );
    }

    if (error.code === 'LIMIT_FILE_COUNT') {
      return this.createError(
        'TOO_MANY_FILES',
        'Too many files uploaded at once',
        413,
        { maxFiles: 5 }
      );
    }

    if (error.code === 'INVALID_FILE_TYPE') {
      return this.createError(
        'INVALID_FILE_TYPE',
        'File type not supported',
        400,
        { allowedTypes: ['pdf', 'docx', 'txt'] }
      );
    }

    if (error.message?.includes('S3')) {
      return this.createError(
        'STORAGE_ERROR',
        'Failed to upload file to storage',
        500,
        { service: 'AWS S3' }
      );
    }

    return this.createError(
      'UPLOAD_ERROR',
      'File upload failed',
      500,
      { originalError: error.message }
    );
  }

  /**
   * Handle AI API errors
   */
  static handleAIError(error: any): AppError {
    console.error('AI API error:', error);

    if (error.status === 401) {
      return this.createError(
        'AI_API_KEY_INVALID',
        'AI API key is invalid or missing',
        500,
        { service: 'OpenAI/Anthropic/Gemini' }
      );
    }

    if (error.status === 429) {
      return this.createError(
        'AI_RATE_LIMIT',
        'AI API rate limit exceeded',
        429,
        { retryAfter: error.headers?.['retry-after'] }
      );
    }

    if (error.status === 500) {
      return this.createError(
        'AI_SERVICE_ERROR',
        'AI service temporarily unavailable',
        503,
        { service: 'OpenAI/Anthropic/Gemini' }
      );
    }

    if (error.message?.includes('quota')) {
      return this.createError(
        'AI_QUOTA_EXCEEDED',
        'AI API quota exceeded',
        429,
        { service: 'OpenAI/Anthropic/Gemini' }
      );
    }

    return this.createError(
      'AI_ERROR',
      'AI processing failed',
      500,
      { originalError: error.message }
    );
  }

  /**
   * Handle validation errors
   */
  static handleValidationError(error: any): AppError {
    console.error('Validation error:', error);

    if (error.name === 'ValidationError') {
      return this.createError(
        'VALIDATION_ERROR',
        'Invalid input data',
        400,
        { fields: error.details }
      );
    }

    if (error.message?.includes('required')) {
      return this.createError(
        'MISSING_REQUIRED_FIELD',
        'Required field is missing',
        400,
        { field: error.path }
      );
    }

    if (error.message?.includes('invalid')) {
      return this.createError(
        'INVALID_INPUT',
        'Invalid input format',
        400,
        { field: error.path }
      );
    }

    return this.createError(
      'VALIDATION_ERROR',
      'Input validation failed',
      400,
      { originalError: error.message }
    );
  }

  /**
   * Handle network errors
   */
  static handleNetworkError(error: any): AppError {
    console.error('Network error:', error);

    if (error.code === 'ECONNREFUSED') {
      return this.createError(
        'SERVICE_UNAVAILABLE',
        'External service is unavailable',
        503,
        { service: error.hostname }
      );
    }

    if (error.code === 'ETIMEDOUT') {
      return this.createError(
        'REQUEST_TIMEOUT',
        'Request timed out',
        408,
        { timeout: error.timeout }
      );
    }

    if (error.code === 'ENOTFOUND') {
      return this.createError(
        'SERVICE_NOT_FOUND',
        'External service not found',
        503,
        { hostname: error.hostname }
      );
    }

    return this.createError(
      'NETWORK_ERROR',
      'Network request failed',
      500,
      { originalError: error.message }
    );
  }

  /**
   * Handle unknown errors
   */
  static handleUnknownError(error: any): AppError {
    console.error('Unknown error:', error);

    return this.createError(
      'UNKNOWN_ERROR',
      'An unexpected error occurred',
      500,
      { 
        originalError: error.message,
        stack: error.stack 
      }
    );
  }

  /**
   * Main error handler that categorizes and processes errors
   */
  static handleError(error: any): AppError {
    // Database errors
    if (error.code?.startsWith('SQLITE_') || error.code?.startsWith('PGRST_')) {
      return this.handleDatabaseError(error);
    }

    // Authentication errors
    if (error.message?.includes('auth') || error.message?.includes('token')) {
      return this.handleAuthError(error);
    }

    // File upload errors
    if (error.code?.startsWith('LIMIT_') || error.message?.includes('upload')) {
      return this.handleUploadError(error);
    }

    // AI API errors
    if (error.status || error.message?.includes('API') || error.message?.includes('quota')) {
      return this.handleAIError(error);
    }

    // Validation errors
    if (error.name === 'ValidationError' || error.message?.includes('validation')) {
      return this.handleValidationError(error);
    }

    // Network errors
    if (error.code?.startsWith('E') || error.message?.includes('network')) {
      return this.handleNetworkError(error);
    }

    // Unknown errors
    return this.handleUnknownError(error);
  }

  /**
   * Log error for monitoring
   */
  static logError(error: AppError, context?: string) {
    const logData = {
      ...error,
      context,
      environment: process.env.NODE_ENV,
    };

    // In production, you might want to send this to a logging service
    if (process.env.NODE_ENV === 'production') {
      // Send to logging service (e.g., Sentry, LogRocket, etc.)
      console.error('Production error:', logData);
    } else {
      console.error('Development error:', logData);
    }
  }

  /**
   * Create user-friendly error message
   */
  static getUserFriendlyMessage(error: AppError): string {
    const friendlyMessages: Record<string, string> = {
      'UNAUTHORIZED': 'Please sign in to continue',
      'FORBIDDEN': 'You don\'t have permission to perform this action',
      'FILE_TOO_LARGE': 'File is too large. Please choose a smaller file.',
      'INVALID_FILE_TYPE': 'File type not supported. Please upload PDF, DOCX, or TXT files.',
      'AI_RATE_LIMIT': 'AI service is busy. Please try again in a moment.',
      'AI_QUOTA_EXCEEDED': 'AI service quota exceeded. Please try again later.',
      'VALIDATION_ERROR': 'Please check your input and try again.',
      'DATABASE_ERROR': 'Something went wrong. Please try again.',
      'NETWORK_ERROR': 'Connection failed. Please check your internet connection.',
      'UNKNOWN_ERROR': 'Something unexpected happened. Please try again.',
    };

    return friendlyMessages[error.code] || 'An error occurred. Please try again.';
  }
}

/**
 * Error response formatter for API routes
 */
export function formatErrorResponse(error: AppError) {
  return {
    error: error.message,
    code: error.code,
    timestamp: error.timestamp,
    ...(process.env.NODE_ENV === 'development' && { details: error.details }),
  };
}

/**
 * Success response formatter for API routes
 */
export function formatSuccessResponse(data: any, message?: string) {
  return {
    success: true,
    data,
    message,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Validation helper
 */
export function validateRequired(value: any, fieldName: string) {
  if (!value || (typeof value === 'string' && value.trim() === '')) {
    throw new Error(`Field '${fieldName}' is required`);
  }
}

export function validateFileType(file: File, allowedTypes: string[]) {
  const fileType = file.type;
  const fileExtension = file.name.split('.').pop()?.toLowerCase();
  
  const isAllowed = allowedTypes.some(type => 
    fileType.includes(type) || fileExtension === type
  );
  
  if (!isAllowed) {
    throw new Error(`File type not allowed. Allowed types: ${allowedTypes.join(', ')}`);
  }
}

export function validateFileSize(file: File, maxSizeInMB: number) {
  const maxSizeInBytes = maxSizeInMB * 1024 * 1024;
  
  if (file.size > maxSizeInBytes) {
    throw new Error(`File size exceeds ${maxSizeInMB}MB limit`);
  }
}
