import { redirect } from "next/navigation"
import { cookies } from "next/headers"
import LandingPage from "./landing/LandingPage"

const SESSION_COOKIE_NAMES = ["sintra.sid", "accessToken", "token"]

export default function Home() {
  const cookieStore = cookies()

  // Check all possible auth cookies (same as middleware.ts)
  const isAuthenticated = SESSION_COOKIE_NAMES.some(
    (name) => !!cookieStore.get(name)?.value
  )

  if (isAuthenticated) {
    redirect("/v4")
  }

  return <LandingPage />
}
