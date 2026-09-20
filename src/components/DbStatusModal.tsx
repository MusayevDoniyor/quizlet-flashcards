'use client';

import React from 'react';
import { Cloud, CheckCircle2, ShieldCheck, Layers, Activity, X, RefreshCw, Clock } from 'lucide-react';
import { DbStatusResponse } from '@/types';

interface DbStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
  dbStatus: DbStatusResponse | null;
  onRefreshStatus?: () => Promise<void>;
}

export const DbStatusModal: React.FC<DbStatusModalProps> = ({
  isOpen,
  onClose,
  dbStatus,
}) => {
  if (!isOpen) return null;

  const isConnected = dbStatus?.connected ?? false;
  const lastSyncTime = dbStatus?.timestamp
    ? new Date(dbStatus.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    : 'Just now';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shadow-xs">
              <Cloud className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-lg text-slate-900 dark:text-slate-100">
                Cloud Sync & Storage
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                Automatic Study Progress Synchronization
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close dialog"
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Live Status Hero Banner */}
        <div className="mt-5 p-4 rounded-2xl border bg-slate-50/80 dark:bg-slate-950/50 border-slate-200/80 dark:border-slate-800/80">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-emerald-500" />
              Sync Status
            </span>
            <span
              className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full ${
                isConnected
                  ? 'bg-emerald-100 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-400 ring-1 ring-emerald-500/20'
                  : 'bg-amber-100 dark:bg-amber-950/70 text-amber-700 dark:text-amber-400 ring-1 ring-amber-500/20'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
              {isConnected ? 'Cloud Active & Synced' : 'Offline / Local Storage'}
            </span>
          </div>

          <div className="flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-bold text-slate-800 dark:text-slate-100">
                All study progress is securely backed up
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Your flashcard sets, spaced repetition reviews, quiz scores, and starred terms are automatically synchronized across sessions.
              </p>
            </div>
          </div>
        </div>

        {/* System Specs in user-friendly language */}
        <div className="mt-4 grid grid-cols-2 gap-2.5">
          <div className="p-3 rounded-xl border border-slate-200/70 dark:border-slate-800 bg-white dark:bg-slate-900/60">
            <div className="flex items-center gap-2 text-slate-400 text-xs font-bold mb-1">
              <RefreshCw className="w-3.5 h-3.5 text-indigo-500" />
              Sync Mode
            </div>
            <p className="text-xs font-extrabold text-slate-800 dark:text-slate-200">
              Real-Time Backup
            </p>
            <p className="text-[11px] text-slate-400">Automatic background sync</p>
          </div>

          <div className="p-3 rounded-xl border border-slate-200/70 dark:border-slate-800 bg-white dark:bg-slate-900/60">
            <div className="flex items-center gap-2 text-slate-400 text-xs font-bold mb-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
              Data Security
            </div>
            <p className="text-xs font-extrabold text-slate-800 dark:text-slate-200">
              Encrypted & Safe
            </p>
            <p className="text-[11px] text-slate-400">Protected data transport</p>
          </div>

          <div className="p-3 rounded-xl border border-slate-200/70 dark:border-slate-800 bg-white dark:bg-slate-900/60">
            <div className="flex items-center gap-2 text-slate-400 text-xs font-bold mb-1">
              <Layers className="w-3.5 h-3.5 text-sky-500" />
              Synchronized Data
            </div>
            <p className="text-xs font-extrabold text-slate-800 dark:text-slate-200">
              All Study Categories
            </p>
            <p className="text-[11px] text-slate-400">Cards, decks, SRS, history</p>
          </div>

          <div className="p-3 rounded-xl border border-slate-200/70 dark:border-slate-800 bg-white dark:bg-slate-900/60">
            <div className="flex items-center gap-2 text-slate-400 text-xs font-bold mb-1">
              <Clock className="w-3.5 h-3.5 text-amber-500" />
              Last Sync
            </div>
            <p className="text-xs font-extrabold text-slate-800 dark:text-slate-200">
              {lastSyncTime}
            </p>
            <p className="text-[11px] text-slate-400">Always up-to-date</p>
          </div>
        </div>

        {/* Modal Actions */}
        <div className="mt-6 flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2.5 rounded-xl font-bold text-xs bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-600/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
