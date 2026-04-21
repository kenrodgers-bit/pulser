declare namespace Express {
  interface Request {
    userId?: string;
    user?: any;
    fileValidationError?: string;
  }
}
