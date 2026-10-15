import { Hono } from 'hono';
import type { ApiResponse, DashboardData } from '@study-buddy/shared';
import type { Env } from '../types';
import { toDailyGoal, toStudySession } from '../db/mappers';

const dashboardRoute = new Hono<{ Bindings: Env }>();

const MOTIVATIONAL_QUOTES: string[] = [
  // Tamil Wisdom & Thirukkural
  'கற்க கசடறக் கற்பவை கற்றபின் நிற்க அதற்குத் தக - Thiruvalluvar (Thirukkural 391: Learn thoroughly what you learn, and live accordingly.)',
  'தொட்டனைத் தூறும் மணற்கேணி மாந்தர்க்குக் கற்றனைத் தூறும் அறிவு - Thiruvalluvar (Thirukkural 396: In sandy soil, water gushes as deep as you dig; in minds, wisdom grows as deep as you study.)',
  'வெள்ளத் தனைய மலர்நீட்டம் மாந்தர்தம் உள்ளத் தனையது உயர்வு - Thiruvalluvar (Thirukkural 595: The stalk of water flowers grows with the water level; a person rises to the height of their ambition.)',
  'முயற்சி திருவினை ஆக்கும் முயற்றின்மை இன்மை புகுத்தி விடும் - Thiruvalluvar (Thirukkural 616: Effort brings prosperity; lack of effort brings poverty.)',
  'எண்ணும் எழுத்தும் கண்எனத் தகும் - Avvaiyar (Numbers and letters are like two eyes to human life.)',
  'இளமையில் கல் - Avvaiyar (Cultivate knowledge with unwavering dedication in your youth.)',
  'ஓதுவது ஒழியேன் - Avvaiyar (Never cease your quest for learning and self-improvement.)',
  'தோல்வி நிலையென நினைத்தால் மனிதன் வாழ்வை நினைக்கலாமா? - Kannadasan (If defeat were final, how could humanity ever persevere?)',
  'ரௌத்திரம் பழகு, சாதனைகளை நோக்கி விரைந்து நில் - Subramania Bharati (Channel your fiery passion into disciplined achievement.)',
  'Dreams are not those which come while you sleep, but dreams are those when you do not sleep before fulfilling them. - Dr. A.P.J. Abdul Kalam',
  'If you want to shine like a sun, first burn like a sun. - Dr. A.P.J. Abdul Kalam',
  'Confidence and hard work is the best medicine to kill the disease called failure. - Dr. A.P.J. Abdul Kalam',

  // Swami Vivekananda & Indian Thought
  'Arise, awake, and stop not till the goal is reached. - Swami Vivekananda',
  'Take up one idea. Make that one idea your life; dream of it; think of it; live on that idea. - Swami Vivekananda',
  'You have to grow from the inside out. None can teach you, none can make you spiritual. There is no other teacher but your own soul. - Swami Vivekananda',

  // General Study & Motivation
  'It always seems impossible until it is done. - Nelson Mandela',
  'Education is the most powerful weapon which you can use to change the world. - Nelson Mandela',
  'Live as if you were to die tomorrow. Learn as if you were to live forever. - Mahatma Gandhi',
  'An investment in knowledge pays the best interest. - Benjamin Franklin',
  'The secret of getting ahead is getting started. - Mark Twain',
  'Success is the sum of small efforts, repeated day in and day out. - Robert Collier',

  // Discipline & Consistency
  'We are what we repeatedly do. Excellence, then, is not an act, but a habit. - Will Durant',
  'You do not rise to the level of your goals. You fall to the level of your systems. - James Clear',
  'Long-term consistency trumps short-term intensity every single time. - Bruce Lee',
  'Small disciplines repeated with consistency every day lead to great achievements gained slowly over time. - John C. Maxwell',
  'Discipline is choosing between what you want now and what you want most. - Abraham Lincoln',
  'At dawn, when you have trouble getting out of bed, tell yourself: I have to go to work as a human being. - Marcus Aurelius',
];

