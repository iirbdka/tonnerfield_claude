"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { Loader2 } from "lucide-react"

const registerSchema = z.object({
  username: z.string().min(3, "아이디는 최소 3자 이상이어야 합니다").max(20, "아이디는 최대 20자까지 가능합니다"),
  password: z.string().min(8, "비밀번호는 최소 8자 이상이어야 합니다").max(64, "비밀번호는 최대 64자까지 가능합니다"),
  passwordConfirm: z.string(),
  name: z.string().min(1, "이름을 입력해주세요").max(50),
  gender: z.enum(["MALE", "FEMALE", "UNKNOWN"]).optional(),
  birthdate: z.string().optional(),
  phone: z.string().regex(/^010-\d{4}-\d{4}$/, "올바른 휴대폰 번호 형식이 아닙니다 (010-0000-0000)").optional().or(z.literal("")),
}).refine(data => data.password === data.passwordConfirm, {
  message: "비밀번호가 일치하지 않습니다",
  path: ["passwordConfirm"],
})

type RegisterForm = z.infer<typeof registerSchema>

export default function RegisterPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
  })

  const onSubmit = async (data: RegisterForm) => {
    setIsLoading(true)

    const response = await fetch("/api/auth/register", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        username: data.username,
        password: data.password,
        profile: {
          name: data.name,
          gender: data.gender || "UNKNOWN",
          birthdate: data.birthdate || null,
          phone: data.phone || null,
        },
      }),
    })

    const result = await response.json()

    if (!response.ok) {
      toast({
        title: "회원가입 실패",
        description: result.error?.message || "회원가입 중 오류가 발생했습니다.",
        variant: "destructive",
      })
      setIsLoading(false)
    } else {
      toast({
        title: "회원가입 완료",
        description: "회원가입이 완료되었습니다. 로그인 페이지로 이동합니다.",
      })
      setTimeout(() => {
        router.push("/auth/login")
      }, 1500)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center py-12">
      <Card className="w-[500px]">
        <CardHeader>
          <CardTitle>회원가입</CardTitle>
          <CardDescription>레슨 예약 시스템 계정을 생성합니다.</CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit(onSubmit)}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">아이디 <span className="text-destructive">*</span></Label>
              <Input
                id="username"
                type="text"
                placeholder="3~20자의 아이디"
                disabled={isLoading}
                {...register("username")}
              />
              {errors.username && (
                <p className="text-sm text-destructive">{errors.username.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">비밀번호 <span className="text-destructive">*</span></Label>
              <Input
                id="password"
                type="password"
                placeholder="8자 이상의 비밀번호"
                disabled={isLoading}
                {...register("password")}
              />
              {errors.password && (
                <p className="text-sm text-destructive">{errors.password.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="passwordConfirm">비밀번호 확인 <span className="text-destructive">*</span></Label>
              <Input
                id="passwordConfirm"
                type="password"
                placeholder="비밀번호를 다시 입력하세요"
                disabled={isLoading}
                {...register("passwordConfirm")}
              />
              {errors.passwordConfirm && (
                <p className="text-sm text-destructive">{errors.passwordConfirm.message}</p>
              )}
            </div>

            <div className="border-t pt-4">
              <h3 className="text-sm font-medium mb-4">기본 정보</h3>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">이름 <span className="text-destructive">*</span></Label>
                  <Input
                    id="name"
                    type="text"
                    placeholder="실명을 입력하세요"
                    disabled={isLoading}
                    {...register("name")}
                  />
                  {errors.name && (
                    <p className="text-sm text-destructive">{errors.name.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="gender">성별</Label>
                  <Select
                    disabled={isLoading}
                    onValueChange={(value) => setValue("gender", value as any)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="성별을 선택하세요" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="MALE">남성</SelectItem>
                      <SelectItem value="FEMALE">여성</SelectItem>
                      <SelectItem value="UNKNOWN">입력안함</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="birthdate">생년월일</Label>
                  <Input
                    id="birthdate"
                    type="date"
                    disabled={isLoading}
                    {...register("birthdate")}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">휴대폰 번호</Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="010-0000-0000"
                    disabled={isLoading}
                    {...register("phone")}
                  />
                  {errors.phone && (
                    <p className="text-sm text-destructive">{errors.phone.message}</p>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex flex-col space-y-4">
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              회원가입
            </Button>
            <div className="text-sm text-center text-muted-foreground">
              이미 계정이 있으신가요?{" "}
              <Link href="/auth/login" className="text-primary hover:underline">
                로그인
              </Link>
            </div>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}