import { db } from "@/lib/db";
import { sql } from "drizzle-orm";
import { NextResponse } from "next/server";

// Grade calculation functions (same as your frontend)
function computeRawComponentGrade(items: any[]): number {
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

function computeRawGrade(components: any[]): number {
  if (!components || components.length === 0) return 0;

  let totalWeightedGrade = 0;
  let totalWeight = 0;

  components.forEach((component) => {
    const componentGrade = computeRawComponentGrade(component.items || []);
    totalWeightedGrade += componentGrade * (component.percentage / 100);
    totalWeight += component.percentage / 100;
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
  const { id } = await params;
  
  console.log('🎯 FINISH API CALLED for subject ID:', id);

  try {
    const body = await request.json();
    console.log('📦 Request body:', body);
    
    const { user_email } = body;
    console.log('👤 User email:', user_email);

    // 1. Get subject details
    const subjectResult = await db.execute(sql`
      SELECT * FROM subjects WHERE id = ${id} AND user_email = ${user_email}
    `);
    
    if (subjectResult.rows.length === 0) {
      return NextResponse.json({ error: 'Subject not found' }, { status: 404 });
    }

    const subject = subjectResult.rows[0];
    console.log('📊 Subject found:', subject);

    // 2. Get components for this subject
    const componentsResult = await db.execute(sql`
      SELECT * FROM components WHERE subject_id = ${id}
    `);
    console.log('📊 Components found:', componentsResult.rows.length);

    // 3. Get items for each component
    const componentsWithItems = await Promise.all(
      componentsResult.rows.map(async (component) => {
        const itemsResult = await db.execute(sql`
          SELECT * FROM items WHERE component_id = ${component.id}
        `);
        return {
          ...component,
          items: itemsResult.rows
        };
      })
    );

    console.log('📊 Components with items:', componentsWithItems.length);

    // 4. Calculate final grade
    const finalPercentage = computeRawGrade(componentsWithItems);
    const finalGrade = percentageToGradeScale(finalPercentage);
    
    // Handle target_grade - convert to string safely
    const targetGrade = subject.target_grade ? subject.target_grade.toString() : '0';
    const targetGradeNum = parseFloat(targetGrade);
    
    // Determine status
    const status = finalGrade <= targetGradeNum ? 'reached' : 'missed';
    
    console.log('🧮 Final grade calculation:');
    console.log('📊 Final percentage:', finalPercentage);
    console.log('📊 Final grade:', finalGrade);
    console.log('📊 Target grade:', targetGradeNum);
    console.log('📊 Status:', status);

    // 🔥🔥🔥 CRITICAL FIX: INSERT INTO HISTORY FIRST 🔥🔥🔥
    console.log('📝 INSERTING INTO subject_history FIRST...');
    
    // Check current state
    const beforeInsert = await db.execute(sql`SELECT COUNT(*) as count FROM subject_history`);
    console.log('📊 Records in subject_history BEFORE insert:', beforeInsert.rows[0].count);

    // 5. INSERT INTO subject_history - THIS MUST HAPPEN FIRST (while subject still exists)
    const historyResult = await db.execute(sql`
      INSERT INTO subject_history (subject_id, user_email, course_name, target_grade, final_grade, status, completed_at)
      VALUES (${id}, ${user_email}, ${subject.name}, ${targetGrade}, ${finalGrade.toFixed(2)}, ${status}, NOW())
      RETURNING *
    `);

    console.log('✅ History record created in subject_history:', historyResult.rows[0]);

    // Verify the record was actually inserted
    const afterInsert = await db.execute(sql`SELECT COUNT(*) as count FROM subject_history`);
    console.log('📊 Records in subject_history AFTER insert:', afterInsert.rows[0].count);
    
    const verifyRecord = await db.execute(sql`
      SELECT * FROM subject_history WHERE subject_id = ${id}
    `);
    console.log('✅ Verification - record found after insert:', verifyRecord.rows.length);

    // 🔥🔥🔥 CRITICAL FIX: DELETE ORIGINAL DATA ONLY AFTER HISTORY INSERT 🔥🔥🔥
    console.log('🗑️ NOW deleting original subject data (after history insert)...');
    
    // Delete items first
    const itemsDeleted = await db.execute(sql`
      DELETE FROM items 
      WHERE component_id IN (SELECT id FROM components WHERE subject_id = ${id})
    `);
    console.log('🗑️ Items deleted:', itemsDeleted.rowCount);
    
    // Delete components
    const componentsDeleted = await db.execute(sql`
      DELETE FROM components WHERE subject_id = ${id}
    `);
    console.log('🗑️ Components deleted:', componentsDeleted.rowCount);
    
    // Delete subject
    const subjectDeleted = await db.execute(sql`
      DELETE FROM subjects WHERE id = ${id}
    `);
    console.log('🗑️ Subject deleted:', subjectDeleted.rowCount);

    console.log('🎉 Finish process completed successfully!');

    // 7. Return success response
    return NextResponse.json({ 
      success: true, 
      final_grade: finalGrade.toFixed(2),
      status: status,
      message: 'Subject successfully completed and moved to history'
    });

  } catch (error) {
    console.error('❌ Finish process error:', error);
    return NextResponse.json(
      { error: 'Failed to finish subject' }, 
      { status: 500 }
    );
  }
}