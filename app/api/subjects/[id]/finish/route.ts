import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { subject_history, subjects, components, items } from "@/lib/schema";
import { eq, inArray } from "drizzle-orm";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { user_email } = body;

    if (!user_email) {
      return NextResponse.json({ error: "User email is required" }, { status: 400 });
    }

    // Verify subject exists
    const subjectResult = await db
      .select()
      .from(subjects)
      .where(eq(subjects.id, id));

    if (subjectResult.length === 0) {
      return NextResponse.json({ error: "Subject not found" }, { status: 404 });
    }

    const subject = subjectResult[0];

    // Get components for this subject
    const componentsResult = await db
      .select()
      .from(components)
      .where(eq(components.subject_id, id));

    // Get all items for all components
    let allItems: any[] = [];
    if (componentsResult.length > 0) {
      const componentIds = componentsResult.map(comp => comp.id);
      
      const itemsResult = await db
        .select()
        .from(items)
        .where(inArray(items.component_id, componentIds));
      
      allItems = itemsResult;
    }

    // Calculate final grade
    let totalWeightedGrade = 0;
    let totalWeight = 0;

    componentsResult.forEach(component => {
      const componentItems = allItems.filter(item => item.component_id === component.id);
      
      if (componentItems.length > 0) {
        const validItems = componentItems.filter((item: any) => {
          const score = Number(item.score);
          const max = Number(item.max);
          return !isNaN(score) && !isNaN(max) && max > 0;
        });
        
        if (validItems.length > 0) {
          const totalScore = validItems.reduce((sum: number, item: any) => {
            return sum + Number(item.score || 0);
          }, 0);
          
          const totalMax = validItems.reduce((sum: number, item: any) => {
            return sum + Number(item.max || 0);
          }, 0);
          
          if (totalMax > 0) {
            const componentGrade = (totalScore / totalMax) * 100;
            const componentPercentage = Number(component.percentage);
            totalWeightedGrade += componentGrade * (componentPercentage / 100);
            totalWeight += componentPercentage / 100;
          }
        }
      }
    });

    const finalPercentage = totalWeight > 0 ? Number((totalWeightedGrade / totalWeight).toFixed(2)) : 0;
    
    // Convert to grade scale
    const percentageToGradeScale = (percentage: number): number => {
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
    };

    const finalGrade = percentageToGradeScale(finalPercentage);
    const targetGrade = subject.target_grade ? parseFloat(subject.target_grade) : 5.0;
    
    const status = finalGrade <= targetGrade ? 'reached' : 'missed';

    // Store in history
    const historyData = {
      subject_id: id,
      user_email,
      course_name: subject.name,
      target_grade: targetGrade.toString(),
      final_grade: finalGrade.toFixed(2),
      status,
      completed_at: new Date(),
    };

    // Insert into history
    const historyRecord = await db
      .insert(subject_history)
      .values(historyData)
      .returning();

    // Delete the original subject and its related data
    if (componentsResult.length > 0) {
      const componentIds = componentsResult.map(comp => comp.id);
      
      // Delete all items for all components
      if (allItems.length > 0) {
        await db
          .delete(items)
          .where(inArray(items.component_id, componentIds));
      }
      
      // Delete all components
      await db
        .delete(components)
        .where(inArray(components.id, componentIds));
    }
    
    // Delete the subject
    await db
      .delete(subjects)
      .where(eq(subjects.id, id));

    return NextResponse.json({ 
      success: true, 
      final_grade: finalGrade.toFixed(2),
      status,
      message: "Subject successfully completed and moved to history"
    });

  } catch (error) {
    console.error("Finish subject error:", error);
    
    return NextResponse.json({ 
      error: "Failed to finish subject",
      details: error instanceof Error ? error.message : "Unknown error",
      success: false
    }, { status: 500 });
  }
}