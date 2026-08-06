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
  const [level, setLevel] = useState('Intermediate');
  const [knownTech, setKnownTech] = useState('JavaScript, React');
  const [goal, setGoal] = useState('');
  const [hoursPerWeek, setHoursPerWeek] = useState(10);
  const [generating, setGenerating] = useState(false);
  const [roadmap, setRoadmap] = useState(null);
  const [error, setError] = useState(null);
  const [sharing, setSharing] = useState(false);
  const [shareSuccess, setShareSuccess] = useState(false);

  const isFormValid = goal.trim().length >= 20 && knownTech.trim().length > 0;

  const handleGenerate = async (e) => {
    e.preventDefault();
    if (!isFormValid) {
      toast.error('Please enter at least 20 characters in your learning goal.');
      return;
    }

    setGenerating(true);
    setError(null);
    setShareSuccess(false);
    try {
      const res = await aiApi.generateRoadmap({
        level,
        knownTech: knownTech.trim(),
        goal: goal.trim(),
        hoursPerWeek: Number(hoursPerWeek),
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

  const handleShareToFeed = async () => {
    if (!roadmap) return;
    setSharing(true);
    try {
      const phasesText = (roadmap.phases || roadmap.weeks || [])
        .map(
          (p, idx) =>
            `**${p.title || `Phase ${idx + 1}`} (${p.duration_weeks || 2} weeks)**\n` +
            `- **Topics:** ${(p.topics || []).join(', ')}\n` +
            (p.milestone ? `- **Milestone:** ${p.milestone}` : '')
        )
        .join('\n\n');

      const content = `🚀 **AI Learning Roadmap: ${roadmap.summary || 'Developer Growth Plan'}**\n\n` +
        `**Total Duration:** ${roadmap.total_weeks || 12} weeks\n\n` +
        `${phasesText}`;

      await postsApi.create({
        title: `Learning Roadmap: ${roadmap.summary?.slice(0, 60) || 'Developer Growth Plan'}`,
        content,
        visibility: 'public',
        tags: ['learning', 'roadmap', 'growth'],
      });
      setShareSuccess(true);
      toast.success('Roadmap shared to feed!');
    } catch (err) {
      toast.error(err.message || 'Failed to share roadmap to feed.');
    } finally {
      setSharing(false);
    }
  };

  const phasesList = roadmap?.phases || roadmap?.weeks || [];

  return (
    <Card className="p-6 md:p-7 space-y-6">
      <div className="flex items-center justify-between border-b border-main pb-3.5">
        <div className="flex items-center gap-3">
          <span className="text-2xl">🗺️</span>
          <div>
            <h3 className="font-bold text-main text-base">Personalized AI Learning Roadmap</h3>
            <p className="text-xs text-muted">Generate a custom study plan based on your tech stack and goals</p>
          </div>
        </div>
        <Badge variant="primary" size="sm">AI Powered</Badge>
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
        <form onSubmit={handleGenerate} className="space-y-5">
          {/* Top Row: Experience Level & Known Tech — Spaced & Height-matched */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-main">Current Experience Level</label>
              <select
                value={level}
                onChange={(e) => setLevel(e.target.value)}
                className="w-full h-10 rounded-lg border border-main bg-surface px-3.5 text-xs text-main focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all font-medium"
              >
                <option value="Beginner">Beginner</option>
                <option value="Intermediate">Intermediate</option>
                <option value="Advanced">Advanced</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-main">Known Technologies (comma separated) *</label>
              <input
                type="text"
                value={knownTech}
                onChange={(e) => setKnownTech(e.target.value)}
                placeholder="e.g. JavaScript, React, Node"
                className="w-full h-10 rounded-lg border border-main bg-surface px-3.5 text-xs text-main focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all font-medium"
                required
              />
            </div>
          </div>

          {/* Learning Goal Section */}
          <div className="space-y-1.5 pt-1">
            <TextArea
              label="Learning Goal (min 20 characters) *"
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              placeholder="e.g. Master distributed systems engineering and building microservices in Rust..."
              rows={3}
              required
            />
            <p className="text-[11px] text-muted italic">
              💡 <strong>Note:</strong> AI Roadmap requires at least <strong>20 characters</strong> in your learning goal.
            </p>
          </div>

          {/* Bottom Bar: Hours Available & Action Button */}
          <div className="flex items-center justify-between pt-2 border-t border-main">
            <div className="flex items-center gap-3">
              <label className="text-xs font-semibold text-main shrink-0">Hours / Week Available:</label>
              <input
                type="number"
                min="1"
                max="40"
                value={hoursPerWeek}
                onChange={(e) => setHoursPerWeek(e.target.value)}
                className="w-20 h-9 rounded-lg border border-main bg-surface px-3 text-xs text-main text-center font-bold focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>

            <Button
              type="submit"
              variant="primary"
              size="sm"
              isLoading={generating}
              className="px-5 py-2 font-bold shadow-md hover:shadow-lg transition-all"
            >
              Generate Roadmap ✨
            </Button>
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
