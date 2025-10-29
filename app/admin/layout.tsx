"use client"

import { useSession } from "next-auth/react"
import { useRouter, usePathname } from "next/navigation"
import { useEffect } from "react"
import Link from "next/link"
import { cn } from "@/lib/utils"
import {
  Calendar,
  Home,
  MapPin,
  Users,
  BookOpen,
  UserCheck,
  CalendarDays,
  Settings,
  LogOut,
  Loader2
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { signOut } from "next-auth/react"

const sidebarItems = [
  {
    title: "대시보드",
    href: "/admin",
    icon: Home,
  },
  {
    title: "예약 관리",
    href: "/admin/reservations",
    icon: CalendarDays,
  },
  {
    title: "지점 관리",
    href: "/admin/branches",
    icon: MapPin,
  },
  {
    title: "코치 관리",
    href: "/admin/coaches",
    icon: UserCheck,
  },
  {
    title: "레슨 관리",
    href: "/admin/lessons",
    icon: BookOpen,
  },
  {
    title: "회원 관리",
    href: "/admin/users",
    icon: Users,
  },
  {
    title: "스케줄 관리",
    href: "/admin/schedules",
    icon: Calendar,
  },
]

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { data: session, status } = useSession()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (status === "loading") return
    if (!session || session.user.role !== "ADMIN") {
      router.push("/")
    }
  }, [session, status, router])

  if (status === "loading") {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  if (!session || session.user.role !== "ADMIN") {
    return null
  }

  return (
    <div className="flex h-screen">
      {/* Sidebar */}
      <aside className="w-64 bg-card border-r">
        <div className="flex h-full flex-col">
          {/* Logo */}
          <div className="flex items-center gap-2 border-b px-6 py-4">
            <Settings className="h-6 w-6 text-primary" />
            <span className="text-xl font-bold">Admin</span>
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-1 p-4">
            {sidebarItems.map((item) => {
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-secondary"
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  {item.title}
                </Link>
              )
            })}
          </nav>

          {/* User Info */}
          <div className="border-t p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">{session.user.username}</p>
                <p className="text-xs text-muted-foreground">관리자</p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => signOut()}
                className="h-8 w-8 p-0"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto bg-background">
        {children}
      </main>
    </div>
  )
}