import { NextResponse, type NextRequest } from 'next/server'

export async function GET(request: NextRequest, { params }: { params: Promise<Record<string, never>> }) {
  await params
  return NextResponse.json({ message: 'history root' })
}

export async function POST(request: NextRequest, { params }: { params: Promise<Record<string, never>> }) {
  await params
  try {
    const body = await request.json()
    return NextResponse.json({ received: body }, { status: 201 })
  } catch (err) {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 })
  }
}
