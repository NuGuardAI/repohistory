'use client'

import { useState, useTransition, useCallback } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { deleteLocalUser, listLocalUsers } from "@/actions/local-users"
import { AddLocalUserDialog } from "@/components/admin/add-local-user-dialog"
import { ResetPasswordDialog } from "@/components/admin/reset-password-dialog"
import { toast } from "sonner"
import { Trash2 } from "lucide-react"

type LocalUser = { id: string; username: string; created_by: string; created_at: string }

export function LocalUsersTable({ initialUsers }: { initialUsers: LocalUser[] }) {
  const [users, setUsers] = useState(initialUsers)
  const [isPending, startTransition] = useTransition()

  const refresh = useCallback(() => {
    startTransition(async () => {
      const updated = await listLocalUsers()
      setUsers(updated)
    })
  }, [])

  function handleDelete(id: string, username: string) {
    if (!confirm(`Delete user "${username}"?`)) return
    startTransition(async () => {
      try {
        await deleteLocalUser(id)
        setUsers(prev => prev.filter(u => u.id !== id))
        toast.success(`User "${username}" deleted`)
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to delete user")
      }
    })
  }

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <div>
          <CardTitle>Local Users</CardTitle>
          <CardDescription>Users who sign in with username and password</CardDescription>
        </div>
        <AddLocalUserDialog onCreated={refresh} />
      </CardHeader>
      <CardContent>
        {users.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">No local users yet.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Username</TableHead>
                <TableHead>Created by</TableHead>
                <TableHead>Created at</TableHead>
                <TableHead className="w-24 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map(user => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">{user.username}</TableCell>
                  <TableCell className="text-muted-foreground">{user.created_by}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {new Date(user.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-2">
                      <ResetPasswordDialog userId={user.id} username={user.username} />
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={isPending}
                        onClick={() => handleDelete(user.id, user.username)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}
