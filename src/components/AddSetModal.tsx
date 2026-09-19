'use client';

import React, { useState } from 'react';
import { PlusCircle, Upload, X, AlertCircle, Sparkles, BookOpen, Cpu, Briefcase } from 'lucide-react';

interface AddSetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddDeck: (title: string, data: any[]) => Promise<void>;
}

export const AddSetModal: React.FC<AddSetModalProps> = ({ isOpen, onClose, onAddDeck }) => {
  const [title, setTitle] = useState('');
  const [inputText, setInputText] = useState('');
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
]

OR paste plain text lines:
resilience - The capacity to recover quickly from difficulties
paradigm - A typical example or pattern of something`;

  // Quick Curated Topic Templates
  const applyTemplate = (templateType: 'ielts' | 'tech' | 'business') => {
    setError(null);
    if (templateType === 'ielts') {
      setTitle('IELTS Academic Band 8+ Vocabulary');
      setInputText(
        JSON.stringify(
          [
            { word: 'ubiquitous', synonyms: ['omnipresent', 'pervasive'], definition: 'Present, appearing, or found everywhere simultaneously.' },
            { word: 'mitigate', synonyms: ['alleviate', 'lessen', 'diminish'], definition: 'Make something bad less severe, serious, or painful.' },
            { word: 'pragmatic', synonyms: ['practical', 'sensible', 'realistic'], definition: 'Dealing with matters sensibly and realistically based on practical considerations.' },
            { word: 'anomaly', synonyms: ['irregularity', 'aberration', 'deviation'], definition: 'Something that deviates from what is standard, normal, or expected.' },
            { word: 'succinct', synonyms: ['concise', 'compact', 'laconic'], definition: 'Briefly and clearly expressed without unnecessary words.' },
            { word: 'profound', synonyms: ['deep', 'insightful', 'far-reaching'], definition: 'Very great, intense, or possessing immense intellectual depth.' },
            { word: 'ephemeral', synonyms: ['transitory', 'fleeting', 'short-lived'], definition: 'Lasting for a very short, fleeting period of time.' },
            { word: 'paradox', synonyms: ['contradiction', 'enigma', 'puzzle'], definition: 'A statement that appears self-contradictory but investigation reveals truth.' },
            { word: 'lucid', synonyms: ['coherent', 'articulate', 'intelligible'], definition: 'Expressed clearly; easy to understand, rational and luminous.' },
            { word: 'ambiguous', synonyms: ['equivocal', 'unclear', 'vague'], definition: 'Open to more than one interpretation; lacking an obvious meaning.' },
            { word: 'bolster', synonyms: ['reinforce', 'boost', 'fortify'], definition: 'Support, strengthen, or prop up effectively.' },
            { word: 'scrutinize', synonyms: ['inspect', 'examine', 'survey'], definition: 'Examine or inspect closely and thoroughly with critical analysis.' },
          ],
          null,
          2
        )
      );
    } else if (templateType === 'tech') {
      setTitle('Tech, AI & Machine Learning');
      setInputText(
        JSON.stringify(
          [
            { word: 'inference', synonyms: ['prediction', 'evaluation'], definition: 'The phase where a trained machine learning model evaluates live inputs to produce predictions.' },
            { word: 'hallucination', synonyms: ['confabulation', 'fabrication'], definition: 'A phenomenon where an LLM generates ungrounded or factually incorrect information confidently.' },
            { word: 'concurrency', synonyms: ['parallelism', 'multitasking'], definition: 'The property of systems where multiple execution paths proceed without deterministic ordering.' },
            { word: 'vector embedding', synonyms: ['feature vector', 'latent representation'], definition: 'A continuous numerical representation capturing semantic relationships in high-dimensional space.' },
            { word: 'latency', synonyms: ['delay', 'lag', 'response time'], definition: 'The round-trip duration between dispatching a request and receiving the initial response byte.' },
            { word: 'idempotency', synonyms: ['repeatability', 'state invariance'], definition: 'An architectural property guaranteeing multiple duplicate invocations yield identical results.' },
            { word: 'fine-tuning', synonyms: ['domain adaptation', 'specialization'], definition: 'Adapting pre-trained foundational model weights on task-specific domain data.' },
            { word: 'pipeline', synonyms: ['data workflow', 'stream'], definition: 'A deterministic sequence of software stages where the output of each serves as the next input.' },
            { word: 'tokenizer', synonyms: ['parser', 'subword segmenter'], definition: 'The component responsible for fragmenting input raw text into numerical token vocab indices.' },
            { word: 'zero-shot learning', synonyms: ['generalized inference', 'in-context learning'], definition: 'The capability of an artificial intelligence system to resolve unseen tasks without prior task training.' },
          ],
          null,
          2
        )
      );
    } else if (templateType === 'business') {
      setTitle('Executive Leadership & Business Strategy');
      setInputText(
        JSON.stringify(
          [
            { word: 'leverage', synonyms: ['capitalize on', 'utilize', 'exploit'], definition: 'To utilize existing assets, capabilities, or resources to maximum strategic advantage.' },
            { word: 'synergy', synonyms: ['collaboration', 'combined effect'], definition: 'The collaborative interaction of organizational units producing greater total output than individual parts.' },
            { word: 'due diligence', synonyms: ['audit', 'systematic appraisal'], definition: 'Comprehensive investigation and risk appraisal conducted prior to signing transactions.' },
            { word: 'scalability', synonyms: ['elasticity', 'growth capacity'], definition: 'The organizational capability to sustain significant revenue growth without proportional overhead expansion.' },
            { word: 'deliverable', synonyms: ['work product', 'milestone output'], definition: 'A tangible product, service, or asset committed to and delivered for stakeholders.' },
            { word: 'contingency', synonyms: ['emergency plan', 'buffer'], definition: 'A predetermined provision or procedure devised for unexpected operational disruptions.' },
            { word: 'benchmark', synonyms: ['criterion', 'gold standard', 'yardstick'], definition: 'A standardized measurement metric against which operational performance is evaluated.' },
            { word: 'stakeholder', synonyms: ['interested party', 'constituent'], definition: 'Any individual or group possessing legitimate interest in company decisions and outcomes.' },
          ],
          null,
          2
        )
      );
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!title.trim()) {
      setTitle(file.name.replace(/\.[^/.]+$/, ''));
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      setInputText((event.target?.result as string) || '');
      setError(null);
    };
    reader.readAsText(file);
  };

  // Smart Parser: Accepts either JSON array OR plain text lines ("word - definition" or "word : definition")
  const parseInputData = (rawText: string): any[] => {
    const trimmed = rawText.trim();

    // 1. Try standard JSON
    if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) return parsed;
        if (parsed && typeof parsed === 'object' && Array.isArray(parsed.data)) return parsed.data;
      } catch (err: any) {
        throw new Error(`JSON syntax error: ${err.message}. If pasting plain text, use "word - definition" per line.`);
      }
    }

    // 2. Parse plain text line-by-line (e.g. "word - definition" or "word: definition")
    const lines = trimmed.split('\n').map((l) => l.trim()).filter(Boolean);
    const parsedItems: any[] = [];

    for (const line of lines) {
      let word = '';
      let definition = '';

      if (line.includes(' - ')) {
        const parts = line.split(' - ');
        word = parts[0].trim();
        definition = parts.slice(1).join(' - ').trim();
      } else if (line.includes(' : ')) {
        const parts = line.split(' : ');
        word = parts[0].trim();
        definition = parts.slice(1).join(' : ').trim();
      } else if (line.includes(':')) {
        const parts = line.split(':');
        word = parts[0].trim();
        definition = parts.slice(1).join(':').trim();
      } else if (line.includes('—')) {
        const parts = line.split('—');
        word = parts[0].trim();
        definition = parts.slice(1).join('—').trim();
      }

      if (word && definition) {
        parsedItems.push({
          word,
          definition,
          synonyms: [],
        });
      }
    }

    if (parsedItems.length > 0) {
      return parsedItems;
    }

    throw new Error('Could not parse vocabulary. Paste a valid JSON array or lines in "word - definition" format.');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const deckTitle = title.trim() || 'Custom Vocabulary Set';
    const raw = inputText.trim();

    if (!raw) {
      setError('Please paste JSON data, enter terms, or select a template.');
      return;
    }

    let parsed: any[];
    try {
      parsed = parseInputData(raw);
    } catch (err: any) {
      setError(err.message);
      return;
    }

    if (parsed.length === 0) {
      setError('No valid vocabulary terms found. Enter at least one term.');
      return;
    }

    setLoading(true);
    try {
      await onAddDeck(deckTitle, parsed);
      setTitle('');
      setInputText('');
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to create vocabulary deck.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <PlusCircle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-lg text-slate-900 dark:text-slate-100">Add Vocabulary Topic</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                Load templates, paste plain text or upload JSON
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

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="mt-4 space-y-4 overflow-y-auto pr-1 flex-1">
          {/* Quick Curated Topic Templates */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>1-Click Curated Topics</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => applyTemplate('ielts')}
                className="flex items-center gap-2 p-2.5 rounded-xl border border-indigo-200/80 dark:border-indigo-900/60 bg-indigo-50/50 dark:bg-indigo-950/30 hover:bg-indigo-100/70 dark:hover:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 text-left transition-all group"
              >
                <BookOpen className="w-4 h-4 shrink-0 text-indigo-600 dark:text-indigo-400 group-hover:scale-110 transition-transform" />
                <div>
                  <div className="text-xs font-black leading-snug">IELTS Band 8+</div>
                  <div className="text-[10px] text-indigo-600/70 dark:text-indigo-400/70">12 Academic Words</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => applyTemplate('tech')}
                className="flex items-center gap-2 p-2.5 rounded-xl border border-sky-200/80 dark:border-sky-900/60 bg-sky-50/50 dark:bg-sky-950/30 hover:bg-sky-100/70 dark:hover:bg-sky-900/50 text-sky-700 dark:text-sky-300 text-left transition-all group"
              >
                <Cpu className="w-4 h-4 shrink-0 text-sky-600 dark:text-sky-400 group-hover:scale-110 transition-transform" />
                <div>
                  <div className="text-xs font-black leading-snug">Tech & AI</div>
                  <div className="text-[10px] text-sky-600/70 dark:text-sky-400/70">10 Core Concepts</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => applyTemplate('business')}
                className="flex items-center gap-2 p-2.5 rounded-xl border border-emerald-200/80 dark:border-emerald-900/60 bg-emerald-50/50 dark:bg-emerald-950/30 hover:bg-emerald-100/70 dark:hover:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 text-left transition-all group"
              >
                <Briefcase className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-transform" />
                <div>
                  <div className="text-xs font-black leading-snug">Leadership</div>
                  <div className="text-[10px] text-emerald-600/70 dark:text-emerald-400/70">8 Executive Terms</div>
                </div>
              </button>
            </div>
          </div>

          {/* Set Title Input */}
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

          {/* Vocabulary Content Textarea */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                JSON Data or Text Lines
              </label>
              <label className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer">
                <Upload className="w-3.5 h-3.5" />
                <span>Upload file</span>
                <input type="file" accept=".json,.txt" onChange={handleFileUpload} className="hidden" />
              </label>
            </div>
            <textarea
              rows={7}
              value={inputText}
              onChange={(e) => {
                setInputText(e.target.value);
                setError(null);
              }}
              placeholder={examplePlaceholder}
              className="w-full px-3.5 py-2.5 rounded-xl border bg-slate-50 dark:bg-slate-950/50 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 font-mono text-xs focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all scrollbar-thin"
            />
            <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
              Tip: You can paste JSON format or plain lines like <code className="px-1 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-mono">word - definition</code>.
            </p>
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900/60 text-rose-600 dark:text-rose-400 text-xs font-semibold">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Footer Action Buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800 shrink-0">
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
              {loading ? 'Creating Deck...' : 'Create Vocabulary Deck'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
