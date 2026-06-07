import { faker } from "@faker-js/faker"

const STRING_HINTS: Record<string, () => string> = {
  // person
  name:         () => faker.name.fullName(),
  firstName:    () => faker.name.firstName(),
  lastName:     () => faker.name.lastName(),
  username:     () => faker.internet.userName(),
  jobTitle:     () => faker.name.jobTitle(),
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
  city:         () => faker.address.city(),
  address:      () => faker.address.streetAddress(),
  country:      () => faker.address.country(),
  timezone:     () => faker.address.timeZone(),
  // company / web
  company:      () => faker.company.name(),
  url:          () => faker.internet.url(),
  link:         () => faker.internet.url(),
  website:      () => faker.internet.url(),
  ip:           () => faker.internet.ip(),
  ipAddress:    () => faker.internet.ip(),
  // identifiers
  id:           () => faker.datatype.uuid(),
  slug:         () => faker.helpers.slugify(faker.lorem.words(2)).toLowerCase(),
  // auth tokens
  password:     () => faker.internet.password(),
  secret:       () => faker.random.alphaNumeric(32),
  token:        () => faker.random.alphaNumeric(40),
  accessToken:  () => faker.random.alphaNumeric(40),
  refreshToken: () => faker.random.alphaNumeric(40),
  hash:         () => faker.random.alphaNumeric(40),
  // misc
  color:        () => faker.color.human(),
  locale:       () => faker.helpers.arrayElement(["en-US", "ko-KR", "ja-JP", "fr-FR", "de-DE"]),
  language:     () => faker.helpers.arrayElement(["en", "ko", "ja", "fr", "de"]),
  mimeType:     () => faker.system.mimeType(),
  version:      () => faker.system.semver(),
  emoji:        () => faker.helpers.arrayElement(["😊", "🎉", "🚀", "💡", "🔥", "✨", "🎯", "👍"]),
}

const SUFFIX_HINTS: [string, () => string][] = [
  ["Id",   () => faker.datatype.uuid()],
  ["At",   () => faker.date.recent().toISOString()],
  ["Date", () => faker.date.recent().toISOString()],
  ["Url",  () => faker.internet.url()],
]

export function getStringHint(fieldName: string): string {
  const exact = STRING_HINTS[fieldName]
  if (exact) return exact()

  for (const [suffix, fn] of SUFFIX_HINTS) {
    if (fieldName.length > suffix.length && fieldName.endsWith(suffix)) return fn()
  }

  return faker.lorem.word()
}
