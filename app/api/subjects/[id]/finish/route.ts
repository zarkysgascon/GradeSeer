import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { components, items, subjects, subject_history } from "@/lib/schema";
import { eq, inArray } from "drizzle-orm";

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
  color: string | null;
  units: number | null;
}

interface HistoryRecord {
  id: string;
  subject_id: string;
  user_email: string;
  course_name: string;
  target_grade: string;
  final_grade: string;
  status: string;
  completed_at: Date | null;
  units?: number | null;
}

// Grade calculation functions (same as before)
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

    // 1. Get subject details with proper query
    console.log('📋 Fetching subject details...');
    const subjectResult = await db.query.subjects.findFirst({
      where: (subjects, { eq, and }) => and(
        eq(subjects.id, id),
        eq(subjects.user_email, user_email)
      ),
    });
    
    if (!subjectResult) {
      console.log('❌ Subject not found or access denied');
      return NextResponse.json({ error: 'Subject not found' }, { status: 404 });
    }

    const subject: Subject = subjectResult;
    console.log('📚 Subject found:', subject.name);

    // 2. Get components and items with proper queries
    console.log('🔧 Fetching components...');
    const componentsResult: Component[] = await db.query.components.findMany({
      where: eq(components.subject_id, id),
    });

    console.log('📊 Components found:', componentsResult.length);

    // 3. Get items for each component
    const componentsWithItems: Component[] = await Promise.all(
      componentsResult.map(async (component) => {
        const itemsResult: Item[] = await db.query.items.findMany({
          where: eq(items.component_id, component.id),
        });
        return {
          ...component,
          items: itemsResult
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
    
    // Initialize with a value to satisfy TypeScript
    let historyRecord: HistoryRecord | null = null;
    
    try {
      // Use transaction to ensure all operations succeed or fail together
      await db.transaction(async (tx) => {
        // First, insert into history with units
        console.log('📝 Inserting into subject_history...');
        const historyInsertResult = await tx.insert(subject_history).values({
          subject_id: id,
          user_email: user_email,
          course_name: subject.name,
          target_grade: targetGrade,
          final_grade: finalGrade.toFixed(2),
          status: status,
          completed_at: new Date(),
          units: subject.units || 3,
        }).returning();

        historyRecord = historyInsertResult[0] as HistoryRecord;
        console.log('✅ History record created:', historyRecord);

        // Get all component IDs for this subject
        const componentIds = componentsResult.map(comp => comp.id);
        
        // Then delete items in batches if there are many
        if (componentIds.length > 0) {
          console.log('🗑️ Deleting items...');
          await tx.delete(items).where(
            inArray(items.component_id, componentIds)
          );
        }
        
        console.log('🗑️ Deleting components...');
        await tx.delete(components).where(
          eq(components.subject_id, id)
        );
        
        console.log('🗑️ Deleting subject...');
        await tx.delete(subjects).where(
          eq(subjects.id, id)
        );
      });

      console.log('🎉 All operations completed successfully!');

    } catch (transactionError) {
      console.error('❌ Transaction failed:', transactionError);
      throw transactionError;
    }

    // 6. Check if historyRecord was created and return success response
    if (!historyRecord) {
      throw new Error('Failed to create history record');
    }

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