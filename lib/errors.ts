export class NotFoundError extends Error {
  status = 404;
}

export class ConflictError extends Error {
  status = 409;
}

export class ValidationError extends Error {
  status = 400;
}

export class UnauthorizedError extends Error {
  status = 401;
}

export class ForbiddenError extends Error {
  status = 403;
}
