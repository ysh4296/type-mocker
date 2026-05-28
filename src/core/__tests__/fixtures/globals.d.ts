/** Global ambient type fixtures — no export keyword, simulating Next.js / project-wide .d.ts files */

declare interface GlobalUser {
  id:    string
  name:  string
  score: number
}

declare type GlobalPaginated = {
  items: GlobalUser[]
  total: number
  page:  number
}

declare interface GlobalNested {
  user:   GlobalUser
  label:  string
  active: boolean
}
