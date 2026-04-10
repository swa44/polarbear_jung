# 정스위치 - 셋업 가이드

## 1. Supabase 설정

1. [supabase.com](https://supabase.com) 에서 새 프로젝트 생성
2. SQL Editor → `supabase/schema.sql` 파일 전체 내용 붙여넣기 → Run
3. Storage → New Bucket → 이름: `product-images`, Public 체크 → 생성

## 2. 환경변수 설정

`.env.local.example` 파일을 `.env.local`로 복사 후 값 입력:

```bash
cp .env.local.example .env.local
```

| 변수 | 설명 | 필수 |
|------|------|------|
| NEXT_PUBLIC_SUPABASE_URL | Supabase 프로젝트 URL | ✅ |
| NEXT_PUBLIC_SUPABASE_ANON_KEY | Supabase anon key | ✅ |
| SUPABASE_SERVICE_ROLE_KEY | Supabase service role key | ✅ |
| SMS_API_URL | SMS 서비스 API URL | ✅ |
| SMS_API_KEY | SMS API 키 | ✅ |
| SMS_SENDER | 발신 번호 | ✅ |
| ADMIN_PASSWORD | 관리자 로그인 비밀번호 | ✅ |
| TELEGRAM_BOT_TOKEN | 텔레그램 봇 토큰 | 선택 |
| TELEGRAM_CHAT_ID | 텔레그램 채팅 ID | 선택 |

## 3. SMS API 연동

`src/app/api/auth/send-otp/route.ts` 파일의 `sendSms` 함수를 기존 SMS 서비스 API 형식에 맞게 수정.

## 4. 텔레그램 알림 설정 (선택)

1. @BotFather 에서 봇 생성 → BOT_TOKEN 발급
2. 봇과 대화 시작 → `https://api.telegram.org/bot{TOKEN}/getUpdates` 로 CHAT_ID 확인
3. 환경변수에 입력
4. 관리자 페이지 `/admin/settings` 에서 텔레그램 알림 활성화

## 5. GitHub → Vercel 배포

### GitHub
```bash
git init
git add .
git commit -m "init: 정스위치 초기 설정"
git remote add origin https://github.com/your-username/jungswitch.git
git push -u origin main
```

### Vercel
1. [vercel.com](https://vercel.com) → Import Git Repository
2. GitHub 저장소 연결
3. Environment Variables에 위 환경변수 모두 입력
4. Deploy

## 6. Supabase Storage CORS 설정

Supabase → Storage → product-images → Policies 에서 이미지 공개 읽기 허용 확인.

## 7. 로컬 개발

```bash
npm install
npm run dev
```

- 고객 화면: http://localhost:3000
- 관리자 화면: http://localhost:3000/admin

## SMS 개발 환경 (API 없을 때)

환경변수에 SMS_API_URL 없으면 OTP가 콘솔에 출력됩니다.
개발 중에는 터미널에서 확인하세요.
