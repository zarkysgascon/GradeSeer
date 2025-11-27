import { NextResponse, type NextRequest } from 'next/server'

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const realParams = await params
  return NextResponse.json({ id: realParams.id })
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const realParams = await params
  return NextResponse.json({ deleted: realParams.id })
}
