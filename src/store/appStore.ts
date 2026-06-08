import { create } from 'zustand';
import type { CvdType, Language } from '@/data/appData';

interface AppState {
  language: Language;
  imageType: CvdType;
  videoType: CvdType;
  colorType: CvdType;
  currentColor: string;
  setLanguage: (language: Language) => void;
  setImageType: (type: CvdType) => void;
  setVideoType: (type: CvdType) => void;
  setColorType: (type: CvdType) => void;
  setCurrentColor: (color: string) => void;
}

export const useAppStore = create<AppState>((set) => ({
  language: 'zh',
  imageType: 'protanopia',
  videoType: 'protanopia',
  colorType: 'normal',
  currentColor: '#D6643E',
  setLanguage: (language) => set({ language }),
  setImageType: (imageType) => set({ imageType }),
  setVideoType: (videoType) => set({ videoType }),
  setColorType: (colorType) => set({ colorType }),
  setCurrentColor: (currentColor) => set({ currentColor }),
}));
