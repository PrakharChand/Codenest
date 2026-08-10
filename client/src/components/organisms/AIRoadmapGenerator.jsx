import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { aiApi } from '../../api/aiApi';
import { postsApi } from '../../api/postsApi';
import Card from '../atoms/Card';
import Button from '../atoms/Button';
import Input from '../atoms/Input';
import TextArea from '../atoms/TextArea';
import Badge from '../atoms/Badge';

export default function AIRoadmapGenerator() {
  const [currentFocus, setCurrentFocus] = useState('');
  const [techStack, setTechStack] = useState('');
  const [goal, setGoal] = useState('');
  const [fromRoadmapToggle, setFromRoadmapToggle] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [roadmap, setRoadmap] = useState(null);
  const [error, setError] = useState(null);
  const [sharing, setSharing] = useState(false);
  const [shareSuccess, setShareSuccess] = useState(false);

  const handleGenerate = async (e) => {
    e.preventDefault();
    if (!goal.trim()) {
      toast.error('Please enter your learning goal.');
      return;
    }

    setGenerating(true);
    setError(null);
    setShareSuccess(false);
    try {
      const res = await aiApi.generateRoadmap({
        level: currentFocus || 'Intermediate',
        knownTech: techStack || 'JavaScript, React',
        goal: goal.trim(),
        hoursPerWeek: 10,
      });

      const generatedData = res.roadmap || res;
      setRoadmap(generatedData);
      toast.success('Learning roadmap generated!');
    } catch (err) {
      const errMsg = err.message || 'Could not generate roadmap. Please try again.';
      setError(errMsg);
      toast.error(errMsg);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <Card className="p-6 space-y-5 border border-[var(--border-main)] bg-[var(--bg-surface)] relative overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[var(--color-primary)]/15 border border-[var(--color-primary)]/30 flex items-center justify-center text-lg">
            🗺️
          </div>
          <div>
            <h3 className="font-bold text-white text-base leading-tight">Personalized AI Learning Roadmap</h3>
            <p className="text-xs text-[var(--text-muted)]">Get a tailored roadmap to level up your coding skills. Start your journey with AI.</p>
          </div>
        </div>
        <span className="px-2.5 py-1 text-[10px] font-extrabold tracking-wider uppercase rounded-full bg-[var(--color-primary)]/20 text-[var(--color-primary)] border border-[var(--color-primary)]/40">
          AI Powered
        </span>
      </div>

      {error && (
        <div className="rounded-lg border border-danger/30 bg-danger/10 p-3 text-xs text-danger font-medium">
          {error}
        </div>
      )}

      {shareSuccess && (
        <div className="rounded-lg border border-success/30 bg-success/10 p-3 text-xs text-success font-medium">
          ✓ Roadmap shared successfully to Nest Feed!
        </div>
      )}

      {!roadmap ? (
        <form onSubmit={handleGenerate} className="space-y-4">
          {/* Two Optional Input Fields Side by Side */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-white">Current Focus (optional)</label>
              <input
                type="text"
                value={currentFocus}
                onChange={(e) => setCurrentFocus(e.target.value)}
                placeholder="e.g. Data Structures"
                className="w-full h-9 rounded-lg border border-[var(--border-main)] bg-[var(--bg-base)] px-3 text-xs text-white placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--color-primary)] transition-all font-medium"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-white">Current Tech Stack (optional)</label>
              <input
                type="text"
                value={techStack}
                onChange={(e) => setTechStack(e.target.value)}
                placeholder="e.g. JavaScript, React"
                className="w-full h-9 rounded-lg border border-[var(--border-main)] bg-[var(--bg-base)] px-3 text-xs text-white placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--color-primary)] transition-all font-medium"
              />
            </div>
          </div>

          {/* Full-width Learning Goal Field */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-white">
              Learning Goal (next 2–3 months) <span className="text-[var(--color-primary)]">*required*</span>
            </label>
            <input
              type="text"
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              placeholder="e.g. Build a full-stack web app using a modern JS stack"
              className="w-full h-10 rounded-lg border border-[var(--border-main)] bg-[var(--bg-base)] px-3.5 text-xs text-white placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--color-primary)] transition-all font-medium"
              required
            />
          </div>

          {/* Tip & Toggle & Generate CTA */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
            <p className="text-[11px] text-[var(--text-muted)]">
              💡 <strong>Tip:</strong> Be specific about your goals to get the best roadmap!
            </p>

            <div className="flex items-center gap-4 self-end sm:self-auto">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-white">From Your Roadmap:</span>
                <button
                  type="button"
                  onClick={() => setFromRoadmapToggle((v) => !v)}
                  className={`w-9 h-5 rounded-full p-0.5 transition-colors ${
                    fromRoadmapToggle ? 'bg-[var(--color-primary)]' : 'bg-slate-700'
                  }`}
                >
                  <div
                    className={`w-4 h-4 rounded-full bg-black transform transition-transform ${
                      fromRoadmapToggle ? 'translate-x-4' : 'translate-x-0'
                    }`}
                  />
                </button>
                <span className="text-xs text-[var(--text-muted)] font-medium">
                  {fromRoadmapToggle ? 'On' : 'Off'}
                </span>
              </div>

              <Button
                type="submit"
                variant="primary"
                size="sm"
                isLoading={generating}
                className="px-4 py-2 font-bold shadow-md hover:scale-[1.02] transition-all bg-[var(--color-primary)] text-black"
              >
                Generate Roadmap →
              </Button>
            </div>
          </div>

          {/* Decorative Sunset/Mountain Horizon Banner */}
          <div className="mt-4 h-16 w-full rounded-xl bg-gradient-to-r from-purple-950 via-red-950 to-amber-950 border border-amber-500/20 relative overflow-hidden flex items-center justify-between px-4">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-amber-500/20 via-purple-900/30 to-transparent pointer-events-none" />
            <div className="relative z-10 flex items-center gap-2">
              <span className="text-xs font-bold text-amber-200">🌄 CodeNest Horizon</span>
              <span className="text-[10px] text-amber-300/70">Level up your engineering potential</span>
            </div>
            <div className="relative z-10 text-xs font-mono text-amber-400 font-bold">
              AI_CODENEST_v2
            </div>
          </div>
        </form>
      ) : (
        <div className="space-y-4">
          <div className="space-y-1 bg-surface-subtle p-4 rounded-xl border border-main">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-main text-sm">Target Growth Summary</h4>
              <Badge variant="primary" size="sm">{roadmap.total_weeks || 12} Weeks Plan</Badge>
            </div>
            <p className="text-xs text-muted leading-relaxed pt-1">{roadmap.summary}</p>
          </div>

          {/* Interactive Phase Checklist */}
          <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
            {phasesList.map((phase, idx) => (
              <div key={idx} className="rounded-xl border border-main bg-surface p-3.5 space-y-2.5 text-xs">
                <div className="font-bold text-primary flex items-center justify-between">
                  <span>Phase {idx + 1}: {phase.title || `Learning Module ${idx + 1}`}</span>
                  <span className="text-[11px] font-normal text-muted">{phase.duration_weeks || 2} weeks</span>
                </div>

                {phase.topics?.length > 0 && (
                  <div className="space-y-1">
                    <span className="text-[11px] font-semibold text-main block">Key Topics:</span>
                    <div className="flex flex-wrap gap-1.5">
                      {phase.topics.map((topic, tIdx) => (
                        <span key={tIdx} className="px-2 py-0.5 rounded bg-primary/10 text-primary font-mono text-[11px]">
                          {topic}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {phase.milestone && (
                  <div className="text-muted text-[11px] pt-1 border-t border-main/50 flex items-start gap-1">
                    <span className="font-semibold text-main">🎯 Milestone:</span>
                    <span>{phase.milestone}</span>
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-main">
            <Button variant="ghost" size="sm" onClick={() => setRoadmap(null)}>
              🔄 Generate New
            </Button>
            <Button variant="primary" size="sm" onClick={handleShareToFeed} isLoading={sharing}>
              📢 Share to Nest Feed
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}
