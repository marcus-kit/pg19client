import { endUserSession } from '@/lib/auth'

export async function POST() {
  await endUserSession()
  return Response.json({ success: true })
}
