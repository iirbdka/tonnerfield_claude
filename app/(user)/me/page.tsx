"use client"

import { useSession } from "next-auth/react"
import { useQuery } from "@tanstack/react-query"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import {
  Calendar,
  CreditCard,
  User,
  Phone,
  Cake,
  Mail,
  Settings,
  FileText,
  MessageSquare,
  ChevronRight,
  Loader2,
} from "lucide-react"
import { format } from "date-fns"
import { ko } from "date-fns/locale"

interface UserProfile {
  id: string
  username: string
  role: string
  profile: {
    name: string
    gender: string
    birthdate: string | null
    phone: string | null
    avatarUrl: string | null
  }
  _count: {
    reservations: number
    memberships: number
  }
}

export default function MyPage() {
  const { data: session } = useSession()

  // Fetch user profile
  const { data: userProfile, isLoading } = useQuery<UserProfile>({
    queryKey: ['user-profile'],
    queryFn: async () => {
      const res = await fetch('/api/me/profile')
      if (!res.ok) throw new Error('Failed to fetch profile')
      return res.json()
    },
    enabled: !!session,
  })

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  if (!userProfile) {
    return null
  }

  const menuItems = [
    {
      title: "나의 레슨",
      description: `${userProfile._count.reservations}개의 예약`,
      href: "/me/reservations",
      icon: Calendar,
      color: "text-blue-600",
    },
    {
      title: "회원권 관리",
      description: `${userProfile._count.memberships}개의 회원권`,
      href: "/me/memberships",
      icon: CreditCard,
      color: "text-green-600",
    },
    {
      title: "공지사항",
      description: "새로운 소식 확인",
      href: "/announcements",
      icon: FileText,
      color: "text-purple-600",
    },
    {
      title: "1:1 문의",
      description: "도움이 필요하신가요?",
      href: "/support",
      icon: MessageSquare,
      color: "text-orange-600",
    },
  ]

  const genderLabel = {
    MALE: "남성",
    FEMALE: "여성",
    UNKNOWN: "미입력",
  }

  return (
    <div className="container mx-auto py-6 px-4 max-w-4xl">
      <h1 className="text-3xl font-bold mb-6">마이페이지</h1>

      {/* Profile Card */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-4">
              <Avatar className="h-20 w-20">
                {userProfile.profile.avatarUrl ? (
                  <AvatarImage src={userProfile.profile.avatarUrl} />
                ) : (
                  <AvatarFallback>
                    <User className="h-10 w-10" />
                  </AvatarFallback>
                )}
              </Avatar>
              <div>
                <CardTitle className="text-2xl">{userProfile.profile.name}</CardTitle>
                <CardDescription className="flex items-center gap-2 mt-1">
                  <Mail className="h-3 w-3" />
                  {userProfile.username}
                </CardDescription>
                {userProfile.role === "ADMIN" && (
                  <Badge className="mt-2">관리자</Badge>
                )}
              </div>
            </div>
            <Button variant="outline" size="sm">
              <Settings className="h-4 w-4 mr-2" />
              프로필 수정
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">성별:</span>
              <span className="font-medium">
                {genderLabel[userProfile.profile.gender as keyof typeof genderLabel]}
              </span>
            </div>
            {userProfile.profile.birthdate && (
              <div className="flex items-center gap-2">
                <Cake className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">생년월일:</span>
                <span className="font-medium">
                  {format(new Date(userProfile.profile.birthdate), 'yyyy.MM.dd')}
                </span>
              </div>
            )}
            {userProfile.profile.phone && (
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">연락처:</span>
                <span className="font-medium">{userProfile.profile.phone}</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              총 레슨 수
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{userProfile._count.reservations}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              보유 회원권
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{userProfile._count.memberships}</p>
          </CardContent>
        </Card>
      </div>

      {/* Menu Items */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {menuItems.map((item) => (
          <Link key={item.href} href={item.href}>
            <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={`p-2 rounded-lg bg-secondary ${item.color}`}>
                      <item.icon className="h-5 w-5" />
                    </div>
                    <div>
                      <CardTitle className="text-base">{item.title}</CardTitle>
                      <CardDescription className="text-xs mt-1">
                        {item.description}
                      </CardDescription>
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                </div>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>

      {/* Admin Access */}
      {userProfile.role === "ADMIN" && (
        <Card className="mt-6 border-primary">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              관리자 메뉴
            </CardTitle>
            <CardDescription>
              시스템 관리 페이지로 이동합니다
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/admin">
              <Button className="w-full">
                관리자 페이지로 이동
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  )
}