dashboardRoute.get('/', async (c) => {
  try {
    const today = new Date().toISOString().slice(0, 10);
    const sevenDaysAgoDate = new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

    // 1. Today's goals
    const goalsResult = await c.env.DB.prepare(
      `SELECT * FROM daily_goals 
       WHERE date = ? 
       ORDER BY CASE priority WHEN 'high' THEN 1 WHEN 'medium' THEN 2 WHEN 'low' THEN 3 ELSE 4 END, created_at ASC`
    )
      .bind(today)
      .all<Record<string, unknown>>();

    const todayGoals = (goalsResult.results || []).map(toDailyGoal);

    // 2. Today's sessions
    const sessionsResult = await c.env.DB.prepare(
      `SELECT * FROM study_sessions 
       WHERE date = ? 
       ORDER BY created_at DESC`
    )
      .bind(today)
      .all<Record<string, unknown>>();

    const todaySessions = (sessionsResult.results || []).map(toStudySession);

    // 3. Due revision count
    const dueRevisionResult = await c.env.DB.prepare(
      `SELECT COUNT(*) as count FROM revision_items 
       WHERE next_review <= ? AND status = 'pending'`
    )
      .bind(today)
      .first<{ count: number }>();

    const dueRevisionCount = Number(dueRevisionResult?.count ?? 0);

    // 4. Most recent completed test result
    const recentTestResultRow = await c.env.DB.prepare(
      `SELECT id, title, score, total, completed_at 
       FROM practice_tests 
       WHERE status = 'completed' AND completed_at IS NOT NULL 
       ORDER BY completed_at DESC 
       LIMIT 1`
    ).first<{
      id: string;
      title: string;
      score: number | null;
      total: number | null;
      completed_at: string;
    }>();

    const recentTestResult = recentTestResultRow
      ? {
          testId: recentTestResultRow.id,
          title: recentTestResultRow.title,
          score: Number(recentTestResultRow.score ?? 0),
          total: Number(recentTestResultRow.total ?? 0),
          completedAt: recentTestResultRow.completed_at,
        }
      : null;

    // 5. Weekly stats (last 7 days)
    const weeklySessions = await c.env.DB.prepare(
      `SELECT date, duration_minutes, questions_attempted, correct, incorrect 
       FROM study_sessions 
       WHERE date >= ? AND date <= ?`
    )
      .bind(sevenDaysAgoDate, today)
      .all<{
        date: string;
        duration_minutes: number;
        questions_attempted: number;
        correct: number;
        incorrect: number;
      }>();

    const rows = weeklySessions.results || [];
    let totalMinutes = 0;
    let totalQuestions = 0;
    let totalCorrect = 0;
    let totalAnswered = 0;
    const daysSet = new Set<string>();

    for (const row of rows) {
      totalMinutes += Number(row.duration_minutes ?? 0);
      const attempted = Number(row.questions_attempted ?? 0);
      totalQuestions += attempted;
      const correct = Number(row.correct ?? 0);
      const incorrect = Number(row.incorrect ?? 0);
      totalCorrect += correct;
      totalAnswered += correct + incorrect;
      if (row.date) {
        daysSet.add(row.date);
      }
    }

    const accuracy = totalAnswered > 0 ? Math.round((totalCorrect / totalAnswered) * 100) : null;

    // 6. Random motivational quote
    const randomQuoteIndex = Math.floor(Math.random() * MOTIVATIONAL_QUOTES.length);
    const motivationalQuote = MOTIVATIONAL_QUOTES[randomQuoteIndex];

    const data: DashboardData = {
      today,
      todayGoals,
      todaySessions,
      dueRevisionCount,
      recentTestResult,
      weeklyStats: {
        totalMinutes,
        totalQuestions,
        daysStudied: daysSet.size,
        accuracy,
      },
      motivationalQuote,
    };

    return c.json<ApiResponse<DashboardData>>({
      success: true,
      data,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to fetch dashboard data';
    return c.json<ApiResponse<DashboardData>>(
      {
        success: false,
        error: message,
      },
      500
    );
  }
});

export default dashboardRoute;
