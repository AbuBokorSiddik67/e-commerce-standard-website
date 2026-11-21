export const dynamic = 'force-dynamic';

// Intentionally dependency-free: DB downtime must not cause restart loops.
export function GET() {
  return Response.json({ status: 'ok' }, { headers: { 'Cache-Control': 'no-store' } });
}
