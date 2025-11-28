import { NextResponse, type NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { sql } from 'drizzle-orm'

// Optional: simple lookup endpoint
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  try {
    const result = await db.execute(sql`SELECT * FROM subject_history WHERE id = ${id} LIMIT 1`)
    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }
    return NextResponse.json(result.rows[0])
  } catch (err) {
    return NextResponse.json({ error: 'Failed to fetch record' }, { status: 500 })
  }
}

// Delete a history record by id so it won't reappear on refresh
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  try {
    const del = await db.execute(sql`DELETE FROM subject_history WHERE id = ${id}`)
    // Postgres returns command tag; we can check rowCount via del.rowCount if available
    const affected = (del as unknown as { rowCount?: number }).rowCount ?? 0
    if (affected === 0) {
      return NextResponse.json({ error: 'Record not found' }, { status: 404 })
    }
    return NextResponse.json({ deleted: id })
  } catch (err) {
    console.error('Error deleting history', err)
    return NextResponse.json({ error: 'Failed to delete' }, { status: 500 })
  }
}
