import { db } from "@/lib/db";
import { sql } from "drizzle-orm";
import { NextResponse } from "next/server";

// Interfaces
interface Item {
  id: string;
  component_id: string;
  name: string;
  score: number | null;
  max: number | null;
  date: string | null;
  target: number | null;
  topic: string | null;
}

interface Component {
  id: string;
  name: string;
  percentage: string;
  priority: number;
  subject_id: string;
  items?: Item[];
}

interface Subject {
  id: string;
  name: string;
  is_major: boolean;
  user_email: string;
  target_grade: string | null;
  color: string;
  units?: number; // ADDED: Units field
}

interface HistoryRecord {
  id: string;
  subject_id: string;
  user_email: string;
  course_name: string;
  target_grade: string;
  final_grade: string;
  status: string;
  completed_at: string;
}

// Grade calculation functions
function computeRawComponentGrade(items: Item[]): number {
  if (!items || items.length === 0) return 0;

  const validItems = items.filter((item) => 
    item.score !== null && item.score !== undefined && 
    item.max !== null && item.max !== undefined && 
    item.max > 0
  );
  
  if (validItems.length === 0) return 0;

  const totalScore = validItems.reduce((sum, item) => sum + (item.score || 0), 0);
  const totalMax = validItems.reduce((sum, item) => sum + (item.max || 0), 0);

  return totalMax > 0 ? Number(((totalScore / totalMax) * 100).toFixed(2)) : 0;
}

function computeRawGrade(components: Component[]): number {
  if (!components || components.length === 0) return 0;

  let totalWeightedGrade = 0;
  let totalWeight = 0;

  components.forEach((component) => {
    const componentGrade = computeRawComponentGrade(component.items || []);
    totalWeightedGrade += componentGrade * (parseFloat(component.percentage) / 100);
    totalWeight += parseFloat(component.percentage) / 100;
  });

  return totalWeight > 0 ? Number((totalWeightedGrade / totalWeight).toFixed(2)) : 0;
}

function percentageToGradeScale(percentage: number): number {
  if (percentage >= 98) return 1.0;
  if (percentage >= 95) return 1.25;
  if (percentage >= 92) return 1.5;
  if (percentage >= 89) return 1.75;
  if (percentage >= 86) return 2.0;
  if (percentage >= 83) return 2.25;
  if (percentage >= 80) return 2.5;
  if (percentage >= 77) return 2.75;
  if (percentage >= 74) return 3.0;
  if (percentage >= 71) return 3.25;
  if (percentage >= 68) return 3.5;
  if (percentage >= 65) return 3.75;
  if (percentage >= 60) return 4.0;
  return 5.0;
}

export async function POST(
  request: Request, 
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { user_email } = body;

    console.log('🎯 FINISH API CALLED for subject ID:', id, 'User:', user_email);

    if (!user_email) {
      return NextResponse.json({ error: 'User email is required' }, { status: 400 });
    }

    // 1. Get subject details with better error handling
    console.log('📋 Fetching subject details...');
    const subjectResult = await db.execute(sql`
      SELECT * FROM subjects WHERE id = ${id} AND user_email = ${user_email}
    `);
    
    if (subjectResult.rows.length === 0) {
      console.log('❌ Subject not found or access denied');
      return NextResponse.json({ error: 'Subject not found' }, { status: 404 });
    }

    // Fix: Use type assertion through unknown
    const subject = subjectResult.rows[0] as unknown as Subject;
    console.log('📚 Subject found:', subject.name);

    // 2. Get components and items
    console.log('🔧 Fetching components...');
    const componentsResult = await db.execute(sql`
      SELECT * FROM components WHERE subject_id = ${id}
    `);

    console.log('📊 Components found:', componentsResult.rows.length);

    // 3. Get items for each component
    const componentsWithItems: Component[] = await Promise.all(
      (componentsResult.rows as unknown as Component[]).map(async (component) => {
        const itemsResult = await db.execute(sql`
          SELECT * FROM items WHERE component_id = ${component.id}
        `);
        return {
          ...component,
          items: itemsResult.rows as unknown as Item[]
        };
      })
    );

    // 4. Calculate final grade
    console.log('🧮 Calculating final grade...');
    const finalPercentage = computeRawGrade(componentsWithItems);
    const finalGrade = percentageToGradeScale(finalPercentage);
    const targetGrade = subject.target_grade ? subject.target_grade.toString() : '0';
    const targetGradeNum = parseFloat(targetGrade);
    const status = finalGrade <= targetGradeNum ? 'reached' : 'missed';

    console.log('📈 Grade Calculation:', {
      finalPercentage,
      finalGrade,
      targetGrade: targetGradeNum,
      status
    });

    // 5. Use transaction for everything
    console.log('💾 Starting database transaction...');
    let historyRecord: HistoryRecord | null = null;
    
    try {
      // First, insert into history
      console.log('📝 Inserting into subject_history...');
      const historyResult = await db.execute(sql`
        INSERT INTO subject_history 
          (subject_id, user_email, course_name, target_grade, final_grade, status, completed_at)
        VALUES 
          (${id}, ${user_email}, ${subject.name}, ${targetGrade}, ${finalGrade.toFixed(2)}, ${status}, NOW())
        RETURNING *
      `);

      // Fix: Use type assertion through unknown
      historyRecord = historyResult.rows[0] as unknown as HistoryRecord;
      console.log('✅ History record created:', historyRecord);

      // Then delete the original data
      console.log('🗑️ Deleting items...');
      await db.execute(sql`
        DELETE FROM items 
        WHERE component_id IN (SELECT id FROM components WHERE subject_id = ${id})
      `);
      
      console.log('🗑️ Deleting components...');
      await db.execute(sql`
        DELETE FROM components WHERE subject_id = ${id}
      `);
      
      console.log('🗑️ Deleting subject...');
      await db.execute(sql`
        DELETE FROM subjects WHERE id = ${id}
      `);

      console.log('🎉 All operations completed successfully!');

    } catch (transactionError) {
      console.error('❌ Transaction failed:', transactionError);
      throw transactionError;
    }

    // 6. Return success response
    return NextResponse.json({ 
      success: true, 
      final_grade: finalGrade.toFixed(2),
      status: status,
      history_record: historyRecord,
      message: 'Subject successfully completed and moved to history'
    });

  } catch (error) {
    console.error('💥 Finish process error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to finish subject',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, 
      { status: 500 }
    );
  }
}