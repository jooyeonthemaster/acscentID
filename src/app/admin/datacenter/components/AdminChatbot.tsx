'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import {
  Plus,
  Send,
  Loader2,
  MessageSquare,
  Trash2,
  Pencil,
  Check,
  X,
  Bot,
  User,
  Database,
  ChevronDown,
  ChevronUp,
  Sparkles,
} from 'lucide-react'

// ============================================
// 타입
// ============================================
interface ChatSession {
  id: string
  title: string
  created_at: string
  updated_at: string
}

interface ChatMessage {
  id?: string
  role: 'user' | 'assistant'
  content: string
  sql_query?: string | null
  sql_result?: any
  created_at?: string
}

// ============================================
// 메인 컴포넌트
// ============================================
export default function AdminChatbot({ fullPage }: { fullPage?: boolean }) {
  const [sessions, setSessions] = useState<ChatSession[]>([])
  const [activeSession, setActiveSession] = useState<ChatSession | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [sessionsLoading, setSessionsLoading] = useState(true)
  const [editingTitle, setEditingTitle] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  // 세션 목록 로드
  useEffect(() => {
    fetchSessions()
  }, [])

  // 메시지 자동 스크롤
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const fetchSessions = async () => {
    setSessionsLoading(true)
    try {
      const res = await fetch('/api/admin/chat')
      if (!res.ok) return
      const json = await res.json()
      setSessions(json.sessions || [])
    } catch {
      // silent
    } finally {
      setSessionsLoading(false)
    }
  }

  const fetchMessages = async (sessionId: string) => {
    try {
      const res = await fetch(`/api/admin/chat?sessionId=${sessionId}`)
      if (!res.ok) return
      const json = await res.json()
      setMessages(json.messages || [])
    } catch {
      // silent
    }
  }

  const selectSession = (session: ChatSession) => {
    setActiveSession(session)
    fetchMessages(session.id)
  }

  const createSession = async () => {
    try {
      const res = await fetch('/api/admin/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'create_session' }),
      })
      if (!res.ok) return
      const json = await res.json()
      if (json.session) {
        setSessions((prev) => [json.session, ...prev])
        setActiveSession(json.session)
        setMessages([])
        inputRef.current?.focus()
      }
    } catch {
      // silent
    }
  }

  const renameSession = async (sessionId: string, title: string) => {
    try {
      await fetch('/api/admin/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'rename_session', sessionId, title }),
      })
      setSessions((prev) =>
        prev.map((s) => (s.id === sessionId ? { ...s, title } : s))
      )
      if (activeSession?.id === sessionId) {
        setActiveSession((prev) => prev ? { ...prev, title } : null)
      }
    } catch {
      // silent
    }
    setEditingTitle(null)
  }

  const deleteSession = async (sessionId: string) => {
    try {
      await fetch('/api/admin/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete_session', sessionId }),
      })
      setSessions((prev) => prev.filter((s) => s.id !== sessionId))
      if (activeSession?.id === sessionId) {
        setActiveSession(null)
        setMessages([])
      }
    } catch {
      // silent
    }
  }

  const sendMessage = async () => {
    if (!input.trim() || loading) return

    let session = activeSession

    // 세션이 없으면 자동 생성
    if (!session) {
      try {
        const res = await fetch('/api/admin/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'create_session', title: input.slice(0, 30) }),
        })
        if (!res.ok) return
        const json = await res.json()
        session = json.session
        setSessions((prev) => [json.session, ...prev])
        setActiveSession(json.session)
      } catch {
        return
      }
    }

    const userMessage: ChatMessage = { role: 'user', content: input }
    setMessages((prev) => [...prev, userMessage])
    setInput('')
    setLoading(true)

    try {
      const res = await fetch('/api/admin/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: session!.id, message: input }),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || '응답 실패')
      }

      const json = await res.json()
      const assistantMessage: ChatMessage = {
        role: 'assistant',
        content: json.response.content,
        sql_query: json.response.sql_query,
        sql_result: json.response.sql_result,
      }
      setMessages((prev) => [...prev, assistantMessage])

      // 첫 메시지면 세션 이름 자동 설정
      if (messages.length === 0) {
        const autoTitle = input.slice(0, 30) + (input.length > 30 ? '...' : '')
        renameSession(session!.id, autoTitle)
      }
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: `오류가 발생했습니다: ${err.message}` },
      ])
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  return (
    <div className={`flex bg-white rounded-xl border-2 border-slate-200 overflow-hidden shadow-[3px_3px_0px_#e2e8f0] ${
      fullPage ? 'h-[calc(100vh-160px)]' : 'h-[calc(100vh-280px)] min-h-[500px]'
    }`}>
      {/* 사이드바 - 세션 목록 */}
      <div className="w-64 border-r-2 border-slate-200 flex flex-col bg-slate-50">
        <div className="p-3 border-b border-slate-200">
          <button
            onClick={createSession}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-900 text-white rounded-lg font-medium hover:bg-slate-800 transition-colors shadow-[2px_2px_0px_#fbbf24]"
          >
            <Plus className="w-4 h-4" />
            새 채팅
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {sessionsLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
            </div>
          ) : sessions.length === 0 ? (
            <div className="text-center py-8 text-xs text-slate-400">
              채팅이 없습니다
            </div>
          ) : (
            sessions.map((session) => (
              <div
                key={session.id}
                className={`group relative rounded-lg transition-colors ${
                  activeSession?.id === session.id
                    ? 'bg-white border border-slate-300 shadow-sm'
                    : 'hover:bg-white/70'
                }`}
              >
                {editingTitle === session.id ? (
                  <div className="flex items-center gap-1 p-2">
                    <input
                      type="text"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') renameSession(session.id, editTitle)
                        if (e.key === 'Escape') setEditingTitle(null)
                      }}
                      className="flex-1 text-xs px-2 py-1 border border-slate-300 rounded"
                      autoFocus
                    />
                    <button onClick={() => renameSession(session.id, editTitle)} className="p-1 text-green-600 hover:bg-green-50 rounded">
                      <Check className="w-3 h-3" />
                    </button>
                    <button onClick={() => setEditingTitle(null)} className="p-1 text-slate-400 hover:bg-slate-100 rounded">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => selectSession(session)}
                    className="w-full text-left p-2.5 pr-14"
                  >
                    <div className="text-xs font-medium text-slate-700 truncate">
                      {session.title}
                    </div>
                    <div className="text-[10px] text-slate-400 mt-0.5">
                      {new Date(session.updated_at).toLocaleDateString('ko-KR')}
                    </div>
                  </button>
                )}

                {editingTitle !== session.id && (
                  <div className="absolute right-1 top-1/2 -translate-y-1/2 hidden group-hover:flex items-center gap-0.5">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setEditingTitle(session.id)
                        setEditTitle(session.title)
                      }}
                      className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded"
                    >
                      <Pencil className="w-3 h-3" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        if (confirm('이 채팅을 삭제하시겠습니까?')) deleteSession(session.id)
                      }}
                      className="p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* 채팅 영역 */}
      <div className="flex-1 flex flex-col">
        {/* 헤더 */}
        <div className="px-5 py-3 border-b border-slate-200 bg-gradient-to-r from-slate-50 to-white flex items-center gap-2">
          <Bot className="w-5 h-5 text-slate-500" />
          <div>
            <h2 className="text-sm font-bold text-slate-900">
              {activeSession?.title || 'AI 데이터 분석봇'}
            </h2>
            <p className="text-[10px] text-slate-500">
              Gemini 기반 · 전체 DB 읽기 전용 접근
            </p>
          </div>
        </div>

        {/* 메시지 영역 */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {messages.length === 0 && !loading && (
            <EmptyState onExample={(q) => { setInput(q); inputRef.current?.focus() }} />
          )}

          {messages.map((msg, idx) => (
            <MessageBubble key={idx} message={msg} />
          ))}

          {loading && (
            <div className="flex items-start gap-3">
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center flex-shrink-0">
                <Bot className="w-4 h-4 text-white" />
              </div>
              <div className="flex items-center gap-2 px-4 py-3 bg-slate-50 rounded-2xl rounded-tl-sm">
                <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
                <span className="text-sm text-slate-500">분석 중...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* 입력 영역 */}
        <div className="p-4 border-t border-slate-200 bg-white">
          <div className="flex gap-2 items-end">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="질문을 입력하세요... (예: 이번 달 매출이 얼마야?)"
              rows={1}
              className="flex-1 resize-none px-4 py-2.5 border-2 border-slate-200 rounded-xl text-sm focus:outline-none focus:border-slate-400 transition-colors"
              style={{ maxHeight: 120, minHeight: 42 }}
              onInput={(e) => {
                const target = e.target as HTMLTextAreaElement
                target.style.height = 'auto'
                target.style.height = Math.min(target.scrollHeight, 120) + 'px'
              }}
            />
            <button
              onClick={sendMessage}
              disabled={!input.trim() || loading}
              className="px-4 py-2.5 bg-slate-900 text-white rounded-xl hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-[2px_2px_0px_#fbbf24]"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
          <p className="text-[10px] text-slate-400 mt-1.5 text-center">
            Shift+Enter로 줄바꿈 · 읽기 전용 (데이터 변경 불가)
          </p>
        </div>
      </div>
    </div>
  )
}

