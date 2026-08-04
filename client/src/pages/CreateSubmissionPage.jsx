import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { shadowApi } from '../api/shadowApi';
import { aiApi } from '../api/aiApi';
import Input from '../components/atoms/Input';
import TextArea from '../components/atoms/TextArea';
import Button from '../components/atoms/Button';
import Card from '../components/atoms/Card';
import Modal from '../components/molecules/Modal';
import MarkdownEditor from '../components/organisms/MarkdownEditor';

export default function CreateSubmissionPage() {
  const navigate = useNavigate();

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [languageTag, setLanguageTag] = useState('javascript');
  const [question, setQuestion] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  // AI Anonymity Check State
  const [runningCheck, setRunningCheck] = useState(false);
  const [anonymityWarnings, setAnonymityWarnings] = useState(null);
  const [showWarningModal, setShowWarningModal] = useState(false);

  const executeSubmission = async () => {
    setSubmitting(true);
    setShowWarningModal(false);
    try {
      await shadowApi.createSubmission({
        title: title.trim(),
        content: content.trim(),
        language_tag: languageTag.trim(),
        question: question.trim(),
      });
      toast.success('Code submitted for review!');
      navigate('/shadow/mine');
    } catch (err) {
      if (err.field) {
        setFieldErrors({ [err.field]: err.message });
      } else {
        setFieldErrors({ general: err.message || 'Failed to submit code for review.' });
      }
      toast.error(err.message || 'Failed to submit code for review.');
    } finally {
      setSubmitting(false);
    }
  };

  const handlePreSubmit = async (e) => {
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

    // Pre-submit AI Anonymity Scan
    setRunningCheck(true);
    try {
      const fullText = `${title}\n${question}\n${content}`;
      const checkRes = await aiApi.anonymityCheck(fullText);

      if (checkRes && checkRes.safe === false && checkRes.findings?.length > 0) {
        setAnonymityWarnings(checkRes.findings);
        setShowWarningModal(true);
      } else {
        await executeSubmission();
      }
    } catch (err) {
      // Fail-open fallback: execute submission if AI check fails
      await executeSubmission();
    } finally {
      setRunningCheck(false);
    }
  };

  const handleManualCheck = async () => {
    if (!content.trim()) return;
    setRunningCheck(true);
    try {
      const fullText = `${title}\n${question}\n${content}`;
      const checkRes = await aiApi.anonymityCheck(fullText);
      if (checkRes && checkRes.safe === false && checkRes.findings?.length > 0) {
        setAnonymityWarnings(checkRes.findings);
        setShowWarningModal(true);
      } else {
        toast.success('✓ Anonymity check passed! No personal identity leaks detected.');
      }
    } catch (err) {
      toast.error('Anonymity check service unavailable, proceed with standard submission.');
    } finally {
      setRunningCheck(false);
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

        <Button
          variant="secondary"
          size="sm"
          onClick={handleManualCheck}
          isLoading={runningCheck}
          disabled={!content.trim()}
          title="Run pre-submit AI scan for accidental personal data leaks"
        >
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

        <form onSubmit={handlePreSubmit} className="space-y-6">
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
            <Button type="submit" variant="primary" size="md" isLoading={submitting || runningCheck}>
              Submit Code Anonymously
            </Button>
          </div>
        </form>
      </Card>

      {/* AI Anonymity Warning Modal (Advisory, Non-blocking) */}
      <Modal
        isOpen={showWarningModal}
        onClose={() => setShowWarningModal(false)}
        title="⚠️ Potential Identity Leak Warning"
        size="md"
      >
        <div className="space-y-4 text-sm text-main">
          <p className="text-muted text-xs">
            Our AI Anonymity Guard detected potential personal or identifying data in your submission:
          </p>

          <div className="rounded-lg border border-warning/40 bg-warning/10 p-3 space-y-2 text-xs">
            {anonymityWarnings?.map((w, idx) => (
              <div key={idx} className="space-y-0.5 border-b border-warning/20 last:border-0 pb-1.5 last:pb-0">
                <div className="font-bold text-warning capitalize">{w.type || 'Potential Leak'}</div>
                <div className="font-mono text-main bg-surface px-2 py-0.5 rounded inline-block">
                  {w.value}
                </div>
                {w.suggestion && <div className="text-muted italic">{w.suggestion}</div>}
              </div>
            ))}
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-main">
            <Button variant="secondary" size="sm" onClick={() => setShowWarningModal(false)}>
              Edit Submission
            </Button>
            <Button variant="primary" size="sm" onClick={executeSubmission} isLoading={submitting}>
              Submit Anyway
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
