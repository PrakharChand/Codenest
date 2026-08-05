import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { aiAssistantApi } from '../api/aiAssistantApi';
import Card from '../components/atoms/Card';
import Button from '../components/atoms/Button';
import Spinner from '../components/atoms/Spinner';

export default function AISettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [model, setModel] = useState('gemini-flash-latest');
  const [temperature, setTemperature] = useState(0.30);
  const [maxTokens, setMaxTokens] = useState(2048);
  const [contextSize, setContextSize] = useState(4);

  useEffect(() => {
    const fetchSettings = async () => {
      setLoading(true);
      try {
        const data = await aiAssistantApi.getSettings();
        if (data.settings) {
          setModel(data.settings.model || 'gemini-flash-latest');
          setTemperature(Number(data.settings.temperature) || 0.30);
          setMaxTokens(Number(data.settings.max_tokens) || 2048);
          setContextSize(Number(data.settings.context_size) || 4);
        }
      } catch (err) {
        toast.error('Could not load AI settings.');
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await aiAssistantApi.updateSettings({
        model,
        temperature,
        max_tokens: maxTokens,
        context_size: contextSize,
      });
      toast.success('AI settings saved successfully!');
    } catch (err) {
      toast.error('Failed to update AI settings.');
    } finally {
      setSaving(false);
    }
  };

  const handleExportChat = async (mode) => {
    try {
      const data = await aiAssistantApi.getConversations(mode);
      const jsonStr = JSON.stringify(data, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `codenest_${mode}_chat_export.json`;
      a.click();
      toast.success(`Exported ${mode} chat history!`);
    } catch (err) {
      toast.error('Could not export chat history.');
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="space-y-1 border-b border-[var(--border-main)] pb-4">
        <h1 className="text-2xl font-bold text-[var(--text-main)] flex items-center gap-2">
          <span>⚙️ AI Assistant Settings</span>
        </h1>
        <p className="text-xs text-[var(--text-muted)]">
          Configure model parameters, RAG context window size, and chat history exports for CodeNest Guide and Shadow Mentor.
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Model Selection */}
        <Card className="p-6 space-y-4">
          <h3 className="text-sm font-bold text-[var(--text-main)] uppercase tracking-wider text-xs">
            Model Configuration
          </h3>

          <div className="space-y-2">
            <label className="block text-xs font-semibold text-[var(--text-main)]">
              AI Model Engine
            </label>
            <select
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className="w-full rounded-xl border border-[var(--border-main)] bg-[var(--bg-surface)] px-3.5 py-2 text-xs text-[var(--text-main)] focus:outline-none focus:border-[var(--color-primary)]"
            >
              <option value="gemini-flash-latest">Gemini Flash (Latest) — Fast & High Quality</option>
              <option value="gemini-2.0-flash">Gemini 2.0 Flash — Ultra Low Latency</option>
            </select>
          </div>

          {/* Temperature Slider */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <label className="font-semibold text-[var(--text-main)]">
                Temperature (Creativity): <span className="text-[var(--color-primary)]">{temperature}</span>
              </label>
              <span className="text-[var(--text-subtle)]">0.0 (Precise) to 1.0 (Creative)</span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={temperature}
              onChange={(e) => setTemperature(parseFloat(e.target.value))}
              className="w-full accent-[var(--color-primary)]"
            />
          </div>

          {/* Max Tokens */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-[var(--text-main)]">
                Max Output Tokens
              </label>
              <input
                type="number"
                min="256"
                max="4096"
                step="128"
                value={maxTokens}
                onChange={(e) => setMaxTokens(parseInt(e.target.value, 10))}
                className="w-full rounded-xl border border-[var(--border-main)] bg-[var(--bg-surface)] px-3 py-2 text-xs text-[var(--text-main)] focus:outline-none focus:border-[var(--color-primary)]"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-[var(--text-main)]">
                RAG Vector Context Chunks
              </label>
              <input
                type="number"
                min="1"
                max="10"
                value={contextSize}
                onChange={(e) => setContextSize(parseInt(e.target.value, 10))}
                className="w-full rounded-xl border border-[var(--border-main)] bg-[var(--bg-surface)] px-3 py-2 text-xs text-[var(--text-main)] focus:outline-none focus:border-[var(--color-primary)]"
              />
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <Button type="submit" variant="primary" size="md" isLoading={saving}>
              Save AI Settings
            </Button>
          </div>
        </Card>
      </form>

      {/* Chat Exports & Data Management */}
      <Card className="p-6 space-y-4">
        <h3 className="text-sm font-bold text-[var(--text-main)] uppercase tracking-wider text-xs">
          Export & Backup Data
        </h3>
        <p className="text-xs text-[var(--text-muted)]">
          Export your saved chat conversations as JSON backups for CodeNest Guide and Shadow Mentor.
        </p>

        <div className="flex flex-wrap gap-3 pt-2">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => handleExportChat('feed')}
          >
            📥 Export Guide Chats (.json)
          </Button>

          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => handleExportChat('shadow')}
          >
            📥 Export Shadow Mentor Chats (.json)
          </Button>
        </div>
      </Card>
    </div>
  );
}
