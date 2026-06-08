import type { CvdType, Language } from '@/data/appData';
import { cvdTypes } from '@/data/appData';

interface TypePillsProps {
  language: Language;
  value: CvdType;
  onChange: (value: CvdType) => void;
  includeNormal?: boolean;
}

export default function TypePills({ language, value, onChange, includeNormal = false }: TypePillsProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {cvdTypes
        .filter((item) => includeNormal || item.key !== 'normal')
        .map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => onChange(item.key)}
            className={[
              'theme-pill',
              value === item.key ? 'theme-pill-active' : '',
            ].join(' ')}
          >
            {item.names[language]}
          </button>
        ))}
    </div>
  );
}
