// From Rare UI (https://rareui.com). Copyright (c) 2026 Swami Malode.
// MIT + Commons Clause + Attribution license. Keep this notice.
// Talk2Arxiv changes: each dash carries its section label, dashes are shorter
// to make room, the active dash uses the accent color, and long lists scroll.
// With labels="hover", only the dashes show until the pointer is over them,
// then the labels grow in from the left.
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react"
import {
  AnimatePresence,
  motion,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
  type MotionValue,
} from "motion/react"

type Side = "left" | "right"
type SectionKind = "title" | "subtitle" | "section" | "body"
type SectionLevel = 1 | 2 | 3 | 4 | 5 | 6

export type ProximitySection = {
  id: string
  label: string
  kind?: SectionKind
  level?: SectionLevel
}

type DashPreset = {
  base: number
  bump: number
  thickness: number
  className: string
}

type DashProps = {
  active: boolean
  index: number
  reduced: boolean
  mouseY: MotionValue<number>
  onSelect: (id: string) => void
  registerDash: (id: string, node: HTMLButtonElement | null) => void
  section: ProximitySection
  sectionKind: SectionKind
  showLabel: boolean
  side: Side
}

type ProximitySidebarProps = {
  activeOffset?: number
  className?: string
  labels?: "always" | "hover"
  sections: ProximitySection[]
  side?: Side
}

const EASE_OUT = [0.22, 1, 0.36, 1] as const
const EASE_IN = [0.4, 0, 1, 1] as const
const REVEAL_IN = { duration: 0.32, ease: EASE_OUT }
const REVEAL_OUT = { duration: 0.16, ease: EASE_IN }
// Each label starts a little after the one above it, so the list unrolls.
const REVEAL_STAGGER = 0.014
const REVEAL_HIDDEN = { opacity: 0, clipPath: "inset(0 100% 0 0)", x: -6 }

const RADIUS = 44
const MAX_DASH_WIDTH = 36
const SCROLL_IDLE_RESET_DELAY = 80

const DASH_PRESETS: Record<SectionKind, DashPreset> = {
  title: {
    base: 22,
    bump: 14,
    thickness: 1,
    className: "bg-foreground",
  },
  subtitle: {
    base: 18,
    bump: 14,
    thickness: 1,
    className: "bg-foreground",
  },
  section: {
    base: 10,
    bump: 12,
    thickness: 1,
    className: "bg-muted-foreground/40",
  },
  body: {
    base: 8,
    bump: 10,
    thickness: 1,
    className: "bg-muted-foreground/40",
  },
}

const getSectionElement = (id: string) =>
  typeof document === "undefined" ? null : document.getElementById(id)

const getSectionKind = (section: ProximitySection): SectionKind => {
  if (section.kind) return section.kind
  if (section.level === 1) return "title"
  if (section.level === 2) return "subtitle"
  if (section.level === 3) return "section"
  return "body"
}

const getElementSectionKind = (id: string): SectionKind | undefined => {
  const heading = getSectionElement(id)?.querySelector("h1, h2, h3, h4, h5, h6")
  const tagName = heading?.tagName.toLowerCase()

  if (tagName === "h1") return "title"
  if (tagName === "h2") return "subtitle"
  if (tagName === "h3") return "section"
  if (tagName) return "body"
}

const getScrollParent = (element: HTMLElement) => {
  let parent = element.parentElement

  while (parent) {
    const { overflowY } = window.getComputedStyle(parent)

    if (/(auto|scroll|overlay)/.test(overflowY)) {
      return parent
    }

    parent = parent.parentElement
  }

  return window
}

