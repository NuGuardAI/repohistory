import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { listLocalUsers } from "@/actions/local-users"
import { LocalUsersTable } from "@/components/admin/local-users-table"
import { Navbar } from "@/components/layout/navbar"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Admin | Repohistory",
}

export default async function AdminUsersPage() {
  const session = await auth()
  if (!session?.isAdmin) redirect("/")

  const users = await listLocalUsers()

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <div className="container mx-auto p-4 sm:p-10 space-y-6 max-w-3xl">
        <div>
          <h1 className="text-2xl font-semibold">User Management</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage local users who can access the dashboard with a username and password.
          </p>
        </div>
        <LocalUsersTable initialUsers={users} />
      </div>
    </div>
  )
}
