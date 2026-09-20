import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://quizlet-flashcards-nine.vercel.app"),
  title: {
    default: "LexiLearn — Spaced Repetition Flashcards & IELTS Vocabulary",
    template: "%s | LexiLearn",
  },
  description:
    "Master academic and IELTS vocabulary with SuperMemo SM-2 spaced repetition, interactive flashcards, natural audio pronunciation, active recall quizzes, and speedrun match games.",
  applicationName: "LexiLearn",
  keywords: [
    "IELTS vocabulary",
    "academic flashcards",
    "spaced repetition",
    "SM-2 algorithm",
    "active recall",
    "English vocabulary",
    "Quizlet alternative",
    "IELTS preparation",
    "vocabulary learning",
    "LexiLearn",
  ],
  authors: [{ name: "Doniyor Musayev", url: "https://github.com/MusayevDoniyor" }],
  creator: "Doniyor Musayev",
  publisher: "LexiLearn",
  category: "Education",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/favicon.ico", sizes: "any" },
    ],
    shortcut: "/favicon.ico",
    apple: [
      { url: "/apple-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://quizlet-flashcards-nine.vercel.app",
    title: "LexiLearn — Spaced Repetition Flashcards & IELTS Vocabulary",
    description:
      "Supercharge your active recall with SM-2 spaced repetition, audio pronunciation, and interactive vocabulary games.",
    siteName: "LexiLearn",
  },
  twitter: {
    card: "summary_large_image",
    title: "LexiLearn — Flashcards & Spaced Repetition",
    description:
      "Intelligent spaced repetition flashcards and active recall for IELTS & academic vocabulary.",
    creator: "@musayevdoniyor",
  },
  appleWebApp: {
    capable: true,
    title: "LexiLearn",
    statusBarStyle: "black-translucent",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#4F46E5" },
    { media: "(prefers-color-scheme: dark)", color: "#0B0F19" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col font-sans">{children}</body>
    </html>
  );
}
