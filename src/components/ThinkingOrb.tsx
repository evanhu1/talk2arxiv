import MatrixOrb from './ui/matrix-orb'
import { useThemeColor } from '../lib/useThemeColor'

// The assistant's mark. It animates while an answer is on its way.
export default function ThinkingOrb({ active, size = 20 }: { active: boolean; size?: number }) {
  const accent = useThemeColor('--accent')
  return (
    <MatrixOrb
      state={active ? 'thinking' : 'idle'}
      size={size}
      dots={5}
      color={accent}
      labels={{ idle: '', thinking: '' }}
      className="shrink-0 gap-0"
    />
  )
}
