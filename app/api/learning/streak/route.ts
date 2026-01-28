import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { brainLearningQuestions } from '@/lib/db/schema-brain-learning';
import { sql } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

// Default empty response for when data is unavailable
const emptyResponse = {
  success: true,
  days: [],
  currentStreak: 0,
  longestStreak: 0,
  totalActiveDays: 0,
};

/**
 * GET /api/learning/streak
 * Get user's learning streak data for calendar visualization
 * Returns empty data gracefully if database/table is not available
 */
export async function GET(req: NextRequest) {
  try {
    const userId = req.nextUrl.searchParams.get('userId') || req.headers.get('x-user-id') || 'demo-user';

    let db;
    try {
      db = getDb();
    } catch (dbError) {
      console.warn('[LEARNING_STREAK] Database not available:', dbError);
      return NextResponse.json(emptyResponse);
    }

    // Try to query the database with proper error handling
    let results: { date: string; questionsAnswered: number; avgRating: number }[] = [];
    
    try {
      results = await db
        .select({
          date: sql<string>`DATE(${brainLearningQuestions.createdAt})`,
          questionsAnswered: sql<number>`COUNT(*)`,
          avgRating: sql<number>`AVG(COALESCE(${brainLearningQuestions.rating}, 0))`,
        })
        .from(brainLearningQuestions)
        .where(sql`${brainLearningQuestions.answered} = true AND ${brainLearningQuestions.userId} = ${userId}`)
        .groupBy(sql`DATE(${brainLearningQuestions.createdAt})`)
        .orderBy(sql`DATE(${brainLearningQuestions.createdAt}) DESC`)
        .limit(365);
    } catch (queryError: unknown) {
      const error = queryError as Error;
      // Table might not exist yet - return empty data
      if (error.message?.includes('does not exist') || 
          error.message?.includes('relation') ||
          error.message?.includes('ECONNREFUSED')) {
        console.warn('[LEARNING_STREAK] Table or connection not available:', error.message);
        return NextResponse.json(emptyResponse);
      }
      throw queryError;
    }

    // Convert to array of days
    const days = results.map(r => ({
      date: r.date,
      questionsAnswered: Number(r.questionsAnswered),
      rating: Number(r.avgRating),
    }));

    // If no data, return empty response
    if (days.length === 0) {
      return NextResponse.json(emptyResponse);
    }

    // Calculate current streak
    let currentStreak = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = 0; i < 365; i++) {
      const checkDate = new Date(today);
      checkDate.setDate(today.getDate() - i);
      const dateStr = checkDate.toISOString().split('T')[0];

      const dayData = days.find(d => d.date === dateStr);

      if (dayData && dayData.questionsAnswered > 0) {
        currentStreak++;
      } else if (i > 0) {
        // Allow one day grace (today might not have activity yet)
        break;
      }
    }

    // Calculate longest streak
    let longestStreak = 0;
    let tempStreak = 0;
    const allDates = days.map(d => new Date(d.date)).sort((a, b) => a.getTime() - b.getTime());

    for (let i = 0; i < allDates.length; i++) {
      if (i === 0) {
        tempStreak = 1;
      } else {
        const prevDate = allDates[i - 1];
        const currDate = allDates[i];
        const diffDays = Math.floor((currDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24));

        if (diffDays === 1) {
          tempStreak++;
        } else {
          longestStreak = Math.max(longestStreak, tempStreak);
          tempStreak = 1;
        }
      }
    }
    longestStreak = Math.max(longestStreak, tempStreak);

    // Total active days
    const totalActiveDays = days.filter(d => d.questionsAnswered > 0).length;

    return NextResponse.json({
      success: true,
      days,
      currentStreak,
      longestStreak,
      totalActiveDays,
    });
  } catch (error: unknown) {
    const err = error as Error;
    console.error('[LEARNING_STREAK]', err);
    
    // Return empty data on any error to prevent frontend crashes
    return NextResponse.json(emptyResponse);
  }
}
