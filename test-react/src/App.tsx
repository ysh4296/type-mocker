import { useState, useEffect } from "react"
import { fetchUsers, fetchPosts, fetchProducts, fetchOrders, fetchComments } from "./api"
import type { User, Post, Product, Order, Comment } from "./types"

const isMock = import.meta.env.VITE_MOCK === "true"

type Tab = "users" | "posts" | "products" | "orders" | "comments"

const TABS: { key: Tab; label: string; hasRealApi: boolean }[] = [
  { key: "users",    label: "Users",    hasRealApi: true  },
  { key: "posts",    label: "Posts",    hasRealApi: true  },
  { key: "products", label: "Products", hasRealApi: false },
  { key: "orders",   label: "Orders",   hasRealApi: false },
  { key: "comments", label: "Comments", hasRealApi: true  },
]

function useData<T>(fetcher: () => Promise<T[]>) {
  const [data,    setData]    = useState<T[]>([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    setError(null)
    fetcher()
      .then(setData)
      .catch(e => setError(e instanceof Error ? e.message : "Unknown error"))
      .finally(() => setLoading(false))
  }, [])

  return { data, loading, error }
}

function Table({ rows }: { rows: Record<string, unknown>[] }) {
  if (!rows.length) return <p style={s.empty}>데이터 없음 — mock 모드로 실행하세요: <code>npm run dev:mock</code></p>
  const keys = Object.keys(rows[0])
  return (
    <div style={s.tableWrap}>
      <table style={s.table}>
        <thead>
          <tr>{keys.map(k => <th key={k} style={s.th}>{k}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} style={i % 2 === 0 ? s.trEven : s.trOdd}>
              {keys.map(k => (
                <td key={k} style={s.td}>
                  {String(row[k]).slice(0, 60)}{String(row[k]).length > 60 ? "…" : ""}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function TabPanel({ tab }: { tab: Tab }) {
  const fetchers = {
    users:    fetchUsers,
    posts:    fetchPosts,
    products: fetchProducts,
    orders:   fetchOrders,
    comments: fetchComments,
  }
  const { data, loading, error } = useData(fetchers[tab] as () => Promise<Record<string, unknown>[]>)
  if (loading) return <p style={s.state}>불러오는 중...</p>
  if (error)   return <p style={{ ...s.state, color: "#e74c3c" }}>오류: {error}</p>
  return <Table rows={data} />
}

export default function App() {
  const [tab, setTab] = useState<Tab>("users")

  return (
    <div style={s.root}>
      <header style={s.header}>
        <h1 style={s.title}>ts-to-mock testbed</h1>
        <span style={isMock ? s.badgeMock : s.badgeReal}>
          {isMock ? "MOCK" : "REAL API"}
        </span>
      </header>

      <nav style={s.nav}>
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            style={tab === t.key ? { ...s.tabBtn, ...s.tabBtnActive } : s.tabBtn}
          >
            {t.label}
            {!t.hasRealApi && !isMock && <span style={s.noApi}> ⚠</span>}
          </button>
        ))}
      </nav>

      <main style={s.main}>
        <TabPanel key={tab} tab={tab} />
      </main>

      {!isMock && (
        <div style={s.hint}>
          💡 mock 모드로 실행하려면: <code>npm run dev:mock</code>
        </div>
      )}
    </div>
  )
}

const s = {
  root:    { fontFamily: "system-ui, sans-serif", maxWidth: 960, margin: "0 auto", padding: 24 },
  header:  { display: "flex", alignItems: "center", gap: 16, marginBottom: 24 },
  title:   { margin: 0, fontSize: 24, fontWeight: 700 },
  badgeMock: {
    padding: "4px 12px", borderRadius: 999, fontSize: 13, fontWeight: 600,
    background: "#e8f5e9", color: "#2e7d32", border: "1px solid #a5d6a7",
  },
  badgeReal: {
    padding: "4px 12px", borderRadius: 999, fontSize: 13, fontWeight: 600,
    background: "#e3f2fd", color: "#1565c0", border: "1px solid #90caf9",
  },
  nav:     { display: "flex", gap: 8, marginBottom: 20, borderBottom: "2px solid #eee", paddingBottom: 8 },
  tabBtn:  {
    padding: "8px 18px", border: "none", borderRadius: "6px 6px 0 0",
    cursor: "pointer", fontSize: 14, background: "transparent", color: "#666",
  },
  tabBtnActive: { background: "#3b82f6", color: "#fff", fontWeight: 600 },
  noApi:   { color: "#f59e0b" },
  main:    { minHeight: 400 },
  tableWrap: { overflowX: "auto" as const },
  table:   { width: "100%", borderCollapse: "collapse" as const, fontSize: 13 },
  th:      { padding: "10px 14px", background: "#f1f5f9", textAlign: "left" as const, fontWeight: 600, borderBottom: "2px solid #e2e8f0" },
  td:      { padding: "9px 14px", borderBottom: "1px solid #f1f5f9", verticalAlign: "top" as const },
  trEven:  { background: "#fff" },
  trOdd:   { background: "#fafafa" },
  state:   { color: "#64748b", fontSize: 14, padding: 20 },
  empty:   { color: "#94a3b8", fontSize: 14, padding: 20 },
  hint:    {
    marginTop: 24, padding: "12px 16px", background: "#fffbeb",
    border: "1px solid #fde68a", borderRadius: 8, fontSize: 13, color: "#92400e",
  },
} as const
