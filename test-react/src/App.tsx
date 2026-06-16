import { useState, useEffect } from "react"
import { fetchUsers }   from "./api/users"
import { fetchPosts }   from "./api/posts"
import { fetchProducts } from "./api/products"
import { fetchOrders }  from "./api/orders"
import { fetchComments } from "./api/comments"

const isMock = process.env.MOCK === "true"

type Tab = "users" | "posts" | "products" | "orders" | "comments"

const TABS: { key: Tab; label: string; hasRealApi: boolean }[] = [
  { key: "users",    label: "Users",    hasRealApi: true  },
  { key: "posts",    label: "Posts",    hasRealApi: true  },
  { key: "products", label: "Products", hasRealApi: false },
  { key: "orders",   label: "Orders",   hasRealApi: false },
  { key: "comments", label: "Comments", hasRealApi: true  },
]

const FETCHERS = { fetchUsers, fetchPosts, fetchProducts, fetchOrders, fetchComments }

function useData(tab: Tab) {
  const [data,    setData]    = useState<Record<string, unknown>[]>([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    setError(null)
    setData([])
    const key = `fetch${tab.charAt(0).toUpperCase() + tab.slice(1)}` as keyof typeof FETCHERS
    ;(FETCHERS[key]() as Promise<Record<string, unknown>[]>)
      .then(setData)
      .catch(e => setError(e instanceof Error ? e.message : String(e)))
      .finally(() => setLoading(false))
  }, [tab])

  return { data, loading, error }
}

function Table({ rows, tab }: { rows: Record<string, unknown>[]; tab: Tab }) {
  const info = TABS.find(t => t.key === tab)!
  if (!rows.length) {
    return (
      <p style={s.empty}>
        {!isMock && !info.hasRealApi
          ? "실제 API 없음 — npm run dev:mock 으로 실행하세요."
          : "데이터 없음"}
      </p>
    )
  }
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
  const { data, loading, error } = useData(tab)
  if (loading) return <p style={s.state}>불러오는 중...</p>
  if (error)   return <p style={{ ...s.state, color: "#e74c3c" }}>오류: {error}</p>
  return <Table rows={data} tab={tab} />
}

export default function App() {
  const [tab, setTab] = useState<Tab>("users")

  return (
    <div style={s.root}>
      <header style={s.header}>
        <h1 style={s.title}>ts-to-mock testbed</h1>
        <span style={isMock ? s.badgeMock : s.badgeReal}>
          {isMock ? "● MOCK" : "● REAL API"}
        </span>
      </header>

      {isMock && (
        <div style={s.mockBanner}>
          Mock 모드 — <code>ts-mock generate</code> 로 생성된 faker 데이터를 사용합니다.
        </div>
      )}

      <nav style={s.nav}>
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            style={tab === t.key ? { ...s.tabBtn, ...s.tabBtnActive } : s.tabBtn}
          >
            {t.label}
            {!t.hasRealApi && !isMock && <span style={{ color: "#f59e0b" }}> ⚠</span>}
          </button>
        ))}
      </nav>

      <main style={s.main}>
        <TabPanel key={tab} tab={tab} />
      </main>
    </div>
  )
}

const s = {
  root:        { fontFamily: "system-ui, sans-serif", maxWidth: 960, margin: "0 auto", padding: 24 },
  header:      { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 },
  title:       { margin: 0, fontSize: 22, fontWeight: 700 },
  badgeMock:   { padding: "4px 14px", borderRadius: 999, fontSize: 13, fontWeight: 700, background: "#dcfce7", color: "#15803d", border: "1px solid #86efac" },
  badgeReal:   { padding: "4px 14px", borderRadius: 999, fontSize: 13, fontWeight: 700, background: "#eff6ff", color: "#1d4ed8", border: "1px solid #93c5fd" },
  mockBanner:  { marginBottom: 16, padding: "10px 16px", borderRadius: 8, background: "#f0fdf4", border: "1px solid #86efac", fontSize: 13, color: "#166534" },
  nav:         { display: "flex", gap: 8, marginBottom: 20, borderBottom: "2px solid #f1f5f9", paddingBottom: 8 },
  tabBtn:      { padding: "8px 18px", border: "none", borderRadius: "6px 6px 0 0", cursor: "pointer", fontSize: 14, background: "transparent", color: "#64748b" },
  tabBtnActive: { background: "#3b82f6", color: "#fff", fontWeight: 600 },
  main:        { minHeight: 400 },
  tableWrap:   { overflowX: "auto" as const },
  table:       { width: "100%", borderCollapse: "collapse" as const, fontSize: 13 },
  th:          { padding: "10px 14px", background: "#f1f5f9", textAlign: "left" as const, fontWeight: 600, borderBottom: "2px solid #e2e8f0" },
  td:          { padding: "9px 14px", borderBottom: "1px solid #f1f5f9", verticalAlign: "top" as const },
  trEven:      { background: "#fff" },
  trOdd:       { background: "#fafafa" },
  state:       { color: "#64748b", fontSize: 14, padding: 20 },
  empty:       { color: "#94a3b8", fontSize: 14, padding: 20 },
} as const
