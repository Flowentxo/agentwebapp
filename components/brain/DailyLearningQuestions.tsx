'use client';

import { useState, useEffect, useRef } from 'react';
import { Brain, Sparkles, TrendingUp, Star, Send, RefreshCw, Check } from 'lucide-react';
import { StreakCalendar } from './StreakCalendar';

interface LearningQuestion {
  id: string;
  question: string;
  category: string;
  difficulty: string;
  suggestedActions: string[];
  answered: boolean;
  userAnswer?: string;
  aiResponse?: string;
  rating?: number;
}

interface LearningInsights {
  currentStreak: number;
  totalQuestionsAnswered: number;
  averageRating: number;
  skillLevel: string;
}

export function DailyLearningQuestions() {
  const [questions, setQuestions] = useState<LearningQuestion[]>([]);
  const [insights, setInsights] = useState<LearningInsights | null>(null);
  const [selectedQuestion, setSelectedQuestion] = useState<LearningQuestion | null>(null);
  const [answer, setAnswer] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const fetchedRef = useRef(false);

  // Mock data fallback
  const mockQuestions: LearningQuestion[] = [
    {
      id: 'mock-q1',
      question: 'Wie könntest du die Conversion-Rate deines Sales-Funnels um 20% steigern?',
      category: 'strategic',
      difficulty: 'medium',
      suggestedActions: ['A/B Testing der Landing Page', 'Follow-up Sequenzen optimieren'],
      answered: false,
    },
    {
      id: 'mock-q2',
      question: 'Welche drei Kunden-Segmente haben das höchste Wachstumspotenzial?',
      category: 'business',
      difficulty: 'hard',
      suggestedActions: ['Marktanalyse durchführen', 'Kundendaten auswerten'],
      answered: false,
    },
  ];

  const mockInsights: LearningInsights = {
    currentStreak: 3,
    totalQuestionsAnswered: 12,
    averageRating: 4.2,
    skillLevel: 'Intermediate',
  };

  useEffect(() => {
    // Prevent double-fetch in React Strict Mode
    if (fetchedRef.current) return;
    fetchedRef.current = true;
    fetchQuestions();
    fetchInsights();
  }, []);

  const fetchQuestions = async () => {
    try {
      const response = await fetch('/api/learning/questions', {
        headers: { 'x-user-id': 'demo-user' },
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      if (data.success && data.questions?.length > 0) {
        setQuestions(data.questions);
      } else {
        setQuestions(mockQuestions);
      }
    } catch (error) {
      console.warn('Using mock questions (API unavailable):', error);
      setQuestions(mockQuestions);
    }
  };

  const fetchInsights = async () => {
    try {
      const response = await fetch('/api/learning/insights', {
        headers: { 'x-user-id': 'demo-user' },
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      if (data.success) {
        setInsights(data.insights);
      } else {
        setInsights(mockInsights);
      }
    } catch (error) {
      console.warn('Using mock insights (API unavailable):', error);
      setInsights(mockInsights);
    }
  };

  const generateNewQuestions = async () => {
    setIsGenerating(true);
    try {
      const response = await fetch('/api/learning/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': 'demo-user',
        },
        body: JSON.stringify({ count: 3 }),
      });
      const data = await response.json();
      if (data.success) {
        await fetchQuestions();
      }
    } catch (error) {
      console.error('Failed to generate questions:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const submitAnswer = async () => {
    if (!selectedQuestion || !answer.trim()) return;

    setIsLoading(true);
    try {
      const response = await fetch('/api/learning/answer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          questionId: selectedQuestion.id,
          answer: answer.trim(),
        }),
      });

      const data = await response.json();
      if (data.success) {
        // Update local state
        setQuestions(prev =>
          prev.map(q =>
            q.id === selectedQuestion.id
              ? { ...q, answered: true, userAnswer: answer, aiResponse: data.question.aiResponse }
              : q
          )
        );
        setSelectedQuestion(data.question);
        setAnswer('');
        await fetchInsights();
      }
    } catch (error) {
      console.error('Failed to submit answer:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const rateQuestion = async (questionId: string, rating: number) => {
    try {
      await fetch('/api/learning/rate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questionId, rating }),
      });

      setQuestions(prev =>
        prev.map(q => (q.id === questionId ? { ...q, rating } : q))
      );
    } catch (error) {
      console.error('Failed to rate question:', error);
    }
  };

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      business: 'from-blue-500/20 to-blue-600/10 border-blue-500/30',
      technical: 'from-purple-500/20 to-purple-600/10 border-purple-500/30',
      strategic: 'from-amber-500/20 to-amber-600/10 border-amber-500/30',
      operational: 'from-green-500/20 to-green-600/10 border-green-500/30',
    };
    return colors[category] || 'from-gray-500/20 to-gray-600/10 border-gray-500/30';
  };

  const getDifficultyColor = (difficulty: string) => {
    const colors: Record<string, string> = {
      easy: 'text-green-400',
      medium: 'text-yellow-400',
      hard: 'text-red-400',
    };
    return colors[difficulty] || 'text-muted-foreground';
  };

  return (
    <div className="space-y-6">
      {/* Header with Insights */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500/20 to-pink-500/10 border border-purple-500/30">
            <Brain className="h-5 w-5 text-purple-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold oracle-text-primary-color">Daily Learning Questions</h2>
            <p className="text-sm oracle-text-secondary-color">Personalized questions to boost your thinking</p>
          </div>
        </div>

        <button
          onClick={generateNewQuestions}
          disabled={isGenerating}
          className="flex items-center gap-2 rounded-lg bg-purple-500/10 px-4 py-2 text-sm font-medium text-purple-400 border border-purple-500/30 hover:bg-purple-500/20 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${isGenerating ? 'animate-spin' : ''}`} />
          {isGenerating ? 'Generating...' : 'Generate New'}
        </button>
      </div>

      {/* Streak Calendar */}
      <StreakCalendar />

      {/* Questions Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {questions.map((question) => (
          <div
            key={question.id}
            className={`oracle-glass-card oracle-glow-hover rounded-xl p-5 cursor-pointer transition-all ${selectedQuestion?.id === question.id ? 'ring-2 ring-[var(--oracle-blue)]/50' : ''
              }`}
            onClick={() => setSelectedQuestion(question)}
          >
            {/* Question Header */}
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  {question.category}
                </span>
                <span className={`text-xs font-medium ${getDifficultyColor(question.difficulty)}`}>
                  {question.difficulty}
                </span>
              </div>
              {question.answered && (
                <div className="flex items-center gap-1 text-green-400">
                  <Check className="h-4 w-4" />
                  <span className="text-xs font-medium">Answered</span>
                </div>
              )}
            </div>

            {/* Question Text */}
            <p className="oracle-text-primary-color font-medium mb-3 leading-relaxed">{question.question}</p>

            {/* Suggested Actions */}
            {question.suggestedActions && question.suggestedActions.length > 0 && (
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                  Suggested Actions:
                </p>
                {question.suggestedActions.map((action, idx) => (
                  <div key={idx} className="flex items-start gap-2 text-sm text-gray-300">
                    <span className="text-purple-400 mt-0.5">•</span>
                    <span>{action}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Rating */}
            {question.answered && (
              <div className="flex items-center gap-1 mt-4 pt-4 border-t border-white/10">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onClick={(e) => {
                      e.stopPropagation();
                      rateQuestion(question.id, star);
                    }}
                    className="transition-colors"
                  >
                    <Star
                      className={`h-4 w-4 ${(question.rating || 0) >= star
                          ? 'text-yellow-400 fill-yellow-400'
                          : 'text-muted-foreground'
                        }`}
                    />
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Answer Section */}
      {selectedQuestion && !selectedQuestion.answered && (
        <div className="rounded-xl bg-gradient-to-br from-purple-500/10 to-pink-500/5 border border-purple-500/30 p-6">
          <h3 className="oracle-text-primary-color font-semibold mb-4">Your Answer</h3>
          <textarea
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            placeholder="Take your time to reflect and answer thoughtfully..."
            className="w-full h-32 rounded-lg oracle-bg-secondary border border-white/10 dark:border-white/5 px-4 py-3 oracle-text-primary-color placeholder:oracle-text-secondary-color focus:outline-none focus:ring-2 focus:ring-purple-500/50 resize-none"
          />
          <div className="flex justify-end gap-3 mt-4">
            <button
              onClick={() => setSelectedQuestion(null)}
              className="px-4 py-2 rounded-lg oracle-hover-secondary oracle-text-secondary-color transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={submitAnswer}
              disabled={isLoading || !answer.trim()}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-purple-500 text-white hover:bg-purple-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send className="h-4 w-4" />
              {isLoading ? 'Submitting...' : 'Submit Answer'}
            </button>
          </div>
        </div>
      )}

      {/* AI Response */}
      {selectedQuestion?.answered && selectedQuestion.aiResponse && (
        <div className="rounded-xl bg-gradient-to-br from-green-500/10 to-green-600/5 border border-green-500/30 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="h-5 w-5 text-green-400" />
            <h3 className="oracle-text-primary-color font-semibold">AI Feedback</h3>
          </div>
          <div className="space-y-4">
            <div>
              <p className="text-xs font-medium oracle-text-secondary-color uppercase tracking-wider mb-2">Your Answer:</p>
              <p className="oracle-text-secondary-color leading-relaxed">{selectedQuestion.userAnswer}</p>
            </div>
            <div>
              <p className="text-xs font-medium oracle-text-secondary-color uppercase tracking-wider mb-2">AI Coach Response:</p>
              <p className="oracle-text-primary-color leading-relaxed">{selectedQuestion.aiResponse}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
