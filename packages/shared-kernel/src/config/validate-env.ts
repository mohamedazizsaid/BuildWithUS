import { z } from 'zod';

export { z } from 'zod';

export function validateEnv<T extends z.ZodType>(schema: T): z.infer<T> {
  const result = schema.safeParse(process.env);
  if (!result.success) {
    const errors = result.error.flatten().fieldErrors;
    console.error('Environment validation failed:', errors);
    throw new Error(`Invalid environment variables: ${JSON.stringify(errors)}`);
  }
  return result.data;
}
