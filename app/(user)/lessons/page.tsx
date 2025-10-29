"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useInfiniteQuery } from "@tanstack/react-query"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2, Search } from "lucide-react"
import Link from "next/link"
import Image from "next/image"

interface Lesson {
  id: string
  name: string
  description: string
  thumbnailUrl: string | null
  category: string
  coach: {
    id: string
    name: string
  }
  branch: {
    id: string
    name: string
  }
}

export default function LessonsPage() {
  const [searchBy, setSearchBy] = useState<"lesson" | "coach" | "branch">("lesson")
  const [searchQuery, setSearchQuery] = useState("")
  const [debouncedQuery, setDebouncedQuery] = useState("")
  const observerTarget = useRef<HTMLDivElement>(null)

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery)
    }, 300)
    return () => clearTimeout(timer)
  }, [searchQuery])

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    status,
    error,
  } = useInfiniteQuery({
    queryKey: ["lessons", searchBy, debouncedQuery],
    queryFn: async ({ pageParam }) => {
      const params = new URLSearchParams({
        by: searchBy,
        q: debouncedQuery,
      })
      if (pageParam) {
        params.append("cursor", pageParam)
      }
      const response = await fetch(`/api/lessons?${params}`)
      if (!response.ok) {
        throw new Error("Failed to fetch lessons")
      }
      return response.json()
    },
    initialPageParam: null,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
  })

  // Intersection observer for infinite scroll
  const handleObserver = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      const [target] = entries
      if (target.isIntersecting && hasNextPage && !isFetchingNextPage) {
        fetchNextPage()
      }
    },
    [fetchNextPage, hasNextPage, isFetchingNextPage]
  )

  useEffect(() => {
    const element = observerTarget.current
    if (!element) return

    const observer = new IntersectionObserver(handleObserver, {
      threshold: 0.1,
    })
    observer.observe(element)

    return () => {
      if (element) observer.unobserve(element)
    }
  }, [handleObserver])

  const lessons = data?.pages.flatMap((page) => page.items) ?? []

  return (
    <div className="container mx-auto py-6 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">레슨 찾기</h1>
        <p className="text-muted-foreground">원하는 레슨을 검색하고 예약하세요</p>
      </div>

      {/* Search Bar */}
      <div className="mb-6 flex gap-2">
        <Select value={searchBy} onValueChange={(value: any) => setSearchBy(value)}>
          <SelectTrigger className="w-[150px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="lesson">레슨명</SelectItem>
            <SelectItem value="coach">코치명</SelectItem>
            <SelectItem value="branch">지점명</SelectItem>
          </SelectContent>
        </Select>
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            type="text"
            placeholder={`${
              searchBy === "lesson" ? "레슨명" : searchBy === "coach" ? "코치명" : "지점명"
            }으로 검색`}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Lessons Grid */}
      {status === "pending" ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      ) : status === "error" ? (
        <div className="text-center py-12">
          <p className="text-destructive">레슨을 불러오는 중 오류가 발생했습니다.</p>
        </div>
      ) : lessons.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">검색 결과가 없습니다.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {lessons.map((lesson: Lesson) => (
            <Link key={lesson.id} href={`/lessons/${lesson.id}`}>
              <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
                <div className="aspect-video relative bg-muted">
                  {lesson.thumbnailUrl ? (
                    <Image
                      src={lesson.thumbnailUrl}
                      alt={lesson.name}
                      fill
                      className="object-cover rounded-t-lg"
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full text-muted-foreground">
                      No Image
                    </div>
                  )}
                </div>
                <CardHeader>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                    <span className="px-2 py-1 bg-secondary rounded text-xs">
                      {lesson.category}
                    </span>
                  </div>
                  <CardTitle className="line-clamp-1">{lesson.name}</CardTitle>
                  <CardDescription className="line-clamp-2">
                    {lesson.description}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex justify-between text-sm">
                    <div>
                      <span className="text-muted-foreground">코치: </span>
                      <span className="font-medium">{lesson.coach.name}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">지점: </span>
                      <span className="font-medium">{lesson.branch.name}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}

      {/* Infinite Scroll Target */}
      <div ref={observerTarget} className="h-10" />

      {/* Loading More Indicator */}
      {isFetchingNextPage && (
        <div className="flex justify-center py-4">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      )}
    </div>
  )
}