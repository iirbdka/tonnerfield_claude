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

interface Coach {
  id: string
  name: string
}

interface Branch {
  id: string
  name: string
}

interface Lesson {
  id: string
  name: string
  category: string
  description: string | null
  durationMinutes: number
  maxParticipants: number
  coach: Coach
  branch: Branch
  _count: {
    reservations: number
  }
}

export default function LessonsPage() {
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null)
  const [formData, setFormData] = useState({
    name: "",
    category: "FITNESS" as string,
    description: "",
    durationMinutes: 60,
    maxParticipants: 10,
    coachId: "",
    branchId: "",
  })

  const queryClient = useQueryClient()

  const { data: lessons, isLoading: isLoadingLessons } = useQuery<Lesson[]>({
    queryKey: ["admin", "lessons"],
    queryFn: async () => {
      const res = await fetch("/api/admin/lessons")
      if (!res.ok) throw new Error("Failed to fetch lessons")
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
      const res = await fetch("/api/admin/lessons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error?.message || "Failed to create lesson")
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "lessons"] })
      setIsCreateOpen(false)
      resetForm()
      toast({
        title: "성공",
        description: "레슨이 생성되었습니다.",
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
      const res = await fetch(`/api/admin/lessons/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error?.message || "Failed to update lesson")
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "lessons"] })
      setIsEditOpen(false)
      setSelectedLesson(null)
      resetForm()
      toast({
        title: "성공",
        description: "레슨 정보가 업데이트되었습니다.",
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
      const res = await fetch(`/api/admin/lessons/${id}`, {
        method: "DELETE",
      })
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error?.message || "Failed to delete lesson")
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "lessons"] })
      toast({
        title: "성공",
        description: "레슨이 삭제되었습니다.",
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
      category: "FITNESS",
      description: "",
      durationMinutes: 60,
      maxParticipants: 10,
      coachId: "",
      branchId: "",
    })
  }

  const handleCreate = () => {
    resetForm()
    setIsCreateOpen(true)
  }

  const handleEdit = (lesson: Lesson) => {
    setSelectedLesson(lesson)
    setFormData({
      name: lesson.name,
      category: lesson.category,
      description: lesson.description || "",
      durationMinutes: lesson.durationMinutes,
      maxParticipants: lesson.maxParticipants,
      coachId: lesson.coach.id,
      branchId: lesson.branch.id,
    })
    setIsEditOpen(true)
  }

  const handleDelete = (lesson: Lesson) => {
    if (confirm(`"${lesson.name}" 레슨을 삭제하시겠습니까?`)) {
      deleteMutation.mutate(lesson.id)
    }
  }

  const handleSubmitCreate = (e: React.FormEvent) => {
    e.preventDefault()
    createMutation.mutate(formData)
  }

  const handleSubmitEdit = (e: React.FormEvent) => {
    e.preventDefault()
    if (selectedLesson) {
      updateMutation.mutate({ id: selectedLesson.id, data: formData })
    }
  }

  const categoryLabels: Record<string, string> = {
    FITNESS: "피트니스",
    YOGA: "요가",
    PILATES: "필라테스",
    TENNIS: "테니스",
    GOLF: "골프",
    SWIMMING: "수영",
    OTHER: "기타",
  }

  if (isLoadingLessons) {
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
          <h1 className="text-3xl font-bold">레슨 관리</h1>
          <p className="text-muted-foreground mt-1">레슨 정보를 관리합니다</p>
        </div>
        <Button onClick={handleCreate}>
          <Plus className="w-4 h-4 mr-2" />
          레슨 추가
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>레슨 목록</CardTitle>
          <CardDescription>총 {lessons?.length || 0}개의 레슨</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>레슨명</TableHead>
                <TableHead>카테고리</TableHead>
                <TableHead>코치</TableHead>
                <TableHead>지점</TableHead>
                <TableHead>시간</TableHead>
                <TableHead>인원</TableHead>
                <TableHead>예약</TableHead>
                <TableHead className="text-right">작업</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lessons?.map((lesson) => (
                <TableRow key={lesson.id}>
                  <TableCell className="font-medium">{lesson.name}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{categoryLabels[lesson.category]}</Badge>
                  </TableCell>
                  <TableCell>{lesson.coach.name}</TableCell>
                  <TableCell>{lesson.branch.name}</TableCell>
                  <TableCell>{lesson.durationMinutes}분</TableCell>
                  <TableCell>{lesson.maxParticipants}명</TableCell>
                  <TableCell>{lesson._count.reservations}건</TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(lesson)}
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(lesson)}
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
            <DialogTitle>레슨 추가</DialogTitle>
            <DialogDescription>새로운 레슨을 등록합니다</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmitCreate}>
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">레슨명 *</Label>
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
                <Label htmlFor="category">카테고리 *</Label>
                <Select
                  value={formData.category}
                  onValueChange={(value) =>
                    setFormData({ ...formData, category: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="FITNESS">피트니스</SelectItem>
                    <SelectItem value="YOGA">요가</SelectItem>
                    <SelectItem value="PILATES">필라테스</SelectItem>
                    <SelectItem value="TENNIS">테니스</SelectItem>
                    <SelectItem value="GOLF">골프</SelectItem>
                    <SelectItem value="SWIMMING">수영</SelectItem>
                    <SelectItem value="OTHER">기타</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="coach">코치 *</Label>
                <Select
                  value={formData.coachId}
                  onValueChange={(value) =>
                    setFormData({ ...formData, coachId: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="코치 선택" />
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
                <Label htmlFor="branch">지점 *</Label>
                <Select
                  value={formData.branchId}
                  onValueChange={(value) =>
                    setFormData({ ...formData, branchId: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="지점 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    {branches?.map((branch) => (
                      <SelectItem key={branch.id} value={branch.id}>
                        {branch.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="duration">레슨 시간 (분) *</Label>
                  <Input
                    id="duration"
                    type="number"
                    min="30"
                    value={formData.durationMinutes}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        durationMinutes: parseInt(e.target.value),
                      })
                    }
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="maxParticipants">최대 인원 *</Label>
                  <Input
                    id="maxParticipants"
                    type="number"
                    min="1"
                    value={formData.maxParticipants}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        maxParticipants: parseInt(e.target.value),
                      })
                    }
                    required
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="description">설명</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  rows={3}
                />
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
            <DialogTitle>레슨 수정</DialogTitle>
            <DialogDescription>레슨 정보를 수정합니다</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmitEdit}>
            <div className="space-y-4">
              <div>
                <Label htmlFor="edit-name">레슨명 *</Label>
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
                <Label htmlFor="edit-category">카테고리 *</Label>
                <Select
                  value={formData.category}
                  onValueChange={(value) =>
                    setFormData({ ...formData, category: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="FITNESS">피트니스</SelectItem>
                    <SelectItem value="YOGA">요가</SelectItem>
                    <SelectItem value="PILATES">필라테스</SelectItem>
                    <SelectItem value="TENNIS">테니스</SelectItem>
                    <SelectItem value="GOLF">골프</SelectItem>
                    <SelectItem value="SWIMMING">수영</SelectItem>
                    <SelectItem value="OTHER">기타</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="edit-coach">코치 *</Label>
                <Select
                  value={formData.coachId}
                  onValueChange={(value) =>
                    setFormData({ ...formData, coachId: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="코치 선택" />
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
                <Label htmlFor="edit-branch">지점 *</Label>
                <Select
                  value={formData.branchId}
                  onValueChange={(value) =>
                    setFormData({ ...formData, branchId: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="지점 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    {branches?.map((branch) => (
                      <SelectItem key={branch.id} value={branch.id}>
                        {branch.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-duration">레슨 시간 (분) *</Label>
                  <Input
                    id="edit-duration"
                    type="number"
                    min="30"
                    value={formData.durationMinutes}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        durationMinutes: parseInt(e.target.value),
                      })
                    }
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="edit-maxParticipants">최대 인원 *</Label>
                  <Input
                    id="edit-maxParticipants"
                    type="number"
                    min="1"
                    value={formData.maxParticipants}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        maxParticipants: parseInt(e.target.value),
                      })
                    }
                    required
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="edit-description">설명</Label>
                <Textarea
                  id="edit-description"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  rows={3}
                />
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
