import React, { useState } from 'react';
import Modal from '../molecules/Modal';
import Button from '../atoms/Button';
import Badge from '../atoms/Badge';
import { authApi } from '../../api/authApi';
import { useAuth } from '../../context/AuthContext';

const WALKTHROUGH_STEPS = [
  {
    title: 'Welcome to CodeNest',
    badge: 'One Account, Two Worlds',
    icon: '🚀',
    content: (
      <div className="space-y-3">
        <p className="text-sm text-muted leading-relaxed">
          CodeNest is built on a unique principle: developers need both a public identity to showcase their work and an anonymous identity for honest, un-biased code feedback.
        </p>
        <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 text-xs text-main">
          💡 You use a single login, but move seamlessly between two completely separate spaces.
        </div>
      </div>
    ),
  },
  {
    title: 'Nest Feed — Your Public Identity',
    badge: 'Public Mode (🌐)',
    icon: '🌐',
    content: (
      <div className="space-y-3">
        <p className="text-sm text-muted leading-relaxed">
          Nest Feed is your public developer hub. Use your real name, showcase your projects, write articles, follow other developers, and join public communities.
        </p>
        <ul className="text-xs text-muted space-y-1.5 list-disc list-inside">
          <li>Share technical blogs and project launches</li>
          <li>Build your professional reputation</li>
          <li>Connect with developers and join communities</li>
        </ul>
      </div>
    ),
  },
  {
    title: 'Nest Shadow — Your Anonymous Self',
    badge: 'Anonymous Mode (👤)',
    icon: '👤',
    content: (
      <div className="space-y-3">
        <p className="text-sm text-muted leading-relaxed">
          Nest Shadow is a zero-bias code review sanctuary. Here, you get a permanent anonymous handle (like <code className="font-mono text-primary font-bold">silent_fox42</code>) to submit code and review others.
        </p>
        <ul className="text-xs text-muted space-y-1.5 list-disc list-inside">
          <li>Get honest code reviews without clout or popularity bias</li>
          <li>Submit code snippets with specific feedback questions</li>
          <li>Build an anonymous reputation score through helpful reviews</li>
        </ul>
      </div>
    ),
  },
  {
    title: 'The Mode-Switch Transition',
    badge: 'Navbar Toggle',
    icon: '⚡',
    content: (
      <div className="space-y-3">
        <p className="text-sm text-muted leading-relaxed">
          Switch between Nest Feed and Nest Shadow anytime using the toggle in the top navbar.
        </p>
        <div className="rounded-lg border border-main bg-surface-subtle p-3 text-xs text-main space-y-1">
          <div className="font-bold text-primary">Unmissable Visual Signals:</div>
          <p className="text-muted">
            The entire color theme shifts between warm light (Feed) and deep dark (Shadow), so you're always 100% certain which identity you are posting under.
          </p>
        </div>
      </div>
    ),
  },
];

export default function OnboardingWalkthrough({ isOpen, onClose, isReplay = false }) {
  const { setUser } = useAuth();
  const [currentStep, setCurrentStep] = useState(0);
  const [completing, setCompleting] = useState(false);

  const handleFinishOrSkip = async () => {
    setCompleting(true);
    try {
      if (!isReplay) {
        const res = await authApi.completeOnboarding();
        setUser((prev) =>
          prev ? { ...prev, onboarding_completed_at: res.onboarding_completed_at } : null
        );
      }
    } catch (err) {
      // Ignore errors cleanly
    } finally {
      setCompleting(false);
      onClose();
    }
  };

  const handleNext = () => {
    if (currentStep < WALKTHROUGH_STEPS.length - 1) {
      setCurrentStep((prev) => prev + 1);
    } else {
      handleFinishOrSkip();
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  const step = WALKTHROUGH_STEPS[currentStep];

  return (
    <Modal isOpen={isOpen} onClose={handleFinishOrSkip} title={step.title} size="md">
      <div className="space-y-6">
        {/* Step Header Badge & Icon */}
        <div className="flex items-center justify-between border-b border-main pb-3">
          <Badge variant="primary" size="sm">
            {step.badge}
          </Badge>
          <span className="text-xs text-subtle font-medium">
            Step {currentStep + 1} of {WALKTHROUGH_STEPS.length}
          </span>
        </div>

        {/* Step Body */}
        <div className="py-2">{step.content}</div>

        {/* Stepper Dots & Controls */}
        <div className="flex items-center justify-between border-t border-main pt-4">
          <div className="flex items-center gap-1.5">
            {WALKTHROUGH_STEPS.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentStep(idx)}
                aria-label={`Go to onboarding step ${idx + 1}`}
                className={`h-2 rounded-full transition-all ${
                  idx === currentStep ? 'w-6 bg-primary' : 'w-2 bg-main/20 hover:bg-main/40'
                }`}
              />
            ))}
          </div>

          <div className="flex items-center gap-2">
            {currentStep > 0 && (
              <Button variant="ghost" size="sm" onClick={handleBack}>
                Back
              </Button>
            )}
            <Button variant="secondary" size="sm" onClick={handleFinishOrSkip}>
              Skip
            </Button>
            <Button variant="primary" size="sm" onClick={handleNext} isLoading={completing}>
              {currentStep === WALKTHROUGH_STEPS.length - 1 ? 'Get Started' : 'Next →'}
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
