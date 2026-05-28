import { faker } from "@faker-js/faker"

/**
 * Maps exact field names to contextual faker generators.
 * When a TypeScript property matches one of these keys exactly,
 * the corresponding faker call is used instead of a generic lorem word.
 */
const STRING_HINTS: Record<string, () => string> = {
  // person
  name:         () => faker.person.fullName(),
  firstName:    () => faker.person.firstName(),
  lastName:     () => faker.person.lastName(),
  username:     () => faker.internet.userName(),
  jobTitle:     () => faker.person.jobTitle(),
  // contact
  email:        () => faker.internet.email(),
  phone:        () => faker.phone.number(),
  // text content
  description:  () => faker.lorem.sentence(),
  title:        () => faker.lorem.words(3),
  body:         () => faker.lorem.paragraph(),
  bio:          () => faker.lorem.sentence(),
  summary:      () => faker.lorem.sentence(),
  excerpt:      () => faker.lorem.sentence(),
  query:        () => faker.lorem.words(2),
  // location
  city:         () => faker.location.city(),
  address:      () => faker.location.streetAddress(),
  country:      () => faker.location.country(),
  timezone:     () => faker.location.timeZone(),
  // company / web
  company:      () => faker.company.name(),
  url:          () => faker.internet.url(),
  link:         () => faker.internet.url(),
  website:      () => faker.internet.url(),
  ip:           () => faker.internet.ip(),
  ipAddress:    () => faker.internet.ip(),
  // identifiers
  id:           () => faker.string.uuid(),
  slug:         () => faker.helpers.slugify(faker.lorem.words(2)).toLowerCase(),
  // auth tokens
  password:     () => faker.internet.password(),
  secret:       () => faker.string.alphanumeric(32),
  token:        () => faker.string.alphanumeric(40),
  accessToken:  () => faker.string.alphanumeric(40),
  refreshToken: () => faker.string.alphanumeric(40),
  hash:         () => faker.string.alphanumeric(40),
  // misc
  color:        () => faker.color.human(),
  locale:       () => faker.helpers.arrayElement(["en-US", "ko-KR", "ja-JP", "fr-FR", "de-DE"]),
  language:     () => faker.helpers.arrayElement(["en", "ko", "ja", "fr", "de"]),
  mimeType:     () => faker.system.mimeType(),
  version:      () => faker.system.semver(),
  emoji:        () => faker.internet.emoji(),
}

/**
 * Fallback suffix-based hints checked when no exact match is found.
 * e.g. `userId` ends with "Id" → UUID, `createdAt` ends with "At" → ISO date.
 */
const SUFFIX_HINTS: [string, () => string][] = [
  ["Id",   () => faker.string.uuid()],
  ["At",   () => faker.date.recent().toISOString()],
  ["Date", () => faker.date.recent().toISOString()],
  ["Url",  () => faker.internet.url()],
]

/**
 * Returns a contextually appropriate faker value for a given field name.
 * Resolution order: exact match → suffix match → lorem fallback.
 */
export function getStringHint(fieldName: string): string {
  const exact = STRING_HINTS[fieldName]
  if (exact) return exact()

  for (const [suffix, fn] of SUFFIX_HINTS) {
    if (fieldName.length > suffix.length && fieldName.endsWith(suffix)) return fn()
  }

  return faker.lorem.word()
}
