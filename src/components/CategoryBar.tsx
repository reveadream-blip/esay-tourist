import { Building2, Car, Landmark, Martini, Sparkles, TentTree, Utensils, Waves } from 'lucide-react'
import type { ComponentType } from 'react'
import { useTranslation } from 'react-i18next'

export type CategoryId =
  | 'hotels'
  | 'restos'
  | 'bars'
  | 'nightlife'
  | 'spa'
  | 'activities'
  | 'monuments'
  | 'rentals'

type CategoryItem = {
  id: CategoryId
  emoji: string
  icon: ComponentType<{ className?: string }>
}

const categories: CategoryItem[] = [
  { id: 'hotels', emoji: '🏨', icon: Building2 },
  { id: 'restos', emoji: '🍽', icon: Utensils },
  { id: 'bars', emoji: '🍹', icon: Martini },
  { id: 'nightlife', emoji: '💃', icon: Sparkles },
  { id: 'spa', emoji: '💆', icon: Waves },
  { id: 'activities', emoji: '🎡', icon: TentTree },
  { id: 'monuments', emoji: '🏛', icon: Landmark },
  { id: 'rentals', emoji: '🚗', icon: Car },
]

type CategoryBarProps = {
  selected: CategoryId
  onSelect: (category: CategoryId) => void
}

export function CategoryBar({ selected, onSelect }: CategoryBarProps) {
  const { t } = useTranslation()

  return (
    <div className="sticky top-3 z-[800] overflow-x-auto rounded-2xl border border-white/30 bg-white/45 p-2 shadow-xl backdrop-blur-md">
      <div className="flex min-w-max items-center gap-2">
        {categories.map(({ id, emoji, icon: Icon }) => {
          const isActive = selected === id
          return (
            <button
              key={id}
              type="button"
              onClick={() => onSelect(id)}
              className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition ${
                isActive
                  ? 'bg-white text-slate-900 shadow-md'
                  : 'bg-white/35 text-slate-700 hover:bg-white/60'
              }`}
            >
              <span>{emoji}</span>
              <Icon className="h-4 w-4" />
              <span>{t(`categories.${id}`)}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
