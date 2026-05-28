import { createMock, createMockList } from "unplugin-ts-mock"
import type { User, Post, PaginatedUsers } from "./types"
import "./style.css"

function render() {
  const user          = createMock<User>()
  const post          = createMock<Post>()
  const page          = createMock<PaginatedUsers>()
  const users         = createMockList<User>(3)

  const app = document.getElementById("app")!
  app.innerHTML = ""

  const sections: { label: string; code: string; data: unknown }[] = [
    {
      label: "User",
      code:  "createMock<User>()",
      data:  user,
    },
    {
      label: "Post",
      code:  "createMock<Post>()",
      data:  post,
    },
    {
      label: "PaginatedUsers",
      code:  "createMock<PaginatedUsers>()",
      data:  page,
    },
    {
      label: "User × 3",
      code:  "createMockList<User>(3)",
      data:  users,
    },
  ]

  for (const { label, code, data } of sections) {
    const card = document.createElement("section")
    card.className = "card"
    card.innerHTML = `
      <div class="card-header">
        <span class="type-label">${label}</span>
        <code class="call">${code}</code>
      </div>
      <pre class="json">${highlight(JSON.stringify(data, null, 2))}</pre>
    `
    app.appendChild(card)
  }
}

function highlight(json: string): string {
  return json
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"([^"]+)":/g, '<span class="key">"$1"</span>:')
    .replace(/: "([^"]*)"/g, ': <span class="string">"$1"</span>')
    .replace(/: (true|false)/g, ': <span class="bool">$1</span>')
    .replace(/: (\d+(\.\d+)?)/g, ': <span class="num">$1</span>')
    .replace(/: (null)/g, ': <span class="null">$1</span>')
}

render()

document.getElementById("reload")!.addEventListener("click", render)
