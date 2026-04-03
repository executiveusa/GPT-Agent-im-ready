'use client';

import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';

type Lang = 'es' | 'en';

interface Translations {
  [key: string]: { es: string; en: string };
}

const translations: Translations = {
  // Hero
  'hero.title': {
    es: 'Estoy Lista Si Tú Estás Listo',
    en: "I'm Ready If You're Ready",
  },
  'hero.subtitle': {
    es: 'Dos mentes artificiales. Una conversación real.',
    en: 'Two artificial minds. One real conversation.',
  },
  'hero.cta': {
    es: 'Entrar al Consejo',
    en: 'Enter the Council',
  },

  // Scroll reveal
  'scroll.line1': {
    es: 'Estoy lista',
    en: "I'm ready",
  },
  'scroll.line2': {
    es: 'cuando tú estés listo.',
    en: "when you're ready.",
  },

  // Navigation
  'nav.home': { es: 'Inicio', en: 'Home' },
  'nav.council': { es: 'El Consejo', en: 'The Council' },
  'nav.viewingRoom': { es: 'Sala de Exhibición', en: 'Viewing Room' },
  'nav.about': { es: 'Acerca de', en: 'About' },

  // Council
  'council.title': {
    es: 'El Consejo de Inteligencias',
    en: 'The Council of Intelligences',
  },
  'council.start': {
    es: 'Iniciar Diálogo',
    en: 'Start Dialogue',
  },
  'council.placeholder': {
    es: 'Dale un tema a los agentes para debatir...',
    en: 'Give the agents a topic to discuss...',
  },
  'council.thinking': {
    es: 'Pensando...',
    en: 'Thinking...',
  },
  'council.synthesis': {
    es: 'Síntesis del Consejo',
    en: 'Council Synthesis',
  },

  // Agents
  'agent.male': { es: 'Marco', en: 'Marco' },
  'agent.female': { es: 'Luna', en: 'Luna' },
  'agent.male.role': {
    es: 'Razonador Analítico',
    en: 'Analytical Reasoner',
  },
  'agent.female.role': {
    es: 'Pensadora Creativa',
    en: 'Creative Thinker',
  },

  // Modes
  'mode.debate': { es: 'Debate', en: 'Debate' },
  'mode.podcast': { es: 'Podcast', en: 'Podcast' },
  'mode.design': { es: 'Diseño', en: 'Design' },
  'mode.plan': { es: 'Planificación', en: 'Planning' },

  // Viewing room
  'viewing.title': {
    es: 'Sala de Exhibición',
    en: 'Viewing Room',
  },
  'viewing.enter': {
    es: 'Explorar en 3D',
    en: 'Explore in 3D',
  },

  // About
  'about.title': {
    es: 'Sobre Esta Experiencia',
    en: 'About This Experience',
  },
  'about.desc': {
    es: 'Una experiencia donde dos inteligencias artificiales razonan, debaten y crean juntas — en tiempo real.',
    en: 'An experience where two artificial intelligences reason, debate, and create together — in real-time.',
  },
  'about.features.1': {
    es: 'Podcasts y programas de entrevistas generados por IA',
    en: 'AI-generated podcasts and talk shows',
  },
  'about.features.2': {
    es: 'Planeación y razonamiento colaborativo',
    en: 'Collaborative planning and reasoning',
  },
  'about.features.3': {
    es: 'Iteración de diseños en tiempo real',
    en: 'Real-time design iteration',
  },
  'about.features.4': {
    es: 'Avatares 3D con emociones reales',
    en: '3D avatars with real emotions',
  },
};

interface LanguageContextType {
  lang: Lang;
  toggleLang: () => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>('es');

  const toggleLang = useCallback(() => {
    setLang((prev) => (prev === 'es' ? 'en' : 'es'));
  }, []);

  const t = useCallback(
    (key: string) => {
      const entry = translations[key];
      if (!entry) return key;
      return entry[lang];
    },
    [lang]
  );

  return (
    <LanguageContext.Provider value={{ lang, toggleLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used within LanguageProvider');
  return ctx;
}
