'use client';

import React, { useState } from 'react';
import { Database, CheckCircle2, AlertTriangle, Copy, Check, ExternalLink, RefreshCw, X, Terminal } from 'lucide-react';
import { DbStatusResponse } from '@/types';

interface DbStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
  dbStatus: DbStatusResponse | null;
  onRefreshStatus: () => Promise<void>;
}

export const DbStatusModal: React.FC<DbStatusModalProps> = ({
  isOpen,
  onClose,
  dbStatus,
  onRefreshStatus,
}) => {
  const [copied, setCopied] = useState(false);
  const [testing, setTesting] = useState(false);

  if (!isOpen) return null;

  const envTemplate = `# .env.local
DATABASE_URL="postgresql://neondb_owner:YOUR_PASSWORD@ep-something.us-east-2.aws.neon.tech/neondb?sslmode=require"`;

  const copySnippet = () => {
    navigator.clipboard.writeText(envTemplate);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleTest = async () => {
    setTesting(true);
    try {
      await onRefreshStatus();
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-lg text-slate-900 dark:text-slate-100">Database Connection</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                Neon Serverless PostgreSQL Backend
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Current Status Card */}
        <div className="mt-5 p-4 rounded-2xl border bg-slate-50/70 dark:bg-slate-950/40 border-slate-200/80 dark:border-slate-800/80">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Connection Status
            </span>
            <span
              className={`inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full ${
                dbStatus?.connected
                  ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400'
                  : 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400'
              }`}
            >
              {dbStatus?.connected ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" /> Neon PostgreSQL Active
                </>
              ) : (
                <>
                  <AlertTriangle className="w-3.5 h-3.5" /> Local Storage / Fallback
                </>
              )}
            </span>
          </div>
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
            {dbStatus?.message || 'Checking status...'}
          </p>
          {dbStatus?.neonHost && (
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 font-mono">
              Endpoint: {dbStatus.neonHost}
            </p>
          )}
        </div>

        {/* How to Connect Guide */}
        <div className="mt-5 space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            How to Connect Your Neon DB
          </h4>
          <ol className="text-xs space-y-2 text-slate-600 dark:text-slate-300 list-decimal list-inside font-medium leading-relaxed">
            <li>
              Create a free project at{' '}
              <a
                href="https://neon.tech"
                target="_blank"
                rel="noreferrer"
                className="text-indigo-600 dark:text-indigo-400 font-bold inline-flex items-center gap-0.5 hover:underline"
              >
                neon.tech <ExternalLink className="w-3 h-3" />
              </a>
            </li>
            <li>Copy your PostgreSQL connection URL from the Neon Dashboard.</li>
            <li>
              Open <code className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-bold">.env.local</code> in this project and paste:
            </li>
          </ol>

          <div className="relative rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-900 text-slate-200 font-mono text-[11px]">
            <div className="flex items-center justify-between px-3 py-1.5 bg-slate-950/80 border-b border-slate-800">
              <span className="flex items-center gap-1.5 text-slate-400 text-[10px]">
                <Terminal className="w-3 h-3" /> .env.local
              </span>
              <button
                type="button"
                onClick={copySnippet}
                className="flex items-center gap-1 text-[11px] font-bold text-indigo-400 hover:text-indigo-300"
              >
                {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
            <pre className="p-3 overflow-x-auto whitespace-pre-wrap">{envTemplate}</pre>
          </div>

          <p className="text-[11px] text-slate-400 dark:text-slate-500">
            Once saved, restart Next.js or click <strong>Test Connection</strong>. The database schema, tables, and presets will automatically synchronize.
          </p>
        </div>

        {/* Modal Actions */}
        <div className="mt-6 flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={handleTest}
            disabled={testing}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/60 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${testing ? 'animate-spin' : ''}`} />
            {testing ? 'Testing...' : 'Test Connection'}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl font-bold text-xs bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-600/20 transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
