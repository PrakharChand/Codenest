import React, { useState } from 'react';
import Dropdown from './Dropdown';
import Modal from './Modal';
import OnboardingWalkthrough from '../organisms/OnboardingWalkthrough';

export default function HelpMenu() {
  const [isWalkthroughOpen, setIsWalkthroughOpen] = useState(false);
  const [isHelpGuideOpen, setIsHelpGuideOpen] = useState(false);

  const helpMenuItems = [
    {
      label: '🚀 Replay Dual-Identity Tour',
      onClick: () => setIsWalkthroughOpen(true),
    },
    {
      label: '📖 General Navigation Guide',
      onClick: () => setIsHelpGuideOpen(true),
    },
  ];

  return (
    <>
      <Dropdown
        trigger={
          <button
            type="button"
            className="flex items-center gap-1.5 text-xs font-medium text-muted hover:text-main px-2.5 py-1.5 rounded-md border border-main bg-[var(--bg-base)] hover:bg-surface transition-colors focus-visible:outline-none"
            aria-label="CodeNest Navigation Help Menu"
          >
            <span>❓ Help</span>
          </button>
        }
        items={helpMenuItems}
      />

      {/* Onboarding Walkthrough Overlay (Replay mode) */}
      <OnboardingWalkthrough
        isOpen={isWalkthroughOpen}
        onClose={() => setIsWalkthroughOpen(false)}
        isReplay={true}
      />

      {/* General Navigation Quick Reference Modal */}
      <Modal
        isOpen={isHelpGuideOpen}
        onClose={() => setIsHelpGuideOpen(false)}
        title="CodeNest Quick Navigation Reference"
        size="lg"
      >
        <div className="space-y-5 text-sm text-main">
          <div className="space-y-2 border-b border-main pb-3">
            <h4 className="font-bold text-primary flex items-center gap-1.5">
              <span>🌐</span> Nest Feed (Public World)
            </h4>
            <p className="text-xs text-muted leading-relaxed">
              Use Nest Feed to publish posts, connect with other developers, showcase your portfolio, and join public communities. Your public profile displays your real name, bio, and shared content.
            </p>
          </div>

          <div className="space-y-2 border-b border-main pb-3">
            <h4 className="font-bold text-primary flex items-center gap-1.5">
              <span>👤</span> Nest Shadow (Anonymous World)
            </h4>
            <p className="text-xs text-muted leading-relaxed">
              Use Nest Shadow to submit code snippets for bias-free review and to review code written by others. Your identity is protected by a permanent anonymous handle (like <code className="font-mono text-primary font-bold">silent_fox42</code>).
            </p>
          </div>

          <div className="space-y-2 border-b border-main pb-3">
            <h4 className="font-bold text-primary flex items-center gap-1.5">
              <span>⚡</span> Switching Between Modes
            </h4>
            <p className="text-xs text-muted leading-relaxed">
              Click the <strong>Nest Feed / Nest Shadow</strong> tab in the top navbar at any time. The entire visual theme automatically shifts between light and dark to indicate your active mode.
            </p>
          </div>

          <div className="space-y-2">
            <h4 className="font-bold text-primary flex items-center gap-1.5">
              <span>🔔</span> Notifications & Connections
            </h4>
            <p className="text-xs text-muted leading-relaxed">
              Public notifications (likes, comments, connections) are stored separately from Shadow review notifications (`context=shadow`) to guarantee zero identity leaks between worlds.
            </p>
          </div>
        </div>
      </Modal>
    </>
  );
}
