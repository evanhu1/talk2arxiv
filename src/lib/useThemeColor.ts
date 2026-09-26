import { useMediaQuery } from './useMediaQuery'

// Reads a theme color variable from :root as a concrete value. Canvas and SVG
// attributes cannot use var(), so components that draw need the real color.
export function useThemeColor(variable: string) {
  const dark = useMediaQuery('(prefers-color-scheme: dark)')
  // `dark` is only a dependency: the variable's value changes with it.
  void dark
  return getComputedStyle(document.documentElement).getPropertyValue(variable).trim()
}
