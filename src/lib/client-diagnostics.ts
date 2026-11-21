/** Browser consoles and future log integrations must not serialize arbitrary errors in production. */
export function logClientError(event: string, error: unknown) {
  if (process.env.NODE_ENV === 'production') console.error(`[store:${event}]`);
  else console.error(`[store:${event}]`, error);
}
