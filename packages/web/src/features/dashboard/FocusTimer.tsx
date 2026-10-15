import React, { useState, useEffect, useRef } from 'react';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { Select } from '../../components/ui/Select';
import { Play, Pause, RotateCcw, Bell, CheckCircle2, Coffee, Brain } from 'lucide-react';
import { SUBJECTS, TOPICS } from '@study-buddy/shared';
import { apiClient } from '../../lib/api';
import { getToday } from '../../lib/utils';

interface FocusTimerProps {
  isOpen: boolean;
  onClose: () => void;
  onSessionLogged?: () => void;
}

export const FocusTimer: React.FC<FocusTimerProps> = ({
  isOpen,
  onClose,
  onSessionLogged,
}) => {
  const [mode, setMode] = useState<'work' | 'break'>('work');
  const [workDuration, setWorkDuration] = useState<number>(25); // minutes
  const [breakDuration, setBreakDuration] = useState<number>(5); // minutes
  const [timeLeft, setTimeLeft] = useState<number>(25 * 60);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [completedSessionsCount, setCompletedSessionsCount] = useState<number>(0);
  const [showLogPrompt, setShowLogPrompt] = useState<boolean>(false);

  // Quick log states
  const [selectedSubject, setSelectedSubject] = useState<string>(SUBJECTS[0]?.name || 'Reasoning');
  const [selectedTopic, setSelectedTopic] = useState<string>('');
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isSaved, setIsSaved] = useState<boolean>(false);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Filter topics based on subject
  const currentSubjectObj = SUBJECTS.find((s) => s.name === selectedSubject);
  const availableTopics = currentSubjectObj
    ? TOPICS.filter((t) => t.subjectId === currentSubjectObj.id)
    : [];

  useEffect(() => {
    if (availableTopics.length > 0 && !selectedTopic) {
      setSelectedTopic(availableTopics[0].name);
    }
  }, [selectedSubject, availableTopics, selectedTopic]);

  // Handle mode / duration updates
  const totalSeconds = (mode === 'work' ? workDuration : breakDuration) * 60;

  const resetTimer = (newMode = mode) => {
    if (timerRef.current) clearInterval(timerRef.current);
    setIsRunning(false);
    setShowLogPrompt(false);
    setIsSaved(false);
    const secs = (newMode === 'work' ? workDuration : breakDuration) * 60;
    setTimeLeft(secs);
  };

  const playChime = () => {
    if (!soundEnabled) return;
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const now = ctx.currentTime;

      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gainNode = ctx.createGain();

      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(587.33, now); // D5
      osc1.frequency.exponentialRampToValueAtTime(880, now + 0.3); // A5

      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(880, now);
      osc2.frequency.exponentialRampToValueAtTime(1174.66, now + 0.3); // D6

      gainNode.gain.setValueAtTime(0.15, now);
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + 1.2);

      osc1.connect(gainNode);
      osc2.connect(gainNode);
      gainNode.connect(ctx.destination);

      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 1.2);
      osc2.stop(now + 1.2);
    } catch (e) {
      console.warn('Audio chime unsupported or blocked:', e);
    }
  };

  useEffect(() => {
    if (isRunning) {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current!);
            setIsRunning(false);
            playChime();
            if (mode === 'work') {
              setCompletedSessionsCount((c) => c + 1);
              setShowLogPrompt(true);
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRunning, mode, soundEnabled]);

  const toggleTimer = () => {
    setIsRunning(!isRunning);
  };

  const switchMode = (newMode: 'work' | 'break') => {
    setMode(newMode);
    resetTimer(newMode);
  };

  const handleSaveSession = async () => {
    setIsSaving(true);
    try {
      await apiClient.sessions.create({
        date: getToday(),
        subject: selectedSubject,
        topic: selectedTopic || 'General Study',
        durationMinutes: workDuration,
        questionsAttempted: 0,
        correct: 0,
        incorrect: 0,
        skipped: 0,
        confidence: 'medium',
        reflection: 'Focus session completed with Pomodoro timer',
      });
      setIsSaved(true);
      setShowLogPrompt(false);
      onSessionLogged?.();
    } catch (error) {
      console.error('Failed to log session:', error);
    } finally {
      setIsSaving(false);
    }
  };

  // Format MM:SS
  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const formattedTime = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  // SVG circular progress calculation
  const radius = 88;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = totalSeconds > 0
    ? circumference - (timeLeft / totalSeconds) * circumference
    : 0;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2">
          <span>Focus Timer</span>
          <span className="text-xs font-normal px-2 py-0.5 rounded-full bg-accent/20 text-accent">
            {completedSessionsCount} completed today
          </span>
        </div>
      }
      description="Pomodoro study sprints with focused intervals"
      maxWidth="md"
    >
      <div className="flex flex-col items-center">
        {/* Mode Switcher */}
        <div className="flex items-center bg-surface-elevated p-1 rounded-xl mb-6 border border-surface-border">
          <button
            type="button"
            onClick={() => switchMode('work')}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-medium transition-all ${
              mode === 'work'
                ? 'bg-accent text-white shadow-sm'
                : 'text-text-secondary hover:text-text'
            }`}
          >
            <Brain className="w-3.5 h-3.5" />
            Study Sprint ({workDuration}m)
          </button>
          <button
            type="button"
            onClick={() => switchMode('break')}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-medium transition-all ${
              mode === 'break'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-text-secondary hover:text-text'
            }`}
          >
            <Coffee className="w-3.5 h-3.5" />
            Rest Break ({breakDuration}m)
          </button>
        </div>

        {/* Circular Countdown Ring */}
        <div className="relative w-56 h-56 flex items-center justify-center my-2">
          <svg className="w-full h-full -rotate-90 transform" viewBox="0 0 200 200">
            {/* Background track */}
            <circle
              cx="100"
              cy="100"
              r={radius}
              className="text-surface-border stroke-current"
              strokeWidth="8"
              fill="transparent"
            />
            {/* Progress track */}
            <circle
              cx="100"
              cy="100"
              r={radius}
              className={`transition-all duration-300 stroke-current ${
                mode === 'work' ? 'text-accent' : 'text-emerald-500'
              }`}
              strokeWidth="8"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              fill="transparent"
            />
          </svg>

          {/* Center time display */}
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
            <span className="text-4xl sm:text-5xl font-mono font-bold tracking-tighter text-text">
              {formattedTime}
            </span>
            <span className="text-xs uppercase tracking-widest text-text-muted mt-1 font-semibold">
              {mode === 'work' ? 'Stay Focused' : 'Recharge'}
            </span>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-4 mt-6">
          <Button
            variant="secondary"
            size="md"
            onClick={() => resetTimer()}
            icon={<RotateCcw className="w-4 h-4" />}
            title="Reset Timer"
          >
            Reset
          </Button>

          <Button
            variant="primary"
            size="lg"
            onClick={toggleTimer}
            icon={
              isRunning ? (
                <Pause className="w-5 h-5" />
              ) : (
                <Play className="w-5 h-5 ml-0.5" />
              )
            }
            className="w-32"
          >
            {isRunning ? 'Pause' : timeLeft === 0 ? 'Restart' : 'Start'}
          </Button>

          <Button
            variant="ghost"
            size="md"
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={soundEnabled ? 'text-accent' : 'text-text-muted'}
            icon={<Bell className="w-4 h-4" />}
            title={soundEnabled ? 'Sound Enabled' : 'Sound Muted'}
          />
        </div>

        {/* Duration presets */}
        {!isRunning && timeLeft === totalSeconds && (
          <div className="flex items-center gap-2 mt-5 text-xs text-text-muted">
            <span>Sprint Duration:</span>
            {[15, 25, 45, 50].map((mins) => (
              <button
                key={mins}
                type="button"
                onClick={() => {
                  setWorkDuration(mins);
                  if (mode === 'work') setTimeLeft(mins * 60);
                }}
                className={`px-2 py-1 rounded border transition-colors ${
                  workDuration === mins && mode === 'work'
                    ? 'border-accent text-accent bg-accent/10'
                    : 'border-surface-border text-text-secondary hover:text-text'
                }`}
              >
                {mins}m
              </button>
            ))}
          </div>
        )}

        {/* Prompt to log completed study session */}
        {showLogPrompt && (
          <div className="w-full mt-6 p-4 rounded-xl bg-surface-elevated border border-accent/30 space-y-3 animate-fadeIn">
            <div className="flex items-center gap-2 text-sm font-semibold text-text">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Great focus! Log this {workDuration}-min sprint?</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <Select
                value={selectedSubject}
                onChange={(e) => {
                  setSelectedSubject(e.target.value);
                  const subObj = SUBJECTS.find((s) => s.name === e.target.value);
                  const tops = subObj ? TOPICS.filter((t) => t.subjectId === subObj.id) : [];
                  if (tops.length > 0) setSelectedTopic(tops[0].name);
                }}
              >
                {SUBJECTS.map((s) => (
                  <option key={s.id} value={s.name}>
                    {s.icon} {s.name}
                  </option>
                ))}
              </Select>
              <Select
                value={selectedTopic}
                onChange={(e) => setSelectedTopic(e.target.value)}
              >
                {availableTopics.map((t) => (
                  <option key={t.id} value={t.name}>
                    {t.name}
                  </option>
                ))}
              </Select>
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowLogPrompt(false)}
              >
                Skip
              </Button>
              <Button
                variant="primary"
                size="sm"
                loading={isSaving}
                onClick={handleSaveSession}
              >
                Save to Tracker
              </Button>
            </div>
          </div>
        )}

        {isSaved && (
          <p className="mt-4 text-xs font-medium text-emerald-400 flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5" /> Session recorded into today's tracker!
          </p>
        )}
      </div>
    </Modal>
  );
};