// ============================================
// 빈 상태 (예시 질문)
// ============================================
function EmptyState({ onExample }: { onExample: (q: string) => void }) {
  const examples = [
    { icon: '💰', label: '매출 분석', query: '이번 달 매출이 얼마야? 주문별로 정리해줘' },
    { icon: '📊', label: '사용자 통계', query: '최근 7일간 일별 방문자 수와 분석 횟수를 알려줘' },
    { icon: '🧴', label: '인기 향수', query: '가장 많이 추천된 향수 TOP 10과 각각의 추천 횟수를 알려줘' },
    { icon: '📦', label: '재고 현황', query: '현재 재고가 가장 적은 향료 5개와 최근 소진 속도를 알려줘' },
    { icon: '⭐', label: '리뷰 분석', query: '리뷰 평점 평균과 최근 리뷰 내용을 보여줘' },
    { icon: '🔄', label: '피드백 트렌드', query: '최근 30일간 피드백에서 가장 많이 추가된 향료와 평균 잔향률을 분석해줘' },
  ]

  return (
    <div className="flex flex-col items-center justify-center h-full py-12">
      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center mb-4 shadow-lg">
        <Sparkles className="w-8 h-8 text-white" />
      </div>
      <h3 className="text-lg font-bold text-slate-900 mb-1">AI 데이터 분석봇</h3>
      <p className="text-sm text-slate-500 mb-6">
        자연어로 질문하면 DB를 분석해서 답변합니다
      </p>
      <div className="grid grid-cols-2 gap-2 max-w-lg w-full">
        {examples.map((ex) => (
          <button
            key={ex.label}
            onClick={() => onExample(ex.query)}
            className="flex items-center gap-2 p-3 text-left bg-slate-50 hover:bg-slate-100 rounded-xl border border-slate-200 transition-colors"
          >
            <span className="text-lg">{ex.icon}</span>
            <div>
              <div className="text-xs font-medium text-slate-700">{ex.label}</div>
              <div className="text-[10px] text-slate-500 line-clamp-1">{ex.query}</div>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}

// ============================================
// 메시지 버블
// ============================================
function MessageBubble({ message }: { message: ChatMessage }) {
  const [showSql, setShowSql] = useState(false)
  const isUser = message.role === 'user'

  return (
    <div className={`flex items-start gap-3 ${isUser ? 'flex-row-reverse' : ''}`}>
      {/* 아바타 */}
      <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${
        isUser
          ? 'bg-slate-900'
          : 'bg-gradient-to-br from-cyan-400 to-blue-500'
      }`}>
        {isUser ? (
          <User className="w-4 h-4 text-white" />
        ) : (
          <Bot className="w-4 h-4 text-white" />
        )}
      </div>

      {/* 내용 */}
      <div className={`max-w-[80%] ${isUser ? 'text-right' : ''}`}>
        <div className={`inline-block px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
          isUser
            ? 'bg-slate-900 text-white rounded-tr-sm'
            : 'bg-slate-50 text-slate-800 rounded-tl-sm border border-slate-200'
        }`}>
          {isUser ? (
            <p className="whitespace-pre-wrap">{message.content}</p>
          ) : (
            <MarkdownContent content={message.content} />
          )}
        </div>

        {/* SQL 쿼리 토글 */}
        {message.sql_query && (
          <div className="mt-1.5">
            <button
              onClick={() => setShowSql(!showSql)}
              className="flex items-center gap-1 text-[10px] text-slate-400 hover:text-slate-600 transition-colors"
            >
              <Database className="w-3 h-3" />
              SQL 쿼리 {showSql ? '숨기기' : '보기'}
              {showSql ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
            {showSql && (
              <pre className="mt-1 p-3 bg-slate-900 text-green-400 text-[11px] rounded-lg overflow-x-auto max-h-40">
                {message.sql_query}
              </pre>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ============================================
// 간단한 마크다운 렌더러
// ============================================
function MarkdownContent({ content }: { content: string }) {
  // 간단한 마크다운 → HTML 변환
  const html = content
    // 볼드
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    // 코드블록
    .replace(/```([\s\S]*?)```/g, '<pre class="bg-slate-800 text-green-400 p-2 rounded-lg text-xs mt-1 mb-1 overflow-x-auto">$1</pre>')
    // 인라인 코드
    .replace(/`(.*?)`/g, '<code class="bg-slate-200 px-1 py-0.5 rounded text-xs">$1</code>')
    // 헤딩
    .replace(/^### (.*$)/gm, '<h4 class="font-bold text-slate-900 mt-2 mb-1">$1</h4>')
    .replace(/^## (.*$)/gm, '<h3 class="font-bold text-slate-900 text-base mt-2 mb-1">$1</h3>')
    // 테이블
    .replace(/\|(.+)\|/g, (match) => {
      const cells = match.split('|').filter(Boolean).map((c) => c.trim())
      if (cells.every((c) => /^[-:]+$/.test(c))) {
        return '' // 구분선 행 제거
      }
      const isHeader = cells.every((c) => c === c.toUpperCase() || /[가-힣]/.test(c))
      const tag = 'td'
      return `<tr>${cells.map((c) => `<${tag} class="border border-slate-200 px-2 py-1 text-xs">${c}</${tag}>`).join('')}</tr>`
    })
    // 리스트
    .replace(/^- (.*$)/gm, '<li class="ml-3 text-sm">• $1</li>')
    .replace(/^\d+\. (.*$)/gm, '<li class="ml-3 text-sm">$1</li>')
    // 줄바꿈
    .replace(/\n/g, '<br />')

  // 테이블 래핑
  const wrappedHtml = html.replace(
    /(<tr>.*?<\/tr>(?:<br \/>)?)+/g,
    (match) => `<table class="border-collapse w-full my-2">${match.replace(/<br \/>/g, '')}</table>`
  )

  return (
    <div
      className="whitespace-pre-wrap [&_table]:border [&_table]:border-slate-200 [&_table]:rounded [&_strong]:font-bold"
      dangerouslySetInnerHTML={{ __html: wrappedHtml }}
    />
  )
}
