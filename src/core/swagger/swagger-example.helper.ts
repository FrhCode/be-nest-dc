const EXAMPLE_REQUEST_ID = '550e8400-e29b-41d4-a716-446655440000';

export const swaggerExample = (
  statusCode: number,
  message: string,
  data: unknown,
) => ({
  statusCode,
  requestId: EXAMPLE_REQUEST_ID,
  message,
  data,
});

export const swaggerErrorExample = (
  statusCode: number,
  message: string,
  errors?: unknown[],
) => ({
  statusCode,
  requestId: EXAMPLE_REQUEST_ID,
  message,
  data: [],
  ...(errors ? { errors } : {}),
});
