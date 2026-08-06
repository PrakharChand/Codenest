import React from 'react';
import Modal from './Modal';
import Button from '../atoms/Button';
import Badge from '../atoms/Badge';

export default function ViolationWarningModal({ isOpen, onClose, violationData }) {
  if (!violationData) return null;

  const { reason, violationCount, action } = violationData;

  const getActionTitle = () => {
    switch (action) {
      case 'suspend':
        return '⛔ Account Suspended for 24 Hours';
      case 'ban':
        return '🚫 Account Permanently Banned';
      case 'email_warn':
        return '⚠️ Warning Email Dispatched (Violation #3)';
      default:
        return '⚠️ Content Moderation Warning';
    }
  };

  const getBadgeVariant = () => {
    if (action === 'ban' || action === 'suspend') return 'danger';
    if (action === 'email_warn') return 'warning';
    return 'primary';
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={getActionTitle()}>
      <div className="space-y-5 py-2">
        <div className="flex items-center justify-between gap-2 p-3 rounded-xl bg-danger/10 border border-danger/20">
          <span className="text-xs font-bold text-danger">Safety Violation Triggered</span>
          <Badge variant={getBadgeVariant()} size="sm">
            Strike {violationCount || 1} of 5
          </Badge>
        </div>

        <div className="space-y-2">
          <h4 className="text-xs font-bold uppercase tracking-wider text-subtle">Reason for Removal:</h4>
          <p className="text-sm font-semibold text-main leading-relaxed bg-surface-subtle p-3 rounded-xl border border-main">
            {reason || 'Inappropriate content violating community safety policies.'}
          </p>
        </div>

        <div className="space-y-2 text-xs text-muted leading-relaxed border-t border-main pt-3">
          <p className="font-bold text-main">Consequences Schedule:</p>
          <ul className="list-disc pl-4 space-y-1 text-subtle">
            <li><strong>Strike 1 & 2:</strong> Immediate removal + Warning alert.</li>
            <li><strong>Strike 3:</strong> Formal Warning Email dispatched to your registered address.</li>
            <li><strong>Strike 4:</strong> Automatic <strong>24-Hour Account Suspension</strong> from all actions.</li>
            <li><strong>Strike 5:</strong> <strong>Permanent Ban</strong> across Email, GitHub, and Google logins.</li>
          </ul>
        </div>

        <div className="pt-2">
          <Button variant="primary" size="md" className="w-full font-bold" onClick={onClose}>
            I Understand & Agree to Guidelines
          </Button>
        </div>
      </div>
    </Modal>
  );
}
