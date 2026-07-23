import React, { useState } from 'react';
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
    if (!isFormValid) return;

    setGenerating(true);
    setError(null);
    setShareSuccess(false);
    try {
      const res = await aiApi.generateRoadmap({
        level,
        known_tech: knownTech.split(',').map((t) => t.trim()).filter(Boolean),
        goal: goal.trim(),
        hours_per_week: Number(hoursPerWeek),
      });
      setRoadmap(res.roadmap || res);
    } catch (err) {
      setError(err.message || 'Could not generate roadmap. Please try again.');
    } finally {
      setGenerating(false);
    }
  };

  const handleShareToFeed = async () => {
    if (!roadmap) return;
    setSharing(true);
    try {
      const content = `🚀 **My AI Learning Roadmap: ${roadmap.title || 'Developer Growth Plan'}**\n\n${roadmap.summary || ''}\n\n` +
        (roadmap.weeks || [])
          .map((w) => `**Week ${w.week}: ${w.topic}**\n- ${w.tasks?.join('\n- ')}`)
          .join('\n\n');

      await postsApi.create({
        title: `Learning Roadmap: ${roadmap.title || 'Growth Plan'}`,
        content,
        visibility: 'public',
        tags: ['learning', 'roadmap', 'growth'],
      });
      setShareSuccess(true);
    } catch (err) {
      alert(err.message || 'Failed to share roadmap to feed.');
    } finally {
      setSharing(false);
    }
  };

  return (
    <Card className="p-6 space-y-5">
      <div className="flex items-center justify-between border-b border-main pb-3">
        <div className="flex items-center gap-2">
          <span className="text-xl">🗺️</span>
          <div>
            <h3 className="font-bold text-main">Personalized AI Learning Roadmap</h3>
            <p className="text-xs text-muted">Generate a custom week-by-week study plan</p>
          </div>
        </div>
        <Badge variant="primary" size="sm">AI Powered</Badge>
      </div>

      {error && (
        <div className="rounded-md border border-danger/30 bg-danger/10 p-3 text-xs text-danger font-medium">
          {error}
        </div>
      )}

      {shareSuccess && (
        <div className="rounded-md border border-success/30 bg-success/10 p-3 text-xs text-success font-medium">
          ✓ Roadmap shared successfully to Nest Feed!
        </div>
      )}

      {!roadmap ? (
        <form onSubmit={handleGenerate} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-main">Current Experience Level</label>
              <select
                value={level}
                onChange={(e) => setLevel(e.target.value)}
                className="w-full rounded-md border border-main bg-surface px-3 py-2 text-xs text-main focus-visible:border-focus focus-visible:outline-none"
              >
                <option value="Beginner">Beginner</option>
                <option value="Intermediate">Intermediate</option>
                <option value="Advanced">Advanced</option>
              </select>
            </div>

            <Input
              label="Known Technologies (comma separated)"
              value={knownTech}
              onChange={(e) => setKnownTech(e.target.value)}
              placeholder="e.g. JavaScript, React, Node"
              required
            />
          </div>

          <TextArea
            label="Learning Goal (min 20 characters) *"
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            placeholder="e.g. Master distributed systems engineering and building microservices in Rust..."
            rows={2}
            required
          />

          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-main">Hours / Week Available</label>
              <input
                type="number"
                min="1"
                max="40"
                value={hoursPerWeek}
                onChange={(e) => setHoursPerWeek(e.target.value)}
                className="w-24 rounded-md border border-main bg-surface px-3 py-1.5 text-xs text-main"
              />
            </div>

            <Button
              type="submit"
              variant="primary"
              size="sm"
              isLoading={generating}
              disabled={!isFormValid}
            >
              Generate Roadmap ✨
            </Button>
          </div>
        </form>
      ) : (
        <div className="space-y-4">
          <div className="space-y-1">
            <h4 className="font-bold text-main">{roadmap.title}</h4>
            <p className="text-xs text-muted leading-relaxed">{roadmap.summary}</p>
          </div>

          {/* Interactive Week Checklist */}
          <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
            {roadmap.weeks?.map((w, idx) => (
              <div key={idx} className="rounded-lg border border-main bg-surface-subtle p-3 space-y-2 text-xs">
                <div className="font-bold text-primary flex items-center justify-between">
                  <span>Week {w.week}: {w.topic}</span>
                </div>
                <ul className="space-y-1 text-muted">
                  {w.tasks?.map((t, tIdx) => (
                    <li key={tIdx} className="flex items-start gap-2">
                      <input type="checkbox" className="mt-0.5 rounded border-main text-primary" />
                      <span>{t}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-main">
            <Button variant="ghost" size="sm" onClick={() => setRoadmap(null)}>
              🔄 Regenerate
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
