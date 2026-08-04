import React from 'react';
import { Link } from 'react-router-dom';

/**
 * Footer — Standard footer rendered on public pages & landing page
 */
export default function Footer() {
  return (
    <footer className="mt-16 border-t border-[var(--border-main)]/60 pt-8 pb-12 text-xs text-[var(--text-muted)]">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-gradient-to-tr from-[var(--color-primary)] to-purple-500 flex items-center justify-center text-white font-extrabold text-[10px]">
            CN
          </div>
          <span className="font-bold text-[var(--text-main)]">CodeNest</span>
          <span>© {new Date().getFullYear()} CodeNest Inc. All rights reserved.</span>
        </div>

        <div className="flex items-center gap-6 font-medium">
          <Link to="/explore" className="hover:text-[var(--text-main)] transition-colors">Explore</Link>
          <Link to="/shadow/queue" className="hover:text-[var(--text-main)] transition-colors">Shadow Queue</Link>
          <Link to="/communities" className="hover:text-[var(--text-main)] transition-colors">Communities</Link>
          <a href="https://github.com/PrakharChand/Codenest" target="_blank" rel="noreferrer" className="hover:text-[var(--text-main)] transition-colors">GitHub</a>
        </div>
      </div>
    </footer>
  );
}