const Dash = ({
  active,
  index,
  reduced,
  mouseY,
  onSelect,
  registerDash,
  section,
  sectionKind,
  showLabel,
  side,
}: DashProps) => {
  const ref = useRef<HTMLButtonElement>(null)
  const preset = DASH_PRESETS[sectionKind]
  const activeWidth = preset.base + preset.bump

  useEffect(() => {
    registerDash(section.id, ref.current)
    return () => registerDash(section.id, null)
  }, [registerDash, section.id])

  const distance = useTransform(mouseY, (y) => {
    const rect = ref.current?.getBoundingClientRect()
    if (!rect) return RADIUS
    return y - (rect.top + rect.height / 2)
  })

  const targetScaleX = useTransform(
    distance,
    [-RADIUS, 0, RADIUS],
    [
      preset.base / MAX_DASH_WIDTH,
      activeWidth / MAX_DASH_WIDTH,
      preset.base / MAX_DASH_WIDTH,
    ],
    { clamp: true }
  )

  const scaleX = useSpring(targetScaleX, {
    stiffness: 320,
    damping: 34,
    mass: 0.7,
  })

  const labelOpacity = useTransform(distance, [-RADIUS, 0, RADIUS], [0.62, 1, 0.62], {
    clamp: true,
  })
  const isMinor = sectionKind === "section" || sectionKind === "body"

  return (
    <button
      ref={ref}
      type="button"
      aria-current={active ? "location" : undefined}
      aria-label={showLabel ? undefined : section.label}
      title={section.label}
      className={`group flex h-[18px] min-w-0 items-center gap-3 border-0 bg-transparent p-0 text-left outline-none ${
        showLabel ? "w-full" : ""
      }`}
      onClick={() => onSelect(section.id)}
    >
      <span className="flex shrink-0" style={{ width: MAX_DASH_WIDTH }}>
        <motion.span
          className={`block transition-colors duration-150 ease-out group-focus-visible:ring-2 group-focus-visible:ring-ring group-focus-visible:ring-offset-2 ${
            active ? "bg-accent" : preset.className
          }`}
          style={{
            height: active ? 2 : preset.thickness,
            scaleX,
            transformOrigin: side === "left" ? "left center" : "right center",
            width: MAX_DASH_WIDTH,
          }}
        />
      </span>
      <AnimatePresence initial={false}>
        {showLabel && (
          <motion.span
            key="label"
            className="flex min-w-0"
            initial={REVEAL_HIDDEN}
            animate={{
              opacity: 1,
              clipPath: "inset(0 0% 0 0)",
              x: 0,
              transition: reduced
                ? { duration: 0 }
                : { ...REVEAL_IN, delay: Math.min(index, 24) * REVEAL_STAGGER },
            }}
            exit={{ ...REVEAL_HIDDEN, transition: reduced ? { duration: 0 } : REVEAL_OUT }}
          >
            <motion.span
              className={`min-w-0 max-w-[200px] truncate leading-none transition-colors duration-150 ${
                isMinor ? "text-[12px]" : "text-[12.5px]"
              } ${
                active
                  ? "font-medium text-foreground"
                  : "text-muted-foreground group-hover:text-foreground"
              }`}
              style={{ opacity: active ? 1 : labelOpacity }}
            >
              {section.label}
            </motion.span>
          </motion.span>
        )}
      </AnimatePresence>
    </button>
  )
}

