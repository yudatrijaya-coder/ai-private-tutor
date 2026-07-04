export class AppError extends Error {
  constructor(
    message: string,
    public statusCode: number = 400,
    public code?: string
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export function ok<T>(data: T, metadata?: Record<string, any>) {
  return Response.json(
    { success: true, data, ...metadata },
    { status: 200 }
  );
}

export function created<T>(data: T) {
  return Response.json({ success: true, data }, { status: 201 });
}

export function badRequest(message: string, code?: string) {
  return Response.json(
    { success: false, error: { message, code } },
    { status: 400 }
  );
}

export function unauthorized(message = 'Unauthorized') {
  return Response.json(
    { success: false, error: { message } },
    { status: 401 }
  );
}

export function notFound(message = 'Not found') {
  return Response.json(
    { success: false, error: { message } },
    { status: 404 }
  );
}

export function serverError(error: unknown) {
  const message = error instanceof Error ? error.message : 'Internal server error';
  console.error('[API Error]', error);
  return Response.json(
    { success: false, error: { message } },
    { status: 500 }
  );
}
