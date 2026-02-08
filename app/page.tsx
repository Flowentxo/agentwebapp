import { redirect } from "next/navigation"
import { cookies } from "next/headers"

export default function Home() {
  const cookieStore = cookies()
  const session = cookieStore.get('sintra.sid')

  if (session) {
    redirect("/v4")
  } else {
    redirect("/login")
  }
}
