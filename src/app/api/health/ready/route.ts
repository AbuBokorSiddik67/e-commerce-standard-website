import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  let ready = false;
  try {
    // Check both connectivity and permission to read an application table.
    await prisma.storeSetting.findUnique({ where: { id: 1 }, select: { id: true } });
    ready = true;
  } catch { /* Never expose DB details. Use the probe status for alerts. */ }
  return Response.json({ status: ready ? 'ready' : 'unavailable' }, {
    status: ready ? 200 : 503,
    headers: { 'Cache-Control': 'no-store' },
  });
}
