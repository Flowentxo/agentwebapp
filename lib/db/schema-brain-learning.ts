import { pgTable, uuid, varchar, text, timestamp, integer, boolean, jsonb, index } from 'drizzle-orm/pg-core';

/**
 * Daily Learning Questions - Personalized AI-generated questions based on user activity
 */
export const brainLearningQuestions = pgTable('brain_learning_questions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: varchar('user_id', { length: 255 }).notNull(),
  question: text('question').notNull(),
  category: varchar('category', { length: 100 }).notNull(), // 'business', 'technical', 'strategic', 'operational'
  difficulty: varchar('difficulty', { length: 50 }).notNull().default('medium'), // 'easy', 'medium', 'hard'
  context: jsonb('context'), // Related activities, memories that triggered this question
  suggestedActions: jsonb('suggested_actions'), // Array of recommended actions
  answered: boolean('answered').notNull().default(false),
  userAnswer: text('user_answer'),
  aiResponse: text('ai_response'),
  rating: integer('rating'), // User feedback: 1-5 stars
  createdAt: timestamp('created_at').defaultNow().notNull(),
  answeredAt: timestamp('answered_at'),
}, (table) => ({
  userIdIdx: index('idx_brain_learning_user_id').on(table.userId),
  createdAtIdx: index('idx_brain_learning_created_at').on(table.createdAt),
  answeredIdx: index('idx_brain_learning_answered').on(table.answered),
  categoryIdx: index('idx_brain_learning_category').on(table.category),
}));

/**
 * Learning Insights - Track user learning progress and patterns
 */
export const brainLearningInsights = pgTable('brain_learning_insights', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: varchar('user_id', { length: 255 }).notNull().unique(),
  totalQuestionsAsked: integer('total_questions_asked').notNull().default(0),
  totalQuestionsAnswered: integer('total_questions_answered').notNull().default(0),
  averageRating: integer('average_rating').notNull().default(0), // 0-5
  currentStreak: integer('current_streak').notNull().default(0), // Days in a row answering questions
  longestStreak: integer('longest_streak').notNull().default(0),
  lastQuestionAt: timestamp('last_question_at'),
  lastAnswerAt: timestamp('last_answer_at'),
  preferredCategories: jsonb('preferred_categories').default('[]'), // Array of category preferences
  skillLevel: varchar('skill_level', { length: 50 }).notNull().default('beginner'), // 'beginner', 'intermediate', 'advanced', 'expert'
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