const ProximitySidebar = ({
  activeOffset = 0.4,
  className = "",
  labels = "always",
  side = "left",
  sections,
}: ProximitySidebarProps) => {
  const [hovered, setHovered] = useState(false)
  const showLabels = labels === "always" || hovered
  const mouseY = useMotionValue(Infinity)
  const shouldReduceMotion = useReducedMotion()
  const dashRefs = useRef(new Map<string, HTMLButtonElement>())
  const pointerInside = useRef(false)
  const resetTimer = useRef<number | null>(null)
  const [activeId, setActiveId] = useState(sections[0]?.id)
  const [detectedKinds, setDetectedKinds] = useState<Record<string, SectionKind>>(
    {}
  )

  const sectionIds = useMemo(
    () => sections.map((section) => section.id).join("|"),
    [sections]
  )

  const registerDash = useCallback(
    (id: string, node: HTMLButtonElement | null) => {
      if (node) {
        dashRefs.current.set(id, node)
        return
      }

      dashRefs.current.delete(id)
    },
    []
  )

  const clearPendingReset = useCallback(() => {
    if (!resetTimer.current) return

    window.clearTimeout(resetTimer.current)
    resetTimer.current = null
  }, [])

  const setMouseToDash = useCallback(
    (id?: string) => {
      if (!id) {
        mouseY.set(Infinity)
        return
      }

      const node = dashRefs.current.get(id)
      if (!node) return

      const rect = node.getBoundingClientRect()
      mouseY.set(rect.top + rect.height / 2)
    },
    [mouseY]
  )

  const pulseDash = useCallback(
    (id?: string) => {
      setMouseToDash(id)
      clearPendingReset()

      if (!id || pointerInside.current) return

      resetTimer.current = window.setTimeout(() => {
        mouseY.set(Infinity)
        resetTimer.current = null
      }, SCROLL_IDLE_RESET_DELAY)
    },
    [clearPendingReset, mouseY, setMouseToDash]
  )

  const selectSection = useCallback(
    (id: string) => {
      const element = getSectionElement(id)
      if (!element) return

      element.scrollIntoView({
        behavior: shouldReduceMotion ? "auto" : "smooth",
        block: "start",
      })

      window.history.replaceState(null, "", `#${id}`)
      setActiveId(id)
      pulseDash(id)
    },
    [pulseDash, shouldReduceMotion]
  )

  useEffect(() => () => clearPendingReset(), [clearPendingReset])

  useEffect(() => {
    const kinds = sections.reduce<Record<string, SectionKind>>(
      (nextKinds, section) => {
        nextKinds[section.id] =
          section.kind || section.level
            ? getSectionKind(section)
            : getElementSectionKind(section.id) ?? getSectionKind(section)

        return nextKinds
      },
      {}
    )

    setDetectedKinds(kinds)
  }, [sectionIds, sections])

  useEffect(() => {
    if (!sections.length) return

    let frame = 0

    const updateActiveSection = () => {
      frame = 0

      const anchorY = window.innerHeight * activeOffset
      let nextActiveId = sections[0]?.id
      let shortestDistance = Number.POSITIVE_INFINITY

      for (const section of sections) {
        const element = getSectionElement(section.id)
        if (!element) continue

        const rect = element.getBoundingClientRect()
        const containsAnchor = rect.top <= anchorY && rect.bottom >= anchorY
        const distance = containsAnchor
          ? 0
          : Math.min(Math.abs(rect.top - anchorY), Math.abs(rect.bottom - anchorY))

        if (distance < shortestDistance) {
          shortestDistance = distance
          nextActiveId = section.id
        }
      }

      setActiveId(nextActiveId)

      if (!pointerInside.current) {
        pulseDash(nextActiveId)
      }
    }

    const scheduleUpdate = () => {
      if (frame) return
      frame = window.requestAnimationFrame(updateActiveSection)
    }

    const scrollParents = new Set<EventTarget>([window])

    for (const section of sections) {
      const element = getSectionElement(section.id)
      if (element) scrollParents.add(getScrollParent(element))
    }

    updateActiveSection()

    for (const parent of scrollParents) {
      parent.addEventListener("scroll", scheduleUpdate, { passive: true })
    }

    window.addEventListener("resize", scheduleUpdate)

    return () => {
      if (frame) window.cancelAnimationFrame(frame)

      for (const parent of scrollParents) {
        parent.removeEventListener("scroll", scheduleUpdate)
      }

      window.removeEventListener("resize", scheduleUpdate)
    }
  }, [activeOffset, pulseDash, sectionIds, sections])

  return (
    <nav
      aria-label="Page sections"
      className={`flex h-full min-h-0 overflow-y-auto [scrollbar-width:none] ${
        side === "left" ? "justify-start" : "justify-end"
      } ${className}`}
    >
      <div
        className={`pointer-events-auto my-auto flex min-w-0 flex-col py-6 pr-3 pl-6 ${
          side === "right" ? "items-end" : "items-start"
        } ${labels === "always" ? "w-full" : "w-max"}`}
        style={{ gap: 5 }}
        onPointerEnter={() => setHovered(true)}
        onPointerMove={(event) => {
          clearPendingReset()
          pointerInside.current = true
          mouseY.set(event.clientY)
        }}
        onPointerLeave={() => {
          setHovered(false)
          pointerInside.current = false
          mouseY.set(Infinity)
        }}
      >
        {sections.map((section, index) => (
          <Dash
            key={section.id}
            index={index}
            reduced={shouldReduceMotion ?? false}
            active={section.id === activeId}
            mouseY={mouseY}
            onSelect={selectSection}
            registerDash={registerDash}
            section={section}
            sectionKind={detectedKinds[section.id] ?? getSectionKind(section)}
            showLabel={showLabels}
            side={side}
          />
        ))}
      </div>
    </nav>
  )
}

export default ProximitySidebar
