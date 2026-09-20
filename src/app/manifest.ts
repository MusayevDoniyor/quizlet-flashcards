import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'LexiLearn — Spaced Repetition Flashcards & IELTS Vocabulary',
    short_name: 'LexiLearn',
    description:
      'Master academic and IELTS vocabulary with SuperMemo SM-2 spaced repetition, audio pronunciation, active recall quizzes, and speedrun match games.',
    start_url: '/',
    display: 'standalone',
    background_color: '#0B0F19',
    theme_color: '#4F46E5',
    icons: [
      {
        src: '/icon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
      },
      {
        src: '/apple-icon.png',
        sizes: '180x180',
        type: 'image/png',
      },
      {
        src: '/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
  };
}
