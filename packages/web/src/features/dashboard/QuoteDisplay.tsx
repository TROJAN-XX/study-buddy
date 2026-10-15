import React, { useMemo } from 'react';
import { Quote } from 'lucide-react';

interface MotivationalQuote {
  quote: string;
  meaning?: string;
  author: string;
  source?: string;
}

const QUOTES: MotivationalQuote[] = [
  {
    quote: 'தொட்டனைத் தூறும் மணற்கேணி மாந்தர்க்குக் கற்றனைத் தூறும் அறிவு.',
    meaning: 'In sandy soil, the deeper you dig, the more water springs forth; the more you learn, the deeper flows your wisdom.',
    author: 'Thiruvalluvar',
    source: 'Thirukkural 396',
  },
  {
    quote: 'கற்க கசடறக் கற்பவை கற்றபின் நிற்க அதற்குத் தக.',
    meaning: 'Learn flawlessly that which is worthy of learning; and having learned, let your conduct strictly reflect that learning.',
    author: 'Thiruvalluvar',
    source: 'Thirukkural 391',
  },
  {
    quote: 'முயற்சி திருவினையாக்கும் முயற்றின்மை இன்மை புகுத்திவிடும்.',
    meaning: 'Persistent persevering effort yields prosperity; the lack of effort plunges one into adversity.',
    author: 'Thiruvalluvar',
    source: 'Thirukkural 616',
  },
  {
    quote: 'ஊழையும் உப்பக்கம் காண்பர் உலைவின்றித் தாழாது உஞற்று பவர்.',
    meaning: 'Even adverse fate will retreat in defeat before those who toil persistently with unflagging resolve.',
    author: 'Thiruvalluvar',
    source: 'Thirukkural 620',
  },
  {
    quote: 'காலமறிந்து இடமறிந்து செய்க.',
    meaning: 'Act with precision, knowing the right time and right situation.',
    author: 'Thiruvalluvar',
    source: 'Thirukkural',
  },
  {
    quote: 'Discipline is choosing between what you want now and what you want most.',
    author: 'Abraham Lincoln',
  },
  {
    quote: 'Small daily improvements over time lead to stunning results.',
    author: 'Robin Sharma',
  },
  {
    quote: 'The secret of getting ahead is getting started.',
    author: 'Mark Twain',
  },
  {
    quote: 'Success is the sum of small efforts, repeated day in and day out.',
    author: 'Robert Collier',
  },
  {
    quote: 'Consistency is the DNA of mastery.',
    author: 'Robin Sharma',
  },
  {
    quote: 'Focus is a muscle; the more you exercise it without distraction, the sharper your mind becomes.',
    author: 'Study Buddy Mindset',
  },
  {
    quote: 'An investment in knowledge pays the best interest.',
    author: 'Benjamin Franklin',
  },
  {
    quote: 'Your only limit is the consistency of your effort and the honesty of your revision.',
    author: 'Exam Prep Principle',
  },
  {
    quote: 'Hard work beats talent when talent fails to work hard.',
    author: 'Tim Notke',
  },
  {
    quote: 'Trust the daily process. Your future selected self is thanking you right now for staying focused.',
    author: 'Aspirant Wisdom',
  },
  {
    quote: 'It does not matter how slowly you go as long as you do not stop.',
    author: 'Confucius',
  },
];

export const QuoteDisplay: React.FC = () => {
  const quote = useMemo(() => {
    const now = new Date();
    const startOfYear = new Date(now.getFullYear(), 0, 0);
    const diff = now.getTime() - startOfYear.getTime();
    const oneDay = 1000 * 60 * 60 * 24;
    const dayOfYear = Math.floor(diff / oneDay);
    const index = Math.abs(dayOfYear) % QUOTES.length;
    return QUOTES[index];
  }, []);

  return (
    <div className="flex items-start gap-3 py-2 px-3 sm:px-4 rounded-xl bg-surface-elevated/40 border border-surface-border/50 text-text-muted text-xs sm:text-sm">
      <Quote className="w-4 h-4 shrink-0 mt-0.5 text-accent/60" />
      <div className="space-y-0.5 min-w-0">
        <p className="font-medium text-text-secondary italic">
          "{quote.quote}"
        </p>
        {quote.meaning && (
          <p className="text-[11px] sm:text-xs text-text-muted">
            {quote.meaning}
          </p>
        )}
        <p className="text-[10px] sm:text-[11px] font-semibold text-text-muted/80 tracking-wide uppercase">
          — {quote.author} {quote.source ? `(${quote.source})` : ''}
        </p>
      </div>
    </div>
  );
};
