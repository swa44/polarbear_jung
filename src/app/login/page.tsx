"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSessionStore } from "@/store/sessionStore";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import type { KeyboardEvent } from "react";

type Step = "info" | "otp" | "confirm";

export default function LoginPage() {
  const router = useRouter();
  const hydrated = useSessionStore((s) => s.hydrated);
  const savedName = useSessionStore((s) => s.name);
  const savedPhone = useSessionStore((s) => s.phone);
  const setSession = useSessionStore((s) => s.setSession);
  const clearSession = useSessionStore((s) => s.clearSession);

  const [step, setStep] = useState<Step>("info");
  const [imgIndex, setImgIndex] = useState(0);
  const IMAGES = Array.from(
    { length: 10 },
    (_, i) => `/main_images/jung_${i + 1}.webp`,
  );
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [confirmName, setConfirmName] = useState("");
  const [editingConfirmName, setEditingConfirmName] = useState(false);
  const [restoring, setRestoring] = useState(true);

  useEffect(() => {
    const timer = setInterval(() => {
      setImgIndex((prev) => (prev + 1) % IMAGES.length);
    }, 1500);
    return () => clearInterval(timer);
  }, [IMAGES.length]);

  useEffect(() => {
    let cancelled = false;

    const restoreSession = async () => {
      if (!hydrated) {
        return;
      }

      if (!savedPhone) {
        if (!cancelled) setRestoring(false);
        return;
      }

      try {
        const res = await fetch("/api/auth/restore-session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ phone: savedPhone }),
        });

        if (!res.ok) {
          clearSession();
          if (!cancelled) {
            setRestoring(false);
            if (savedName) setName(savedName);
            setPhone(savedPhone);
          }
          return;
        }

        const data = await res.json();
        if (cancelled) return;
        setSession(data.name, data.phone);
        router.replace("/select");
      } catch {
        clearSession();
        if (!cancelled) {
          setRestoring(false);
          if (savedName) setName(savedName);
          setPhone(savedPhone);
        }
      }
    };

    restoreSession();

    return () => {
      cancelled = true;
    };
  }, [clearSession, hydrated, router, savedName, savedPhone, setSession]);

  const handleSendOtp = async () => {
    console.log("handleSendOtp 시작됨");
    setError("");
    const cleanPhone = phone.replace(/-/g, "");
    console.log("입력 데이터:", { name, phone, cleanPhone });

    if (!name.trim()) {
      console.log("이름 검증 실패");
      return setError("이름을 입력해주세요.");
    }
    if (!/^01[0-9]{8,9}$/.test(cleanPhone)) {
      console.log("전화번호 검증 실패");
      return setError("올바른 전화번호를 입력해주세요.");
    }

    setLoading(true);
    console.log("API 호출 시도...");
    try {
      const res = await fetch("/api/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: cleanPhone }),
      });
      const data = await res.json();
      console.log("API 응답:", data);
      if (!res.ok) throw new Error(data.error);
      setStep("otp");
    } catch (e: unknown) {
      console.error("오류 발생:", e);
      setError(e instanceof Error ? e.message : "오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    setError("");
    if (!otp || otp.length !== 6)
      return setError("인증번호 6자리를 입력해주세요.");

    setLoading(true);
    let shouldUnlock = true;
    try {
      const res = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: phone.replace(/-/g, ""),
          code: otp,
          name,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      if (data.requiresNameConfirmation) {
        setConfirmName(data.name);
        setEditingConfirmName(false);
        setStep("confirm");
        return;
      }

      setSession(data.name, data.phone);
      shouldUnlock = false;
      router.push("/select");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "오류가 발생했습니다.");
    } finally {
      if (shouldUnlock) {
        setLoading(false);
      }
    }
  };

  const handleConfirmName = async () => {
    setError("");
    const trimmedName = confirmName.trim();
    if (!trimmedName) {
      return setError("이름을 입력해주세요.");
    }

    setLoading(true);
    let shouldUnlock = true;
    try {
      const res = await fetch("/api/auth/confirm-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmedName }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setSession(data.name, data.phone);
      shouldUnlock = false;
      router.push("/select");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "오류가 발생했습니다.");
    } finally {
      if (shouldUnlock) {
        setLoading(false);
      }
    }
  };

  const handleEnterAction = (
    e: KeyboardEvent<HTMLInputElement>,
    action: () => void,
  ) => {
    if (e.key !== "Enter") return;
    e.preventDefault();
    if (loading) return;
    action();
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Image Slideshow */}
        <div className="relative w-48 h-48 mb-6 rounded-2xl overflow-hidden bg-gray-100 mx-auto">
          {IMAGES.map((src, i) => (
            <img
              key={src}
              src={src}
              alt=""
              className="absolute inset-0 w-full h-full object-cover transition-opacity duration-1000"
              style={{ opacity: i === imgIndex ? 1 : 0 }}
            />
          ))}
        </div>

        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">
            JUNG SWITCH<br></br> 실시간 견적 시스템
          </h1>
          <p className="mt-2 text-gray-500 text-sm">주식회사 폴라베어</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          {restoring ? (
            <div className="flex flex-col items-center justify-center gap-4 py-10">
              <div className="w-8 h-8 border-2 border-gray-900 border-t-transparent rounded-full animate-spin" />
              <div className="text-center">
                <p className="text-sm font-medium text-gray-900">
                  로그인 상태 확인 중
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  저장된 로그인 정보를 불러오고 있습니다.
                </p>
              </div>
            </div>
          ) : step === "info" ? (
            <div className="flex flex-col gap-4">
              <h2 className="text-lg font-semibold text-gray-900">
                고객 정보 입력
              </h2>
              <Input
                label="이름"
                placeholder="홍길동"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="name"
              />
              <Input
                label="전화번호"
                placeholder="01012345678"
                type="tel"
                inputMode="numeric"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                autoComplete="tel"
                onKeyDown={(e) => handleEnterAction(e, handleSendOtp)}
              />
              {error && <p className="text-sm text-red-500">{error}</p>}
              <Button
                onClick={handleSendOtp}
                loading={loading}
                fullWidth
                size="lg"
                className="mt-2"
              >
                인증번호 받기
              </Button>
            </div>
          ) : step === "otp" ? (
            <div className="flex flex-col gap-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  인증번호 입력
                </h2>
                <p className="text-sm text-gray-500 mt-1">
                  <span className="font-medium text-gray-800">{phone}</span>으로
                  발송된
                  <br />
                  6자리 인증번호를 입력해주세요.
                </p>
              </div>
              <Input
                label="인증번호"
                placeholder="123456"
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                autoFocus
                onKeyDown={(e) => handleEnterAction(e, handleVerifyOtp)}
              />
              {error && <p className="text-sm text-red-500">{error}</p>}
              <Button
                onClick={handleVerifyOtp}
                loading={loading}
                fullWidth
                size="lg"
                className="mt-2"
              >
                확인
              </Button>
              <button
                onClick={() => {
                  setStep("info");
                  setOtp("");
                  setError("");
                }}
                className="text-sm text-gray-500 underline text-center"
              >
                번호 다시 입력
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 mt-1">
                  이름 확인
                </h2>
                <p className="text-sm text-gray-500 mt-2 leading-relaxed">
                  이 전화번호로 처음 로그인시
                  <br />
                  저장되는 이름입니다.
                  <br />
                  이후 로그인시 같은 이름으로 고정됩니다.
                </p>
              </div>

              {editingConfirmName ? (
                <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
                  <Input
                    label="이름 수정"
                    placeholder="홍길동"
                    value={confirmName}
                    onChange={(e) => setConfirmName(e.target.value)}
                    autoFocus
                  />
                  <p className="mt-3 text-xs text-gray-400 leading-relaxed">
                    실수로 잘못 입력했다면 여기서 수정 후 저장해주세요.
                  </p>
                </div>
              ) : (
                <div className="rounded-2xl border border-gray-200 bg-gradient-to-b from-gray-50 to-white px-5 py-5 text-center">
                  <p className="text-xs font-medium tracking-[0.14em] text-gray-400 uppercase">
                    Confirm Name
                  </p>
                  <p className="mt-3 text-2xl font-bold text-gray-900 tracking-tight">
                    {confirmName}
                  </p>
                  <div className="mt-4 inline-flex items-center rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-500">
                    이 이름으로 고객 정보가 고정됩니다
                  </div>
                </div>
              )}

              {error && <p className="text-sm text-red-500">{error}</p>}

              {editingConfirmName ? (
                <>
                  <Button
                    onClick={handleConfirmName}
                    loading={loading}
                    fullWidth
                    size="lg"
                    className="mt-1"
                  >
                    이 이름으로 저장
                  </Button>
                  <button
                    onClick={() => {
                      setEditingConfirmName(false);
                      setError("");
                    }}
                    className="text-sm text-gray-500 underline text-center"
                  >
                    다시 확인하기
                  </button>
                </>
              ) : (
                <>
                  <Button
                    onClick={handleConfirmName}
                    loading={loading}
                    fullWidth
                    size="lg"
                    className="mt-1"
                  >
                    예, 맞습니다
                  </Button>
                  <Button
                    onClick={() => {
                      setEditingConfirmName(true);
                      setError("");
                    }}
                    variant="secondary"
                    fullWidth
                  >
                    아니요, 수정하겠습니다
                  </Button>
                </>
              )}
            </div>
          )}
        </div>

        <p className="mt-6 text-center text-xs text-gray-500">
          <Link href="/policies" className="underline underline-offset-4">
            이용약관 및 개인정보처리방침
          </Link>
        </p>
      </div>
    </div>
  );
}
