import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import 'katex/dist/katex.min.css'
import { Children, isValidElement, type ReactNode } from 'react'
import CodeBlock from './ui/code-block'
import { useThemeColor } from '../lib/useThemeColor'

// Models often write \( \) and \[ \]. remark-math only reads dollar signs.
function normalizeMath(text: string) {
  return text
    .replace(/\\\[([\s\S]*?)\\\]/g, (_, tex: string) => `\n$$\n${tex.trim()}\n$$\n`)
    .replace(/\\\(([\s\S]*?)\\\)/g, (_, tex: string) => `$${tex.trim()}$`)
}

export default function Markdown({ text }: { text: string }) {
  const accent = useThemeColor('--accent')
  return (
    <div className="prose prose-sm prose-neutral max-w-none text-[14px] leading-relaxed text-ink dark:prose-invert prose-headings:font-semibold prose-headings:text-ink prose-p:my-2.5 prose-a:text-accent prose-strong:text-ink prose-code:rounded prose-code:bg-subtle prose-code:px-1 prose-code:py-0.5 prose-code:font-normal prose-code:text-ink prose-code:before:content-none prose-code:after:content-none prose-pre:border prose-pre:border-line prose-pre:bg-subtle prose-pre:text-ink prose-li:my-1 prose-blockquote:border-accent prose-blockquote:font-serif prose-blockquote:font-normal prose-blockquote:text-muted">
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[[rehypeKatex, { throwOnError: false, strict: false }]]}
        components={{
          a: ({ node: _node, ...props }) => <a {...props} target="_blank" rel="noopener noreferrer" />,
          pre: ({ children }) => {
            const { code, language } = codeOf(children)
            return (
              <CodeBlock
                code={code}
                language={language}
                accent={accent}
                showLineNumbers={false}
                className="not-prose my-3 text-[12.5px]"
              />
            )
          },
        }}
      >
        {normalizeMath(text)}
      </ReactMarkdown>
    </div>
  )
}

// react-markdown renders fenced code as <pre><code class="language-x">.
function codeOf(children: ReactNode) {
  const child = Children.toArray(children)[0]
  if (!isValidElement<{ className?: string; children?: ReactNode }>(child)) {
    return { code: String(children ?? ''), language: 'text' }
  }
  const language = /language-([\w-]+)/.exec(child.props.className ?? '')?.[1] ?? 'text'
  return { code: String(child.props.children ?? ''), language }
}
