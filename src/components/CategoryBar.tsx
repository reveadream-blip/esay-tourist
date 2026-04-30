import type { ComponentType } from 'react'
import {
  Briefcase,
  Building2,
  Car,
  Landmark,
  Martini,
  Sparkles,
  Store,
  TentTree,
  Utensils,
  Waves,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'

export type CategoryId =
  | 'all'
  | 'hotels'
  | 'restos'
  | 'bars'
  | 'markets'
  | 'agencies'
  | 'nightlife'
  | 'spa'
  | 'activities'
  | 'monuments'
  | 'rentals'

type Category = {
  id: CategoryId
  emoji: string
  icon: ComponentType<{ className?: string }>
}

const categories: Category[] = [
  { id: 'all', emoji: '🌍', icon: Sparkles },
  { id: 'hotels', emoji: '🏨', icon: Building2 },
  { id: 'restos', emoji: '🍽', icon: Utensils },
  { id: 'bars', emoji: '🍹', icon: Martini },
  { id: 'markets', emoji: '🛒', icon: Store },
  { id: 'agencies', emoji: '🧳', icon: Briefcase },
  { id: 'nightlife', emoji: '💃', icon: Sparkles },
  { id: 'spa', emoji: '💆', icon: Waves },
  { id: 'activities', emoji: '🎡', icon: TentTree },
  { id: 'monuments', emoji: '🏛', icon: Landmark },
  { id: 'rentals', emoji: '🚗', icon: Car },
]

type Props = {
  selected: CategoryId
  onChange: (value: CategoryId) => void
}

export function CategoryBar({ selected, onChange }: Props) {
  const { t } = useTranslation()

  return (
    <nav
      className="sticky top-3 z-[900] overflow-x-auto rounded-2xl border border-white/30 bg-white/50 p-2 shadow-xl backdrop-blur-md"
      aria-label={t('aria.categoryNav')}
    >
      <div className="flex min-w-max items-center gap-2">
        {categories.map(({ id, emoji, icon: Icon }) => {
          const active = id === selected
          return (
            <button
              key={id}
              type="button"
              onClick={() => onChange(id)}
              aria-pressed={active}
              aria-label={t(`categories.${id}`)}
              className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition ${
                active
                  ? 'bg-white text-slate-900 shadow'
                  : 'bg-white/35 text-slate-700 hover:bg-white/65'
              }`}
            >
              <span aria-hidden>{emoji}</span>
              <Icon className="h-4 w-4" aria-hidden />
              <span>{t(`categories.${id}`)}</span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
