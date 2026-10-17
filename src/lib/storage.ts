export interface StoredUser {
  firstName: string
  lastName: string
  email: string
  gestures: string[]
  faceVector: number[]
}

export interface WelcomeSession {
  firstName: string
  lastName: string
  email: string
  gestures: string[]
  hasFaceId: boolean
}

const USER_KEY = "gesturepass:user"
const WELCOME_KEY = "gesturepass:welcome"

/** The account STAYS in localStorage — it's needed for future sign-ins. */
export function saveUser(user: StoredUser) {
  if (typeof window !== "undefined") {
    localStorage.setItem(USER_KEY, JSON.stringify(user))
  }
}

export function getUser(): StoredUser | null {
  if (typeof window === "undefined") return null
  try {
    const raw = localStorage.getItem(USER_KEY)
    return raw ? (JSON.parse(raw) as StoredUser) : null
  } catch {
    return null
  }
}

/** The welcome page gets a transient copy in sessionStorage (dies with the tab). */
export function startWelcomeSession(user: StoredUser) {
  if (typeof window === "undefined") return
  const session: WelcomeSession = {
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    gestures: user.gestures,
    hasFaceId: Array.isArray(user.faceVector) && user.faceVector.length > 0,
  }
  try {
    sessionStorage.setItem(WELCOME_KEY, JSON.stringify(session))
  } catch {}
}

export function getWelcomeSession(): WelcomeSession | null {
  if (typeof window === "undefined") return null
  try {
    const raw = sessionStorage.getItem(WELCOME_KEY)
    return raw ? (JSON.parse(raw) as WelcomeSession) : null
  } catch {
    return null
  }
}

export function endWelcomeSession() {
  if (typeof window !== "undefined") {
    try {
      sessionStorage.removeItem(WELCOME_KEY)
    } catch {}
  }
}