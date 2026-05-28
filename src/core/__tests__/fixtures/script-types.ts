/** Script file fixture — no import/export, so TypeScript treats all declarations as global */

interface ScriptUser {
  id:    string
  name:  string
  score: number
}

type ScriptPaginated = {
  items: ScriptUser[]
  total: number
}
