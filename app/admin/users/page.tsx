"use client"

import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { toast } from "@/hooks/use-toast"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Search, CreditCard, User } from "lucide-react"
import { format } from "date-fns"

interface Coach {
  id: string
  name: string
}

interface Membership {
  id: string
  remainingMinutes: number
  expiresAt: string
  active: boolean
  coach: Coach
}

interface UserData {
  id: string
  email: string
  role: string
  profile: {
    name: string
    phone: string | null
  } | null
  memberships: Membership[]
  _count: {
    reservations: number
    memberships: number
  }
}

export default function UsersPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [isIssueMembershipOpen, setIsIssueMembershipOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState<UserData | null>(null)
  const [membershipForm, setMembershipForm] = useState({
    coachId: "",
    remainingMinutes: 600, // 10 hours default
    expiresAt: "",
  })

  const queryClient = useQueryClient()

  const { data: users, isLoading } = useQuery<UserData[]>({
    queryKey: ["admin", "users", searchQuery],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (searchQuery) params.append("search", searchQuery)
      const res = await fetch(`/api/admin/users?${params}`)
      if (!res.ok) throw new Error("Failed to fetch users")
      return res.json()
    },
  })

  const { data: coaches } = useQuery<Coach[]>({
    queryKey: ["admin", "coaches"],
    queryFn: async () => {
      const res = await fetch("/api/admin/coaches")
      if (!res.ok) throw new Error("Failed to fetch coaches")
      return res.json()
    },
  })

  const issueMembershipMutation = useMutation({
    mutationFn: async ({ userId, data }: { userId: string; data: typeof membershipForm }) => {
      const res = await fetch(`/api/admin/users/${userId}/memberships`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error?.message || "Failed to issue membership")
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] })
      setIsIssueMembershipOpen(false)
      setSelectedUser(null)
      resetMembershipForm()
      toast({
        title: "성공",
        description: "회원권이 발급되었습니다.",
      })
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "오류",
        description: error.message,
      })
    },
  })

  const resetMembershipForm = () => {
    setMembershipForm({
      coachId: "",
      remainingMinutes: 600,
      expiresAt: "",
    })
  }

  const handleIssueMembership = (user: UserData) => {
    setSelectedUser(user)
    resetMembershipForm()
    // Set default expiry to 3 months from now
    const defaultExpiry = new Date()
    defaultExpiry.setMonth(defaultExpiry.getMonth() + 3)
    setMembershipForm((prev) => ({
      ...prev,
      expiresAt: defaultExpiry.toISOString().split("T")[0],
    }))
    setIsIssueMembershipOpen(true)
  }

  const handleSubmitMembership = (e: React.FormEvent) => {
    e.preventDefault()
    if (selectedUser) {
      issueMembershipMutation.mutate({
        userId: selectedUser.id,
        data: membershipForm,
      })
    }
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
  }

  if (isLoading) {
    return (
      <div className="container mx-auto py-8">
        <p>로딩 중...</p>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">회원 관리</h1>
        <p className="text-muted-foreground mt-1">회원 정보 및 회원권을 관리합니다</p>
      </div>

      {/* Search */}
      <Card>
        <CardHeader>
          <CardTitle>회원 검색</CardTitle>
          <CardDescription>이름, 이메일, 전화번호로 검색</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="회원 검색..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button type="submit">검색</Button>
          </form>
        </CardContent>
      </Card>

      {/* Users List */}
      <Card>
        <CardHeader>
          <CardTitle>회원 목록</CardTitle>
          <CardDescription>총 {users?.length || 0}명의 회원</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>이름</TableHead>
                <TableHead>이메일</TableHead>
                <TableHead>전화번호</TableHead>
                <TableHead>회원권</TableHead>
                <TableHead>예약</TableHead>
                <TableHead className="text-right">작업</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users?.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      {user.profile?.name || "이름 없음"}
                    </div>
                  </TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>{user.profile?.phone || "-"}</TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      {user.memberships.length > 0 ? (
                        user.memberships.map((membership) => (
                          <div key={membership.id} className="flex items-center gap-2">
                            <Badge variant={membership.active ? "default" : "secondary"}>
                              {membership.coach.name}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {Math.floor(membership.remainingMinutes / 60)}시간 {membership.remainingMinutes % 60}분
                            </span>
                          </div>
                        ))
                      ) : (
                        <span className="text-sm text-muted-foreground">회원권 없음</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>{user._count.reservations}건</TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleIssueMembership(user)}
                    >
                      <CreditCard className="w-4 h-4 mr-2" />
                      회원권 발급
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Issue Membership Dialog */}
      <Dialog open={isIssueMembershipOpen} onOpenChange={setIsIssueMembershipOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>회원권 발급</DialogTitle>
            <DialogDescription>
              {selectedUser?.profile?.name || selectedUser?.email}님에게 회원권을 발급합니다
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmitMembership}>
            <div className="space-y-4">
              <div>
                <Label htmlFor="coach">코치 선택 *</Label>
                <Select
                  value={membershipForm.coachId}
                  onValueChange={(value) =>
                    setMembershipForm({ ...membershipForm, coachId: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="코치를 선택하세요" />
                  </SelectTrigger>
                  <SelectContent>
                    {coaches?.map((coach) => (
                      <SelectItem key={coach.id} value={coach.id}>
                        {coach.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="remainingMinutes">레슨 시간 (분) *</Label>
                <Input
                  id="remainingMinutes"
                  type="number"
                  min="0"
                  step="30"
                  value={membershipForm.remainingMinutes}
                  onChange={(e) =>
                    setMembershipForm({
                      ...membershipForm,
                      remainingMinutes: parseInt(e.target.value),
                    })
                  }
                  required
                />
                <p className="text-xs text-muted-foreground mt-1">
                  약 {Math.floor(membershipForm.remainingMinutes / 60)}시간 {membershipForm.remainingMinutes % 60}분
                </p>
              </div>
              <div>
                <Label htmlFor="expiresAt">만료일 *</Label>
                <Input
                  id="expiresAt"
                  type="date"
                  value={membershipForm.expiresAt}
                  onChange={(e) =>
                    setMembershipForm({
                      ...membershipForm,
                      expiresAt: e.target.value,
                    })
                  }
                  required
                />
              </div>
              <div className="p-4 bg-muted rounded-lg">
                <h4 className="font-semibold mb-2">발급 정보 요약</h4>
                <ul className="space-y-1 text-sm">
                  <li>
                    <span className="text-muted-foreground">회원:</span>{" "}
                    {selectedUser?.profile?.name || selectedUser?.email}
                  </li>
                  <li>
                    <span className="text-muted-foreground">레슨 시간:</span>{" "}
                    {Math.floor(membershipForm.remainingMinutes / 60)}시간 {membershipForm.remainingMinutes % 60}분
                  </li>
                  {membershipForm.expiresAt && (
                    <li>
                      <span className="text-muted-foreground">만료일:</span>{" "}
                      {format(new Date(membershipForm.expiresAt), "yyyy년 MM월 dd일")}
                    </li>
                  )}
                </ul>
              </div>
            </div>
            <DialogFooter className="mt-6">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsIssueMembershipOpen(false)}
              >
                취소
              </Button>
              <Button type="submit" disabled={issueMembershipMutation.isPending}>
                {issueMembershipMutation.isPending ? "발급 중..." : "발급"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
