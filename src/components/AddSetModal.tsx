'use client';

import React, { useState } from 'react';
import { PlusCircle, Upload, X, AlertCircle } from 'lucide-react';

interface AddSetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddDeck: (title: string, data: any[]) => Promise<void>;
}

export const AddSetModal: React.FC<AddSetModalProps> = ({ isOpen, onClose, onAddDeck }) => {
  const [title, setTitle] = useState('');
  const [jsonText, setJsonText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const examplePlaceholder = `[
  {
    "word": "resilience",
    "synonyms": ["tenacity", "toughness"],
    "definition": "The capacity to recover quickly from difficulties; toughness."
  },
  {
    "word": "paradigm",
    "synonyms": ["framework", "model"],
    "definition": "A typical example or pattern of something; a model."
  }
]`;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!title.trim()) {
      setTitle(file.name.replace(/\.json$/i, ''));
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      setJsonText(event.target?.result as string || '');
      setError(null);
    };
    reader.readAsText(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const deckTitle = title.trim() || 'Custom Vocabulary Set';
    const raw = jsonText.trim();

    if (!raw) {
      setError('Please paste JSON data or upload a file.');
      return;
    }

    let parsed: any;
    try {
      parsed = JSON.parse(raw);
    } catch {
      setError('Invalid JSON format! Please ensure the data is a valid JSON array.');
      return;
    }

    if (!Array.isArray(parsed) || parsed.length === 0) {
      setError('The JSON root must be an array of vocabulary items.');
      return;
    }

    setLoading(true);
    try {
      await onAddDeck(deckTitle, parsed);
      setTitle('');
      setJsonText('');
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to create vocabulary deck.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <PlusCircle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-lg text-slate-900 dark:text-slate-100">Add New Vocabulary Set</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                Import JSON or upload a dictionary file
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

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
              Set Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Oxford Academic Core Vocabulary"
              className="w-full px-3.5 py-2.5 rounded-xl border bg-slate-50 dark:bg-slate-950/50 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 font-medium text-sm focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Vocabulary JSON Data
              </label>
              <label className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer">
                <Upload className="w-3.5 h-3.5" />
                Upload .json file
                <input type="file" accept=".json" onChange={handleFileUpload} className="hidden" />
              </label>
            </div>
            <textarea
              rows={8}
              value={jsonText}
              onChange={(e) => {
                setJsonText(e.target.value);
                setError(null);
              }}
              placeholder={examplePlaceholder}
              className="w-full px-3.5 py-2.5 rounded-xl border bg-slate-50 dark:bg-slate-950/50 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 font-mono text-xs focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all"
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900/60 text-rose-600 dark:text-rose-400 text-xs font-semibold">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl font-bold text-xs text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 rounded-xl font-bold text-xs bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-600/20 transition-colors disabled:opacity-50"
            >
              {loading ? 'Saving Set...' : 'Save Vocabulary Set'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
