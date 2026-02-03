"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';
import { READING, CACHE } from '@/lib/config';

interface ReadingSettings {
  fontSize: number;
  theme: 'light' | 'dark' | 'sepia' | 'black';
  brightness: number;
  lineHeight: number;
  fontFamily: string;
  letterSpacing: number;
  columnWidth: number;
  justify: boolean;
  wideDesktop: boolean;
  twoColumnsDesktop: boolean;
}

interface Novel {
  id: string;
  title: string;
  author: string;
  cover: string;
  description: string;
  chapters: Chapter[];
  rating: number;
  views: number;
  status: string;
}

interface Chapter {
  id: string;
  title: string;
  content: string;
  chapterNumber: number;
  publishDate: string;
}

interface ReadingProgress {
  novelId: string;
  chapterId: string;
  chapterNumber: number;
  progress: number;
  lastRead: string;
}

interface ReadingContextType {
  settings: ReadingSettings;
  updateSettings: (settings: Partial<ReadingSettings>) => void;
  currentNovel: Novel | null;
  setCurrentNovel: (novel: Novel) => void;
  currentChapter: Chapter | null;
  setCurrentChapter: (chapter: Chapter) => void;
  readingProgress: ReadingProgress[];
  updateProgress: (progress: ReadingProgress) => void;
  bookmarks: string[];
  toggleBookmark: (novelId: string) => void;
  history: Novel[];
  addToHistory: (novel: Novel) => void;
}

const ReadingContext = createContext<ReadingContextType | undefined>(undefined);

export const useReading = () => {
  const context = useContext(ReadingContext);
  if (!context) {
    throw new Error('useReading must be used within a ReadingProvider');
  }
  return context;
};

const defaultSettings: ReadingSettings = {
  fontSize: READING.DEFAULT_FONT_SIZE,
  theme: 'sepia',
  brightness: READING.DEFAULT_BRIGHTNESS,
  lineHeight: READING.DEFAULT_LINE_HEIGHT,
  fontFamily: 'system-ui',
  letterSpacing: 0,
  columnWidth: READING.DEFAULT_COLUMN_WIDTH,
  justify: false,
  wideDesktop: true,
  twoColumnsDesktop: false,
};

export const ReadingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<ReadingSettings>(defaultSettings);
  const [currentNovel, setCurrentNovel] = useState<Novel | null>(null);
  const [currentChapter, setCurrentChapter] = useState<Chapter | null>(null);
  const [readingProgress, setReadingProgress] = useState<ReadingProgress[]>([]);
  const [bookmarks, setBookmarks] = useState<string[]>([]);
  const [history, setHistory] = useState<Novel[]>([]);

  useEffect(() => {
    const savedSettings = localStorage.getItem(CACHE.READING_SETTINGS_KEY);
    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings);
        setSettings({ ...defaultSettings, ...parsed });
      } catch {
        setSettings(defaultSettings);
      }
    }

    const savedBookmarks = localStorage.getItem(CACHE.BOOKMARKS_KEY);
    if (savedBookmarks) {
      setBookmarks(JSON.parse(savedBookmarks));
    }

    const savedHistory = localStorage.getItem(CACHE.READING_HISTORY_KEY);
    if (savedHistory) {
      setHistory(JSON.parse(savedHistory));
    }

    const savedProgress = localStorage.getItem(CACHE.READING_PROGRESS_KEY);
    if (savedProgress) {
      setReadingProgress(JSON.parse(savedProgress));
    }
  }, []);

  const updateSettings = (newSettings: Partial<ReadingSettings>) => {
    const updatedSettings = { ...settings, ...newSettings };
    setSettings(updatedSettings);
    localStorage.setItem(CACHE.READING_SETTINGS_KEY, JSON.stringify(updatedSettings));
  };

  const updateProgress = (progress: ReadingProgress) => {
    const updatedProgress = readingProgress.filter(p => p.novelId !== progress.novelId);
    updatedProgress.push(progress);
    setReadingProgress(updatedProgress);
    localStorage.setItem(CACHE.READING_PROGRESS_KEY, JSON.stringify(updatedProgress));
  };

  const toggleBookmark = (novelId: string) => {
    const updatedBookmarks = bookmarks.includes(novelId)
      ? bookmarks.filter(id => id !== novelId)
      : [...bookmarks, novelId];
    setBookmarks(updatedBookmarks);
    localStorage.setItem(CACHE.BOOKMARKS_KEY, JSON.stringify(updatedBookmarks));
  };

  const addToHistory = (novel: Novel) => {
    const updatedHistory = history.filter(n => n.id !== novel.id);
    updatedHistory.unshift(novel);
    const limitedHistory = updatedHistory.slice(0, CACHE.MAX_HISTORY_ITEMS);
    setHistory(limitedHistory);
    localStorage.setItem(CACHE.READING_HISTORY_KEY, JSON.stringify(limitedHistory));
  };

  return (
    <ReadingContext.Provider value={{
      settings,
      updateSettings,
      currentNovel,
      setCurrentNovel,
      currentChapter,
      setCurrentChapter,
      readingProgress,
      updateProgress,
      bookmarks,
      toggleBookmark,
      history,
      addToHistory
    }}>
      {children}
    </ReadingContext.Provider>
  );
};