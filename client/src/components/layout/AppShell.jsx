import React from 'react';
import Navbar from './Navbar';

export default function AppShell({ children, className = '' }) {
  return (
    <div className="min-h-screen bg-base text-main transition-colors duration-200">
      <Navbar />
      <main className={`mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 ${className}`}>
        {children}
      </main>
    </div>
  );
}
