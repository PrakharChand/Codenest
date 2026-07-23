import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { shadowApi } from '../api/shadowApi';
import Input from '../components/atoms/Input';
import TextArea from '../components/atoms/TextArea';
import Button from '../components/atoms/Button';
import Card from '../components/atoms/Card';
import MarkdownEditor from '../components/organisms/MarkdownEditor';

export default function CreateSubmissionPage() {
  const navigate = useNavigate();

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [languageTag, setLanguageTag] = useState('javascript');
  const [question, setQuestion] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFieldErrors({});

    const errors = {};
    if (!title.trim()) errors.title = 'Title is required.';
    if (!content.trim()) errors.content = 'Code content cannot be empty.';
    if (!languageTag.trim()) errors.language_tag = 'Language tag is required.';
    if (!question.trim()) errors.question = 'Specific question is required.';

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setSubmitting(true);
    try {
      await shadowApi.createSubmission({
        title: title.trim(),
        content: content.trim(),
        language_tag: languageTag.trim(),
        question: question.trim(),
      });
      navigate('/shadow/mine');
    } catch (err) {
      if (err.field) {
        setFieldErrors({ [err.field]: err.message });
      } else {
        setFieldErrors({ general: err.message || 'Failed to submit code for review.' });
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-main font-mono">Submit Code for Review</h1>
          <p className="text-sm text-muted">
            Request an anonymous, bias-free code review from fellow developers.
          </p>
        </div>

        {/* Phase 12 AI Anonymity Scan Affordance Slot */}
        <Button variant="ghost" size="sm" disabled title="AI Anonymity Check (Phase 12 feature)">
          🛡️ Run Anonymity Check (AI)
        </Button>
      </div>

      <Card className="p-6 md:p-8 space-y-6">
        {/* Anonymity Security Notice */}
        <div className="rounded-lg border border-primary/30 bg-primary/5 p-4 text-xs text-main space-y-1">
          <div className="font-bold text-primary flex items-center gap-1.5">
            🔒 Identity Security Notice
          </div>
          <p className="text-muted">
            Make sure your code content does not include identifying information like your real name, company credentials, API keys, or personal paths.
          </p>
        </div>

        {fieldErrors.general && (
          <div className="rounded-md border border-danger/30 bg-danger/10 p-3 text-xs text-danger font-medium">
            {fieldErrors.general}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <Input
            label="Submission Title *"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            error={fieldErrors.title}
            placeholder="e.g. Async queue implementation in Rust"
            required
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Language / Tech Tag *"
              value={languageTag}
              onChange={(e) => setLanguageTag(e.target.value)}
              error={fieldErrors.language_tag}
              placeholder="javascript, python, rust, go"
              required
            />
          </div>

          <TextArea
            label="Specific Feedback Question *"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            error={fieldErrors.question}
            placeholder="What specific aspects do you want feedback on? (e.g., error handling, memory allocation, clean architecture)"
            rows={3}
            required
          />

          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-main">
              Code Snippet / Implementation (Markdown supported) *
            </label>
            <MarkdownEditor
              value={content}
              onChange={setContent}
              placeholder="Paste your code snippet or project logic here..."
              height={350}
            />
            {fieldErrors.content && (
              <p className="text-xs text-danger font-medium">{fieldErrors.content}</p>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-main">
            <Button variant="secondary" size="md" onClick={() => navigate('/shadow/queue')}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="md" isLoading={submitting}>
              Submit Code Anonymously
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
