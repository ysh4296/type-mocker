import { UserRole, ProjectStatus, ProjectPriority, TaskStatus, NotificationType, WebhookEvent, type UserId, type TeamId, type ProjectId, type TaskId, type CommentId, type FileId, type SprintId, type UserStatus, type FileType, type SortOrder, type HttpMethod, type ThemeMode, type Timestamps, type Pagination, type Position, type User, type UserProfile, type UserPreferences, type LoginRequest, type LoginResponse, type AuthToken, type CreateUserRequest, type UpdateUserRequest, type Team, type TeamMember, type InviteRequest, type Project, type ProjectSummary, type CreateProjectRequest, type Label, type Task, type CreateTaskRequest, type UpdateTaskRequest, type Sprint, type Milestone, type Comment, type Reaction, type Attachment, type UploadResponse, type Notification, type AuditLog, type TaskMetrics, type Analytics, type ApiError, type ValidationError, type ApiResponse, type PaginatedResponse, type SearchResult, type SearchResponse, type Webhook, type Integration } from "../types/api"
import { type EventName, type NoneType, type MouseType, type JointType, type CreateType, type EventType, type CameraType, type ParticleCode, type defaultRegistryType, type GamePhase, type DamageTextType } from "../types/engine"
import { type OrderItem, type Order } from "../types/order"
import { type Product } from "../types/product"

