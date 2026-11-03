import type { ErrorRequestHandler, RequestHandler } from 'express'
import { AppError } from '../errors/app-error.ts'

export const notFoundHandler: RequestHandler = (request, response) => {
  response.status(404).json({
    error: {
      code: 'NOT_FOUND',
      message: `No route for ${request.method} ${request.path}`,
    },
  })
}

export const errorHandler: ErrorRequestHandler = (error, _request, response, _next) => {
  if (error instanceof AppError) {
    response.status(error.statusCode).json({
      error: {
        code: error.code,
        message: error.message,
      },
    })
    return
  }

  if (error instanceof SyntaxError && (error as { status?: number }).status === 400) {
    response.status(400).json({
      error: {
        code: 'INVALID_JSON',
        message: 'Request body must contain valid JSON',
      },
    })
    return
  }

  console.error(error)
  response.status(500).json({
    error: {
      code: 'INTERNAL_ERROR',
      message: 'Unexpected server error',
    },
  })
}
