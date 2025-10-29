"use client"

import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
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
import { Pencil, Trash2, Plus } from "lucide-react"

interface Branch {
  id: string
  name: string
}

interface Coach {
  id: string
  name: string
  gender: "MALE" | "FEMALE" | "OTHER"
  specialty: string
  bio: string | null
  branches: {
    branch: Branch
  }[]
  _count: {
    lessons: number
    reservations: number
  }
}

export default function CoachesPage() {
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [selectedCoach, setSelectedCoach] = useState<Coach | null>(null)
  const [formData, setFormData] = useState({
    name: "",
    gender: "MALE" as "MALE" | "FEMALE" | "OTHER",
    specialty: "",
    bio: "",
    branchIds: [] as string[],
  })

  const queryClient = useQueryClient()

  const { data: coaches, isLoading: isLoadingCoaches } = useQuery<Coach[]>({
    queryKey: ["admin", "coaches"],
    queryFn: async () => {
      const res = await fetch("/api/admin/coaches")
      if (!res.ok) throw new Error("Failed to fetch coaches")
      return res.json()
    },
  })

  const { data: branches } = useQuery<Branch[]>({
    queryKey: ["admin", "branches"],
    queryFn: async () => {
      const res = await fetch("/api/admin/branches")
      if (!res.ok) throw new Error("Failed to fetch branches")
      return res.json()
    },
  })

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const res = await fetch("/api/admin/coaches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error?.message || "Failed to create coach")
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "coaches"] })
      setIsCreateOpen(false)
      resetForm()
      toast({
        title: "성공",
        description: "코치가 생성되었습니다.",
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

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: typeof formData }) => {
      const res = await fetch(`/api/admin/coaches/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error?.message || "Failed to update coach")
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "coaches"] })
      setIsEditOpen(false)
      setSelectedCoach(null)
      resetForm()
      toast({
        title: "성공",
        description: "코치 정보가 업데이트되었습니다.",
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

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/admin/coaches/${id}`, {
        method: "DELETE",
      })
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error?.message || "Failed to delete coach")
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "coaches"] })
      toast({
        title: "성공",
        description: "코치가 삭제되었습니다.",
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

  const resetForm = () => {
    setFormData({
      name: "",
      gender: "MALE",
      specialty: "",
      bio: "",
      branchIds: [],
    })
  }

  const handleCreate = () => {
    resetForm()
    setIsCreateOpen(true)
  }

  const handleEdit = (coach: Coach) => {
    setSelectedCoach(coach)
    setFormData({
      name: coach.name,
      gender: coach.gender,
      specialty: coach.specialty,
      bio: coach.bio || "",
      branchIds: coach.branches.map((b) => b.branch.id),
    })
    setIsEditOpen(true)
  }

  const handleDelete = (coach: Coach) => {
    if (coach._count.lessons > 0 || coach._count.reservations > 0) {
      toast({
        variant: "destructive",
        title: "삭제 불가",
        description: "레슨이나 예약이 있는 코치는 삭제할 수 없습니다.",
      })
      return
    }

    if (confirm(`"${coach.name}" 코치를 삭제하시겠습니까?`)) {
      deleteMutation.mutate(coach.id)
    }
  }

  const handleSubmitCreate = (e: React.FormEvent) => {
    e.preventDefault()
    if (formData.branchIds.length === 0) {
      toast({
        variant: "destructive",
        title: "오류",
        description: "최소 1개 이상의 지점을 선택해야 합니다.",
      })
      return
    }
    createMutation.mutate(formData)
  }

  const handleSubmitEdit = (e: React.FormEvent) => {
    e.preventDefault()
    if (formData.branchIds.length === 0) {
      toast({
        variant: "destructive",
        title: "오류",
        description: "최소 1개 이상의 지점을 선택해야 합니다.",
      })
      return
    }
    if (selectedCoach) {
      updateMutation.mutate({ id: selectedCoach.id, data: formData })
    }
  }

  const toggleBranch = (branchId: string) => {
    setFormData((prev) => ({
      ...prev,
      branchIds: prev.branchIds.includes(branchId)
        ? prev.branchIds.filter((id) => id !== branchId)
        : [...prev.branchIds, branchId],
    }))
  }

  const genderLabels = {
    MALE: "남성",
    FEMALE: "여성",
    OTHER: "기타",
  }

  if (isLoadingCoaches) {
    return (
      <div className="container mx-auto py-8">
        <p>로딩 중...</p>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">코치 관리</h1>
          <p className="text-muted-foreground mt-1">코치 정보를 관리합니다</p>
        </div>
        <Button onClick={handleCreate}>
          <Plus className="w-4 h-4 mr-2" />
          코치 추가
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>코치 목록</CardTitle>
          <CardDescription>총 {coaches?.length || 0}명의 코치</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>이름</TableHead>
                <TableHead>성별</TableHead>
                <TableHead>전문분야</TableHead>
                <TableHead>소속 지점</TableHead>
                <TableHead>레슨</TableHead>
                <TableHead>예약</TableHead>
                <TableHead className="text-right">작업</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {coaches?.map((coach) => (
                <TableRow key={coach.id}>
                  <TableCell className="font-medium">{coach.name}</TableCell>
                  <TableCell>{genderLabels[coach.gender]}</TableCell>
                  <TableCell>{coach.specialty}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {coach.branches.map((b) => (
                        <Badge key={b.branch.id} variant="outline">
                          {b.branch.name}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>{coach._count.lessons}개</TableCell>
                  <TableCell>{coach._count.reservations}건</TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(coach)}
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(coach)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>코치 추가</DialogTitle>
            <DialogDescription>새로운 코치를 등록합니다</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmitCreate}>
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">이름 *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  required
                />
              </div>
              <div>
                <Label htmlFor="gender">성별 *</Label>
                <Select
                  value={formData.gender}
                  onValueChange={(value: "MALE" | "FEMALE" | "OTHER") =>
                    setFormData({ ...formData, gender: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MALE">남성</SelectItem>
                    <SelectItem value="FEMALE">여성</SelectItem>
                    <SelectItem value="OTHER">기타</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="specialty">전문 분야 *</Label>
                <Input
                  id="specialty"
                  value={formData.specialty}
                  onChange={(e) =>
                    setFormData({ ...formData, specialty: e.target.value })
                  }
                  required
                />
              </div>
              <div>
                <Label htmlFor="bio">소개</Label>
                <Textarea
                  id="bio"
                  value={formData.bio}
                  onChange={(e) =>
                    setFormData({ ...formData, bio: e.target.value })
                  }
                  rows={3}
                />
              </div>
              <div>
                <Label>소속 지점 *</Label>
                <div className="space-y-2 mt-2">
                  {branches?.map((branch) => (
                    <div key={branch.id} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id={`branch-${branch.id}`}
                        checked={formData.branchIds.includes(branch.id)}
                        onChange={() => toggleBranch(branch.id)}
                        className="rounded"
                      />
                      <Label htmlFor={`branch-${branch.id}`}>{branch.name}</Label>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <DialogFooter className="mt-6">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsCreateOpen(false)}
              >
                취소
              </Button>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? "생성 중..." : "생성"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>코치 수정</DialogTitle>
            <DialogDescription>코치 정보를 수정합니다</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmitEdit}>
            <div className="space-y-4">
              <div>
                <Label htmlFor="edit-name">이름 *</Label>
                <Input
                  id="edit-name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  required
                />
              </div>
              <div>
                <Label htmlFor="edit-gender">성별 *</Label>
                <Select
                  value={formData.gender}
                  onValueChange={(value: "MALE" | "FEMALE" | "OTHER") =>
                    setFormData({ ...formData, gender: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MALE">남성</SelectItem>
                    <SelectItem value="FEMALE">여성</SelectItem>
                    <SelectItem value="OTHER">기타</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="edit-specialty">전문 분야 *</Label>
                <Input
                  id="edit-specialty"
                  value={formData.specialty}
                  onChange={(e) =>
                    setFormData({ ...formData, specialty: e.target.value })
                  }
                  required
                />
              </div>
              <div>
                <Label htmlFor="edit-bio">소개</Label>
                <Textarea
                  id="edit-bio"
                  value={formData.bio}
                  onChange={(e) =>
                    setFormData({ ...formData, bio: e.target.value })
                  }
                  rows={3}
                />
              </div>
              <div>
                <Label>소속 지점 *</Label>
                <div className="space-y-2 mt-2">
                  {branches?.map((branch) => (
                    <div key={branch.id} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id={`edit-branch-${branch.id}`}
                        checked={formData.branchIds.includes(branch.id)}
                        onChange={() => toggleBranch(branch.id)}
                        className="rounded"
                      />
                      <Label htmlFor={`edit-branch-${branch.id}`}>{branch.name}</Label>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <DialogFooter className="mt-6">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsEditOpen(false)}
              >
                취소
              </Button>
              <Button type="submit" disabled={updateMutation.isPending}>
                {updateMutation.isPending ? "수정 중..." : "수정"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
