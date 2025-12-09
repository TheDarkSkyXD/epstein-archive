import React from 'react'

interface ArticleContent {
  id: number
  title: string
  author: string
  publication: string
  published_date: string
  content: string
  summary?: string
}

interface Props {
  article?: ArticleContent | null
  highlight?: string
  onClose: () => void
}

function highlightText(text: string, term?: string) {
  if (!term || !term.trim()) return text
  try {
    const rx = new RegExp(`(${term.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')})`, 'gi')
    return text.replace(rx, '<mark class="bg-yellow-500/40 text-white">$1</mark>')
  } catch { return text }
}

export const ArticleViewerModal: React.FC<Props> = ({ article, highlight, onClose }) => {
  if (!article) return null
  const content = highlightText(article.content || article.summary || '', highlight)
  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center">
      <div className="w-[95vw] max-w-3xl max-h-[85vh] overflow-y-auto bg-slate-900 border border-slate-700 rounded-xl shadow-xl">
        <div className="p-4 border-b border-slate-700 flex items-center justify-between">
          <div>
            <h3 className="text-xl font-semibold text-white">{article.title}</h3>
            <div className="text-slate-400 text-sm">{article.publication} • {new Date(article.published_date).toLocaleDateString()} • {article.author}</div>
          </div>
          <button className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-300" onClick={onClose}>Close</button>
        </div>
        <div className="p-4 prose prose-invert max-w-none">
          <div dangerouslySetInnerHTML={{ __html: content }} />
        </div>
      </div>
    </div>
  )
}

export default ArticleViewerModal