export const mocks = {
  UserIdMock: "officiis" as UserId,
  TeamIdMock: "vicissitudo" as TeamId,
  ProjectIdMock: "clam" as ProjectId,
  TaskIdMock: "armarium" as TaskId,
  CommentIdMock: "delinquo" as CommentId,
  FileIdMock: "tergum" as FileId,
  SprintIdMock: "et" as SprintId,
  UserRoleMock: UserRole.Owner as UserRole,
  ProjectStatusMock: ProjectStatus.Completed as ProjectStatus,
  ProjectPriorityMock: ProjectPriority.High as ProjectPriority,
  TaskStatusMock: TaskStatus.Done as TaskStatus,
  NotificationTypeMock: NotificationType.Assignment as NotificationType,
  WebhookEventMock: WebhookEvent.TaskUpdated as WebhookEvent,
  UserStatusMock: "suspended" as UserStatus,
  FileTypeMock: "spreadsheet" as FileType,
  SortOrderMock: "asc" as SortOrder,
  HttpMethodMock: "PATCH" as HttpMethod,
  ThemeModeMock: "dark" as ThemeMode,
  TimestampsMock: {
    createdAt: "2026-05-27T23:11:35.512Z",
    updatedAt: "2026-05-27T20:51:16.768Z"
  } as Timestamps,
  PaginationMock: {
    page: 92,
    pageSize: 16,
    totalCount: 90,
    totalPages: 10,
    hasNext: true,
    hasPrev: false
  } as Pagination,
  PositionMock: {
    x: 87,
    y: 18
  } as Position,
  UserMock: {
    createdAt: "2026-05-28T00:20:11.006Z",
    updatedAt: "2026-05-27T19:05:13.839Z",
    id: "sortitus",
    email: "Muriel_McLaughlin@gmail.com",
    name: "Gerardo Simonis",
    username: "Kristian.Crona",
    role: UserRole.Guest,
    status: "active",
    timezone: "America/Yellowknife",
    locale: "fr-FR"
  } as User,
  UserProfileMock: {
    createdAt: "2026-05-27T18:25:41.060Z",
    updatedAt: "2026-05-27T21:21:47.360Z",
    id: "voluptas",
    email: "Sydnee_Monahan73@gmail.com",
    name: "Mack Turner",
    username: "Raphaelle53",
    role: UserRole.Owner,
    status: "active",
    timezone: "America/Argentina/Salta",
    locale: "en-US",
    jobTitle: "Corporate Research Director",
    preferences: {
      theme: "dark",
      emailNotifications: false,
      pushNotifications: false,
      weeklyDigest: false,
      language: "ko"
    }
  } as UserProfile,
  UserPreferencesMock: {
    theme: "system",
    emailNotifications: false,
    pushNotifications: true,
    weeklyDigest: true,
    language: "ko"
  } as UserPreferences,
  LoginRequestMock: {
    email: "Scot_Botsford@yahoo.com",
    password: "lIRK1ImUz36Z8Lh",
    remember: true
  } as LoginRequest,
  LoginResponseMock: {
    accessToken: "qnN1ok0iLVdshap7orVcJlU7YbwP0dyxMYk232Hx",
    refreshToken: "2HJySl84kEk6boUugRKJ4TwkQWv4WETWBaaOU0d1",
    expiresIn: 88,
    user: {
      createdAt: "2026-05-27T13:27:35.489Z",
      updatedAt: "2026-05-27T05:33:28.712Z",
      id: "saepe",
      email: "Alayna.Larson31@hotmail.com",
      name: "Brian Tromp",
      username: "Easter_Bogan15",
      role: UserRole.Admin,
      status: "inactive",
      timezone: "America/Campo_Grande",
      locale: "en-US"
    }
  } as LoginResponse,
  AuthTokenMock: {
    token: "gBXBBkHiD8P9Dh6qupLQLkInErVm10IKPZ5iensv",
    expiresAt: "2026-05-27T17:01:25.967Z",
    scope: [
      "vulgus"
    ]
  } as AuthToken,
  CreateUserRequestMock: {
    email: "Jake.Mosciski@gmail.com",
    name: "Doris Lebsack",
    username: "Uriel_Legros",
    role: UserRole.Member,
    password: "sJeCPOoCQ5cuwhv"
  } as CreateUserRequest,
  UpdateUserRequestMock: {
    name: "Erma Simonis",
    bio: "Cresco damno theologus dens sursum cupressus charisma sollers tondeo careo.",
    company: "Zieme - Harber",
    website: "https://showy-driveway.org/"
  } as UpdateUserRequest,
  TeamMock: {
    createdAt: "2026-05-28T01:43:20.076Z",
    updatedAt: "2026-05-27T20:54:24.368Z",
    id: "titulus",
    name: "Billie Littel",
    slug: "volutabrum-bestia",
    description: "Aeneus contigo ventus qui viduo bellum verecundia armarium sollicito argumentum.",
    avatarUrl: "https://likely-quest.biz",
    memberCount: 92,
    plan: "enterprise"
  } as Team,
  TeamMemberMock: {
    userId: "sto",
    teamId: "rem",
    role: UserRole.Member,
    joinedAt: "2026-05-27T20:09:20.910Z",
    user: {
      createdAt: "2026-05-27T17:23:32.932Z",
      updatedAt: "2026-05-27T18:38:36.152Z",
      id: "thymbra",
      email: "Owen.Weimann26@hotmail.com",
      name: "Marty Luettgen",
      username: "Paige30",
      avatarUrl: "https://huge-peen.net/",
      role: UserRole.Admin,
      status: "suspended",
      timezone: "Pacific/Pago_Pago",
      locale: "ja-JP"
    }
  } as TeamMember,
  InviteRequestMock: {
    email: "Maurine.McKenzie14@yahoo.com",
    role: UserRole.Guest,
    teamId: "verbum"
  } as InviteRequest,
  ProjectMock: {
    createdAt: "2026-05-27T04:48:41.895Z",
    updatedAt: "2026-05-27T17:57:17.224Z",
    id: "conitor",
    name: "Dwight Rice",
    description: "Aurum cenaculum capillus concedo xiphias cohaero substantia coniuratio molestiae truculenter.",
    status: ProjectStatus.Active,
    priority: ProjectPriority.High,
    teamId: "coma",
    ownerId: "cogito",
    startDate: "2026-05-27T12:25:10.538Z",
    dueDate: "2026-05-28T01:23:48.893Z",
    color: "azure",
    isPublic: true,
    taskCount: 49,
    memberIds: [
      "caritas",
      "averto"
    ]
  } as Project,
  ProjectSummaryMock: {
    id: "carpo",
    name: "Lorenzo Terry DVM",
    status: ProjectStatus.Active,
    priority: ProjectPriority.High,
    color: "fuchsia"
  } as ProjectSummary,
  CreateProjectRequestMock: {
    name: "Allison Kihn",
    description: "Testimonium theologus peior.",
    status: ProjectStatus.OnHold,
    priority: ProjectPriority.Medium,
    teamId: "amitto",
    ownerId: "tricesimus",
    dueDate: "2026-05-27T15:20:31.344Z",
    color: "turquoise",
    isPublic: false,
    memberIds: [
      "crebro",
      "aiunt"
    ]
  } as CreateProjectRequest,
  LabelMock: {
    id: "5da0631f-ade6-4fae-ab60-065fa8033831",
    name: "Andres Sauer",
    color: "grey"
  } as Label,
  TaskMock: {
    createdAt: "2026-05-27T20:27:14.799Z",
    updatedAt: "2026-05-27T15:21:52.364Z",
    id: "sperno",
    title: "carcer voluptates enim",
    status: TaskStatus.Cancelled,
    priority: ProjectPriority.High,
    projectId: "cetera",
    assigneeId: "damnatio",
    reporterId: "cenaculum",
    sprintId: "tremo",
    parentId: "quas",
    labels: [
      {
        id: "cbc5064d-55db-4921-b9fa-df87bd5c80c9",
        name: "Nancy Wintheiser-Nader PhD",
        color: "white"
      },
      {
        id: "805457b2-4ecb-4868-a984-e51337ea9cbb",
        name: "Eunice Rogahn",
        color: "cyan"
      },
      {
        id: "515ecb89-5e76-44ef-a9d8-799d66b84d87",
        name: "Clint Jacobson",
        color: "lavender"
      },
      {
        id: "ddff612d-89ef-4bac-af3d-e2c252acc750",
        name: "Colleen Cassin",
        color: "tan"
      }
    ],
    dueDate: "2026-05-27T16:58:12.230Z",
    estimatedHours: 50,
    loggedHours: 13,
    order: 90,
    attachments: [
      {
        id: "turba",
        name: "Austin Dicki",
        url: "https://vengeful-sandbar.name",
        size: 8,
        type: "other",
        uploadedBy: "quia",
        uploadedAt: "2026-05-27T04:37:15.485Z"
      },
      {
        id: "colo",
        name: "Amber Bashirian",
        url: "https://bogus-knuckle.name/",
        size: 77,
        type: "spreadsheet",
        uploadedBy: "succurro",
        uploadedAt: "2026-05-27T19:04:17.553Z"
      }
    ]
  } as Task,
  CreateTaskRequestMock: {
    title: "vetus autem aedificium",
    description: "Ulterius convoco tempus usque bardus talus.",
    status: TaskStatus.Cancelled,
    priority: ProjectPriority.Low,
    projectId: "cresco",
    dueDate: "2026-05-27T09:13:37.575Z",
    labels: [
      {
        id: "3be01d7d-6313-4eec-9b74-5327577107e8",
        name: "Allen D'Amore",
        color: "salmon"
      },
      {
        id: "80f7f359-767d-4f5e-a26c-619e1762a10c",
        name: "Lyle Predovic DVM",
        color: "teal"
      },
      {
        id: "a65d5bcd-ced5-4ec0-87e5-278167d3819e",
        name: "Israel O'Kon-Wuckert",
        color: "teal"
      }
    ]
  } as CreateTaskRequest,
  UpdateTaskRequestMock: {
    title: "tenus ratione ter",
    status: TaskStatus.Cancelled,
    priority: ProjectPriority.High,
    assigneeId: "arbitro",
    sprintId: "cenaculum",
    parentId: "venustas",
    labels: [
      {
        id: "5f8b7d78-d812-4deb-9658-9e5db4cceb90",
        name: "Armando Pacocha",
        color: "pink"
      },
      {
        id: "b5206f7b-10cd-4a9e-8782-0910eb7a9dc9",
        name: "Jeffery Lemke-Huel",
        color: "turquoise"
      }
    ],
    dueDate: "2026-05-27T15:38:09.352Z",
    estimatedHours: 51,
    loggedHours: 68,
    order: 32,
    attachments: [
      {
        id: "absconditus",
        name: "Kayla Bogan",
        url: "https://busy-girl.biz/",
        size: 15,
        type: "video",
        uploadedBy: "arbor",
        uploadedAt: "2026-05-27T05:17:46.875Z"
      },
      {
        id: "aggero",
        name: "Mr. Doug Goodwin-Ondricka",
        url: "https://greedy-surplus.org",
        size: 16,
        type: "spreadsheet",
        uploadedBy: "comparo",
        uploadedAt: "2026-05-27T23:17:27.122Z"
      }
    ]
  } as UpdateTaskRequest,
  SprintMock: {
    createdAt: "2026-05-27T09:23:32.578Z",
    updatedAt: "2026-05-27T19:22:16.839Z",
    id: "qui",
    name: "Wendell Cole",
    projectId: "repellat",
    startDate: "2026-05-28T02:16:28.185Z",
    endDate: "2026-05-27T09:54:43.598Z",
    goal: "combibo",
    isActive: true,
    velocity: 53
  } as Sprint,
  MilestoneMock: {
    createdAt: "2026-05-27T19:36:05.435Z",
    updatedAt: "2026-05-27T09:03:55.352Z",
    id: "16d9de61-f7f0-4ea4-96cb-ac75f7426bf7",
    title: "aqua anser stella",
    description: "Artificiose perferendis vulnero agnitio alveus nemo desipio terga.",
    projectId: "minus",
    dueDate: "2026-05-27T13:34:56.485Z",
    isCompleted: true,
    taskIds: [
      "labore",
      "degero",
      "tam"
    ]
  } as Milestone,
  CommentMock: {
    createdAt: "2026-05-27T07:37:45.499Z",
    updatedAt: "2026-05-27T06:15:38.073Z",
    id: "thorax",
    taskId: "adsidue",
    authorId: "debilito",
    body: "Terreo comptus aduro beneficium. Suggero vigor distinctio assentator thalassinus velum a. Quis arbustum fugiat.",
    author: {
      createdAt: "2026-05-27T22:20:49.576Z",
      updatedAt: "2026-05-27T19:24:23.517Z",
      id: "ipsum",
      email: "Emerald.Beatty17@yahoo.com",
      name: "Dr. Mark Daniel",
      username: "Jovani17",
      avatarUrl: "https://dirty-pegboard.biz",
      role: UserRole.Guest,
      status: "suspended",
      timezone: "America/Kentucky/Monticello",
      locale: "fr-FR"
    },
    reactions: [
      {
        emoji: "🧤",
        count: 88,
        userIds: [
          "cubo"
        ]
      },
      {
        emoji: "🍡",
        count: 20,
        userIds: [
          "abstergo"
        ]
      },
      {
        emoji: "⏱️",
        count: 78,
        userIds: [
          "urbanus",
          "pauci",
          "soleo"
        ]
      },
      {
        emoji: "🦚",
        count: 83,
        userIds: [
          "textilis",
          "adeo"
        ]
      }
    ],
    isEdited: false
  } as Comment,
  ReactionMock: {
    emoji: "🀄",
    count: 36,
    userIds: [
      "unus",
      "quis"
    ]
  } as Reaction,
  AttachmentMock: {
    id: "voveo",
    name: "Shawna Glover",
    url: "https://vapid-sphere.com",
    size: 89,
    type: "video",
    uploadedBy: "degusto",
    uploadedAt: "2026-05-27T16:36:42.854Z"
  } as Attachment,
  UploadResponseMock: {
    fileId: "ubi",
    url: "https://irritating-geek.info",
    fileName: "subiungo",
    size: 63,
    mimeType: "font/woff"
  } as UploadResponse,
  NotificationMock: {
    id: "d2fdf266-0509-4e9c-a9bc-6caa0436c5a1",
    type: NotificationType.DueDateReminder,
    userId: "sufficio",
    title: "textilis adimpleo tabgo",
    body: "Theologus arguo thema subiungo balbus unus spero. Ulciscor deduco ulterius. Caelum veritatis atque speciosus.",
    isRead: false,
    createdAt: "2026-05-27T20:01:14.041Z",
    meta: {}
  } as Notification,
  AuditLogMock: {
    createdAt: "2026-05-27T23:28:23.508Z",
    updatedAt: "2026-05-28T01:39:11.498Z",
    id: "6c2cd06e-ad0a-44cc-ac9d-bb36f631c107",
    actorId: "ipsam",
    action: "coruscus",
    resourceId: "b241a6fd-dc6c-4b1e-8daf-b2a9e12614ed",
    resourceType: "team",
    diff: {},
    ipAddress: "92.178.115.55"
  } as AuditLog,
  TaskMetricsMock: {
    total: 9,
    byStatus: {},
    byPriority: {},
    overdue: 42,
    completed: 29
  } as TaskMetrics,
  AnalyticsMock: {
    projectId: "coadunatio",
    period: "week",
    taskMetrics: {
      total: 86,
      byStatus: {},
      byPriority: {},
      overdue: 73,
      completed: 85
    },
    velocity: 10,
    burndownData: [
      {
        date: "perferendis",
        remaining: 23
      },
      {
        date: "angulus",
        remaining: 90
      },
      {
        date: "amet",
        remaining: 25
      },
      {
        date: "virga",
        remaining: 39
      }
    ]
  } as Analytics,
  ApiErrorMock: {
    code: "constans",
    message: "autem"
  } as ApiError,
  ValidationErrorMock: {
    field: "sol",
    message: "suasoria",
    value: "cubicularis"
  } as ValidationError,
  ApiResponseMock: {
    success: true,
    data: {},
    error: {
      code: "virga",
      message: "arbor",
      details: [
        {
          field: "voluptatibus",
          message: "cupio",
          value: "sed"
        },
        {
          field: "corroboro",
          message: "voco",
          value: "dolores"
        },
        {
          field: "cauda",
          message: "volva",
          value: "accusantium"
        },
        {
          field: "spero",
          message: "caute",
          value: "usque"
        }
      ]
    },
    meta: {}
  } as ApiResponse,
  PaginatedResponseMock: {
    items: [
      {},
      {},
      {},
      {}
    ],
    pagination: {
      page: 27,
      pageSize: 0,
      totalCount: 67,
      totalPages: 11,
      hasNext: true,
      hasPrev: true
    }
  } as PaginatedResponse,
  SearchResultMock: {
    type: "comment",
    id: "f65543e2-717a-4a17-8bb7-0d403db00a6c",
    title: "supplanto certe nulla",
    excerpt: "Spoliatio taceo coruscus commodo stabilis arceo benigne crustulum.",
    url: "https://sane-meat.net/",
    score: 47,
    highlight: [
      "utilis",
      "tergum",
      "atqui",
      "terga"
    ]
  } as SearchResult,
  SearchResponseMock: {
    query: "bis ventus",
    results: [
      {
        type: "task",
        id: "740dd900-a921-4cd0-bce4-a2f3e4b2cac3",
        title: "teres attollo cunabula",
        url: "https://supportive-frontier.org/",
        score: 9,
        highlight: [
          "statim",
          "volo",
          "vesco",
          "voco"
        ]
      },
      {
        type: "comment",
        id: "3e7ccf9f-834c-488c-a1bb-9c0e48a01435",
        title: "utpote odio brevis",
        excerpt: "Accusamus arbustum voro curso culpa articulus baiulus alias tametsi ait.",
        url: "https://feisty-cornflakes.com",
        score: 15,
        highlight: [
          "tergeo",
          "alias",
          "voluptates",
          "comedo"
        ]
      },
      {
        type: "task",
        id: "2c4f1192-f4a5-4745-967b-e33403bef178",
        title: "stillicidium perferendis ultra",
        url: "https://impressive-singer.org/",
        score: 13,
        highlight: [
          "solum"
        ]
      }
    ],
    total: 2,
    took: 72
  } as SearchResponse,
  WebhookMock: {
    createdAt: "2026-05-27T12:09:57.021Z",
    updatedAt: "2026-05-27T15:33:49.012Z",
    id: "41a25b06-8c62-4fd9-b59b-5aeb64903c3b",
    teamId: "caelestis",
    url: "https://third-western.net/",
    events: [
      WebhookEvent.TaskUpdated
    ],
    secret: "xkujN5JakQ74pD9HgGQ66Aj1KzFiXWC9",
    isActive: false
  } as Webhook,
  IntegrationMock: {
    createdAt: "2026-05-27T05:44:05.485Z",
    updatedAt: "2026-05-28T04:08:22.136Z",
    id: "36dc4ae3-3756-4613-9214-63a32ad41d7f",
    teamId: "decens",
    provider: "gitlab",
    name: "Otis Welch",
    config: {},
    isEnabled: true
  } as Integration,
  EventNameMock: "MOUSE" as EventName,
  NoneTypeMock: "NONE" as NoneType,
  MouseTypeMock: "NONE" as MouseType,
  JointTypeMock: "NONE" as JointType,
  CreateTypeMock: "MAGICIAN" as CreateType,
  EventTypeMock: "JOINT" as EventType,
  CameraTypeMock: {
    x: 31,
    y: 14,
    scale: 2
  } as CameraType,
  ParticleCodeMock: "curriculum" as ParticleCode,
  defaultRegistryTypeMock: {
    createdId: 40,
    selectedObjectId: 25,
    mouseEventType: "JOINT",
    setMouseEventType: () => {},
    jointEventType: "HINGE",
    createEventType: "NONE",
    animationOffset: 96,
    gamePhase: "pause",
    memory: {
      buffer: {
        byteLength: 64,
        slice: () => {}
      },
      grow: () => {}
    },
    gameTime: 13
  } as unknown as defaultRegistryType,
  GamePhaseMock: "play" as GamePhase,
  DamageTextTypeMock: {
    x: 55,
    y: 15,
    value: 49,
    alpha: 36,
    lifespan: 28,
    velocityY: 76
  } as DamageTextType,
  OrderItemMock: {
    productId: "87987255-c01d-4617-be40-12ac6998d645",
    quantity: 26,
    price: 22
  } as OrderItem,
  OrderMock: {
    id: "5a6abeaa-1d0e-4aea-bb09-d09151c85927",
    userId: "74768fe8-ed17-43d2-931c-5ac59f012f27",
    status: "cancelled",
    totalAmount: 33,
    currency: "USD",
    items: [
      {
        productId: "87ee471d-6113-4cb3-afd6-66a51c5a166f",
        quantity: 1,
        price: 67
      }
    ],
    createdAt: "2026-05-27T16:09:18.353Z"
  } as Order,
  ProductMock: {
    id: "97c7c54b-6bd8-4111-84f7-967322f7ca86",
    name: "Christy Gerhold IV",
    description: "Demum abutor caecus vilicus ventosus quibusdam defero.",
    price: 70,
    currency: "KRW",
    category: "clothing",
    inStock: true,
    tags: [
      "aeger",
      "speculum",
      "depraedor",
      "defero"
    ],
    createdAt: "2026-05-28T02:31:38.536Z"
  } as Product,
}