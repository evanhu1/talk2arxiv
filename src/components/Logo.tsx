// χ is the Greek letter in the arXiv name.
export default function Logo({ withName = true }: { withName?: boolean }) {
  return (
    <a href="/" className="flex shrink-0 items-center gap-2" aria-label="Talk2Arxiv home">
      <span className="grid size-7 place-items-center rounded-lg bg-accent pb-0.5 font-serif text-[17px] font-bold text-white">
        χ
      </span>
      {withName && <span className="font-serif text-[17px] font-semibold tracking-tight">Talk2Arxiv</span>}
    </a>
  )
}
