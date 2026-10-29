# Daily Routine

Google 로그인으로 할 일을 카테고리별로 관리하는 React/TypeScript 앱입니다. [디자인 SVG](docs/designs/desktop/desktop-designs.svg)를 기준으로 Tailwind CSS 3.4와 shadcn/ui(Radix)로 구성했습니다.

- 상위·하위 할 일 추가, 서식·이미지 편집, 완료 체크, 삭제
- 드래그와 위·아래 메뉴를 통한 순서 변경, 랜덤 할 일 추가
- 카테고리 추가·이름 수정·삭제
- 할 일 작성 팝업에서 카테고리 선택·새 카테고리 생성 후 자동 선택
- Google 인증 후 신규 회원의 닉네임·선택적 사진 등록, 기존 회원의 자동 진입
- 프로필 이름·이미지 변경, 생성일별 현재 완료 상태와 카테고리별 통계
- 모바일 메뉴, 로그인 버튼 우선 배치, 에디터 팝업, 빈 목록·오류·재시도, 미저장 편집 보호

## 실행

```sh
yarn install
cp .env.example .env.local
# .env.local에 Supabase URL과 공개 키 입력
yarn dev
```

브라우저에는 `VITE_SUPABASE_ANON_KEY` 또는 `VITE_SUPABASE_PUBLISHABLE_KEY`만 사용합니다. 기존 `VITE_SUPABASE_SERVICE_ROLE_KEY`/`VITE_SUPABASE_SERVICE_KEY`는 읽지 않습니다. Supabase의 Google 공급자를 활성화하고 실제 서비스 주소의 `/todo-page`를 redirect allowlist에 등록해야 합니다. 다른 기본 주소가 필요할 때만 `VITE_SUPABASE_REDIRECT_URL`을 설정합니다. 새 Supabase 프로젝트를 사용하는 경우 [DB·Google 로그인 초기 설정 안내](docs/supabase-setup.md)에 따라 `profiles`, `todo_category`, `todo_item` 테이블과 사용자별 RLS 정책을 먼저 생성합니다.

Google 인증은 PKCE로 처리하며, 콜백 코드를 처리한 뒤 라우터에서도 URL을 정리합니다. 할 일 추가·수정·하위 추가는 에디터 팝업으로 열리며 `?editor=new`, `?editor=edit:아이디`, `?editor=child:아이디`로 직접 접근할 수도 있습니다. 데스크톱은 목록 위 중앙 팝업, 1024px 미만에서는 전체 화면 팝업과 하단 저장 영역을 사용하고 `VisualViewport` 변화에 맞춰 높이를 조정합니다. Esc·바깥 클릭·뒤로 가기·닫기에서 미저장 내용을 확인하고, 닫으면 목록 스크롤과 실행 버튼 포커스를 복원합니다. TinyMCE의 링크·이미지 창은 팝업 안에 배치해 입력 포커스를 유지합니다.

할 일 작성 시 기존 카테고리나 미분류를 선택할 수 있고, ‘새 카테고리’에서 이름을 입력해 생성하면 바로 선택됩니다. 카테고리별 화면에서 열면 해당 카테고리를 기본으로 선택하며, 카테고리를 만드는 동안 작성한 본문을 유지합니다. 하위 할 일은 상위 할 일의 카테고리를 따릅니다. UI 컴포넌트 제작·수정 시 shadcn/ui와 Tailwind CSS를 사용하는 규칙은 [AGENTS.md](AGENTS.md)에 있습니다.

키가 없으면 로그인 화면에 설정 안내를 표시하며 인증 버튼은 비활성화됩니다. Google 인증 후 `profiles`에 회원 정보가 없으면 [회원가입 디자인](docs/designs/sign-up/sign-up-designs.svg)을 적용한 `/sign-up`으로 이동합니다. 닉네임은 앞뒤 공백 제거 후 1~60자이며 사진은 선택 사항입니다. 기존 회원은 바로 할 일로 이동하고, 프로필 조회 실패는 신규 가입과 구분해 재시도를 제공합니다. 가입 저장이 실패하면 입력값을 유지하며, 응답이 끊기거나 다른 탭에서 이미 가입한 경우에는 기존 프로필을 확인해 중복 생성·덮어쓰기를 피합니다.

이미지는 5MB 이하 PNG/JPG/WebP/GIF를 지원합니다. 기존 DB 방식대로 data URL을 저장합니다. 서식 에디터는 기존 TinyMCE를 로컬 번들에서 지연 로딩하므로 Tiny Cloud API 키가 필요 없습니다. 할 일 HTML은 표시·저장 전에 DOMPurify로 정리합니다.

## 검증

```sh
yarn test
yarn lint
yarn build
yarn test:e2e
yarn build-storybook
```

E2E는 설치된 Google Chrome과 로컬 포트 5174/54321을 사용합니다. `tests/mock-supabase.cjs`의 독립된 테스트 서버로 Google 리다이렉트와 CRUD를 검증하며 실제 Google/Supabase 계정에 연결하지 않습니다. 테스트 데이터와 서버는 제품 번들에 포함되지 않습니다. 스크린샷과 실패 추적은 `test-results/`에 생성됩니다.

## 구조

- `src/components/ui`: shadcn/ui v3 공식 registry에서 가져와 디자인 토큰을 적용한 기본 컴포넌트
- `src/components/shared`: 로고, 아바타, 통계 요약, 카테고리 입력, 삭제 확인
- `src/components/layout`: 인증된 공통 내비게이션과 데이터 연결
- `src/components/todo-page`: 할 일 작성·수정 패널
- `src/pages`: 로그인, Google 인증 후 회원가입, 전체/카테고리 할 일, 마이페이지
- `src/hooks/useWorkspace.ts`: 페이지가 공유하는 조회·변경 상태
- `src/service`, `src/repository`, `src/model`: 기존 Supabase 데이터 계층
- `src/style/globals.css`, `tailwind.config.cjs`: 색상·타이포그래피·표면 토큰

기존 SCSS UI, 이메일 로그인·회원가입, Material Icons, Highcharts 컴포넌트와 사용하지 않는 훅을 제거했습니다. 통계는 상위 할 일 기준이며, 날짜별 통계는 **생성일로 묶은 현재 완료 상태**를 뜻합니다. 완료일 이력이나 연속 달성 기록은 아닙니다.

모바일 검증은 320/375/390px와 화면 높이 축소를 포함합니다. 가상 키보드 높이 변화는 브라우저에서 시뮬레이션했으며 실제 iOS/Android 키보드는 별도 확인이 필요합니다. 미저장 변경 보호를 위해 React Router는 같은 v6 계열의 6.30.6으로 업데이트했습니다.
