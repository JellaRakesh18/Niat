'use client';

import React, { useState } from 'react';
import LoginPage from './LoginPage';

export default function AuthModal({ isOpen, onClose, onLoginSuccess }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-100">
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 z-30 w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center text-sm font-bold transition cursor-pointer"
          aria-label="Close Modal"
        >
          ✕
        </button>

        {/* Embedded Login Page Form */}
        <div className="p-2 sm:p-4">
          <LoginPage onLoginSuccess={onLoginSuccess} />
        </div>
      </div>
    </div>
  );
}
