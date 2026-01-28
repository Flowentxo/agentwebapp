"use client";

/**
 * ENTERPRISE USER MANAGEMENT COMPONENT
 * Real database integration with proper modal handling
 */

import { useState, useEffect, useCallback } from "react";
import { Edit, Trash2, Plus, Shield, UserCheck, UserX, Key, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

type UserRole = "admin" | "editor" | "reviewer" | "user";
type UserStatus = "active" | "inactive";

interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  roles?: string[];
  status: UserStatus;
  emailVerified?: boolean;
  activeSessions?: number;
  mfaEnabled?: boolean;
  avatarUrl?: string | null;
  createdAt: string;
  updatedAt?: string;
}

const ROLE_PERMISSIONS: Record<UserRole, string[]> = {
  admin: ["Vollzugriff", "Benutzerverwaltung", "System-Konfiguration", "Audit-Logs"],
  editor: ["Inhalte erstellen", "Inhalte bearbeiten", "Knowledge Base"],
  reviewer: ["Inhalte prüfen", "Kommentare", "Workflow-Freigabe"],
  user: ["Lesen", "Eigene Inhalte bearbeiten"],
};

export function UserManagement() {
  const [users, setUsers] = useState<User[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const fetchUsers = useCallback(async () => {
    setRefreshing(true);
    try {
      const res = await fetch("/api/admin/users");
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      const data = await res.json();
      setUsers(data.users || []);
    } catch (error) {
      console.error("[UserManagement] Failed to fetch users:", error);
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleOpenDialog = (user: User | null = null) => {
    setEditingUser(user);
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingUser(null);
  };

  const handleSave = async (userData: Partial<User> & { password?: string }) => {
    setLoading(true);
    try {
      const method = editingUser ? "PUT" : "POST";
      const body = editingUser
        ? { id: editingUser.id, ...userData }
        : userData;

      const res = await fetch("/api/admin/users", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        await fetchUsers();
        handleCloseDialog();
      } else {
        const error = await res.json();
        alert(`Fehler: ${error.error || 'Unbekannter Fehler'}`);
      }
    } catch (error) {
      console.error("[UserManagement] Save error:", error);
      alert("Fehler beim Speichern");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (user: User) => {
    if (!confirm(`Benutzer "${user.name}" wirklich deaktivieren? Alle aktiven Sessions werden beendet.`)) {
      return;
    }

    try {
      const res = await fetch(`/api/admin/users?id=${user.id}`, { method: "DELETE" });
      if (res.ok) {
        await fetchUsers();
      } else {
        const error = await res.json();
        alert(`Fehler: ${error.error || 'Unbekannter Fehler'}`);
      }
    } catch (error) {
      console.error("[UserManagement] Delete error:", error);
      alert("Fehler beim Deaktivieren");
    }
  };

  const getRoleBadge = (role: UserRole) => {
    const variants: Record<UserRole, "default" | "success" | "warning" | "info"> = {
      admin: "success",
      editor: "info",
      reviewer: "warning",
      user: "default",
    };
    return <Badge variant={variants[role]}>{role.toUpperCase()}</Badge>;
  };

  const getStatusBadge = (status: UserStatus) => {
    return status === "active" ? (
      <Badge variant="success" className="flex items-center gap-1">
        <UserCheck className="h-3 w-3" />
        Aktiv
      </Badge>
    ) : (
      <Badge variant="warning" className="flex items-center gap-1">
        <UserX className="h-3 w-3" />
        Inaktiv
      </Badge>
    );
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("de-DE", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      });
    } catch {
      return "N/A";
    }
  };

  return (
    <div className="panel p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold text-text">Benutzerverwaltung</h2>
          <p className="text-sm text-text-muted">
            {users.length} Benutzer • Rollen und Berechtigungen verwalten
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={fetchUsers}
            disabled={refreshing}
            className="bg-surface-1 hover:bg-card/10"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          </Button>
          <Button onClick={() => handleOpenDialog(null)}>
            <Plus className="h-4 w-4 mr-2" />
            Neuer Benutzer
          </Button>
        </div>
      </div>

      <div className="hairline-b mb-4" />

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Benutzer</TableHead>
              <TableHead>Rolle</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Sessions</TableHead>
              <TableHead>Erstellt</TableHead>
              <TableHead className="text-right">Aktionen</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-text-muted">
                  {refreshing ? "Lade Benutzer..." : "Keine Benutzer gefunden"}
                </TableCell>
              </TableRow>
            ) : (
              users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center text-purple-400 font-medium">
                        {user.name?.charAt(0)?.toUpperCase() || "?"}
                      </div>
                      <div>
                        <p className="font-medium text-text">{user.name}</p>
                        <p className="text-xs text-text-muted mono">{user.email}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>{getRoleBadge(user.role)}</TableCell>
                  <TableCell>{getStatusBadge(user.status)}</TableCell>
                  <TableCell>
                    <span className="text-sm text-text-muted">
                      {user.activeSessions || 0} aktiv
                    </span>
                  </TableCell>
                  <TableCell className="text-sm text-text-muted">
                    {formatDate(user.createdAt)}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => handleOpenDialog(user)}
                        className="p-2 hover:bg-card/10 rounded transition-colors"
                        title="Bearbeiten"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(user)}
                        className="p-2 hover:bg-red-500/20 rounded text-red-400 transition-colors"
                        title="Deaktivieren"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* User Dialog */}
      <UserDialog
        open={dialogOpen}
        onClose={handleCloseDialog}
        user={editingUser}
        onSave={handleSave}
        loading={loading}
      />
    </div>
  );
}

function UserDialog({
  open,
  onClose,
  user,
  onSave,
  loading,
}: {
  open: boolean;
  onClose: () => void;
  user: User | null;
  onSave: (data: Partial<User> & { password?: string }) => void;
  loading: boolean;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<UserRole>("user");
  const [status, setStatus] = useState<UserStatus>("active");

  // Reset form when dialog opens/closes or user changes
  useEffect(() => {
    if (open) {
      if (user) {
        setName(user.name || "");
        setEmail(user.email || "");
        setPassword("");
        setRole(user.role || "user");
        setStatus(user.status || "active");
      } else {
        setName("");
        setEmail("");
        setPassword("");
        setRole("user");
        setStatus("active");
      }
    }
  }, [open, user]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const data: Partial<User> & { password?: string } = {
      name,
      email,
      role,
      status,
    };

    // Only include password for new users or if explicitly set
    if (!user && password) {
      data.password = password;
    }

    onSave(data);
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={user ? "Benutzer bearbeiten" : "Neuer Benutzer"}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-text mb-1">Name</label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            placeholder="Max Mustermann"
            autoFocus
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-text mb-1">E-Mail</label>
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder="max@example.com"
          />
        </div>

        {!user && (
          <div>
            <label className="block text-sm font-medium text-text mb-1 flex items-center gap-2">
              <Key className="h-4 w-4" />
              Passwort
            </label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required={!user}
              placeholder="Sicheres Passwort"
              minLength={8}
            />
            <p className="text-xs text-text-muted mt-1">
              Mindestens 8 Zeichen
            </p>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-text mb-1 flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Rolle
          </label>
          <Select value={role} onValueChange={(value) => setRole(value as UserRole)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="admin">Admin</SelectItem>
              <SelectItem value="editor">Editor</SelectItem>
              <SelectItem value="reviewer">Reviewer</SelectItem>
              <SelectItem value="user">User</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-text-muted mt-1">
            {ROLE_PERMISSIONS[role].join(" • ")}
          </p>
        </div>

        {user && (
          <div>
            <label className="block text-sm font-medium text-text mb-1">Status</label>
            <Select
              value={status}
              onValueChange={(value) => setStatus(value as UserStatus)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Aktiv</SelectItem>
                <SelectItem value="inactive">Inaktiv</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="flex items-center justify-end gap-2 pt-4 border-t border-white/10">
          <Button
            type="button"
            onClick={onClose}
            className="bg-card/10 hover:bg-card/20"
            disabled={loading}
          >
            Abbrechen
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? "Speichert..." : user ? "Speichern" : "Erstellen"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
