# 새 Supabase 프로젝트 설정

새 프로젝트에는 이전 프로젝트의 앱 테이블·데이터·사용자·인증 설정이 자동으로 복사되지 않습니다. 이 문서는 기존 데이터를 옮기지 않고 새로 시작하는 경우입니다. 현재 코드의 repository/model을 기준으로 작성했으며 원격 프로젝트 상태를 확인한 것은 아닙니다.

## 1. DB 초기화

1. Supabase Dashboard에서 **새 프로젝트**를 선택합니다.
2. **SQL Editor → New query**에서 [setup.sql](../supabase/setup.sql)의 전체 내용을 실행합니다.
3. Table Editor의 `public` 스키마에 아래 세 테이블이 있는지 확인합니다.

| 테이블 | 용도 | 주요 컬럼 |
| --- | --- | --- |
| `profiles` | 사용자 이름·이미지 | `id`, `user_name`, `user_image`, `created_at` |
| `todo_category` | 사용자별 카테고리 | `id`, `user_id`, `name`, `created_at` |
| `todo_item` | 상위·하위 할 일 | `id`, `user_id`, `todo_text`, `checked`, `category_id`, `sub_id`, `order`, `created_at` |

이 SQL은 **앱 테이블이 없는 프로젝트에서 한 번만 실행**합니다. 기존 테이블이 있으면 오류로 중단하며 삭제하거나 덮어쓰지 않습니다. 스키마가 이미 있다면 비교 후 별도 마이그레이션을 사용하세요.

- `auth.users`는 Supabase가 관리하므로 직접 생성하지 않습니다.
- Google 인증 후 `profiles` 행이 없으면 앱의 `/sign-up`에서 닉네임과 선택적 사진을 입력하고 가입을 완료할 때 행을 만듭니다. 별도 회원가입 트리거는 추가하지 않습니다.
- 카테고리가 없는 할 일은 `category_id = null`, 상위 할 일은 `sub_id = null`입니다. “전체”라는 카테고리 행을 만들 필요가 없습니다.
- RLS와 명시적 권한을 함께 설정해 로그인한 사용자가 자신의 데이터만 조회·변경할 수 있게 합니다. 다른 사용자의 카테고리·부모 할 일을 연결하는 것도 외래 키로 막습니다.
- 카테고리 삭제 시 연결된 할 일이, 부모 할 일 삭제 시 하위 할 일이 함께 삭제됩니다. 사용자 계정을 관리자가 삭제하면 해당 사용자의 앱 데이터도 삭제됩니다.
- 이미지·에디터 HTML은 `text` 컬럼에 저장합니다. 현재 구현에는 별도 Storage 버킷·Realtime·Edge Function 설정이 필요하지 않습니다.

SQL로 만든 테이블은 Data API에서 사용하는 `public` 스키마에 있어야 합니다. 프로젝트에서 **Data API가 활성화되어 있고 `public`이 노출 스키마에 포함돼 있는지**도 확인합니다.

## 2. Google 로그인

1. Google Cloud에서 OAuth 클라이언트(유형: 웹 애플리케이션)를 만듭니다.
2. 승인된 JavaScript 원본에 앱의 origin을 등록합니다. 로컬 기본값은 `http://localhost:5173`이며 실제 실행 포트가 다르면 그 주소를 사용합니다.
3. 승인된 리디렉션 URI에 **새 Supabase 프로젝트의 Google 설정 화면에 표시된 Callback URL**을 등록합니다. 일반적으로 `https://<프로젝트-ID>.supabase.co/auth/v1/callback`입니다.
4. Supabase **Authentication → Sign In / Providers → Google**에서 공급자를 활성화하고 Client ID/Secret을 저장합니다. Google Client Secret은 Supabase 설정에만 넣습니다.
5. **Authentication → URL Configuration**에서 Site URL을 앱 주소로 설정하고 Redirect URLs에 앱의 `/todo-page` 주소를 추가합니다. 예: `http://localhost:5173/todo-page`, `https://<배포-도메인>/todo-page`.

`Unsupported provider: provider is not enabled`는 Google 공급자 설정과 관련된 오류이며, 테이블 생성만으로 해결되지는 않습니다.

## 3. 앱 연결

`.env.local`의 값을 **같은 새 프로젝트**의 URL과 공개 키로 설정합니다.

```dotenv
VITE_SUPABASE_URL=https://<프로젝트-ID>.supabase.co
VITE_SUPABASE_ANON_KEY=<새 프로젝트의 anon 또는 publishable 공개 키>
VITE_SUPABASE_REDIRECT_URL=
```

공개 키는 `VITE_SUPABASE_PUBLISHABLE_KEY`로 지정해도 됩니다. 두 변수를 모두 지정했다면 이 값이 우선하므로 예전 키가 남지 않게 확인하세요. `VITE_SUPABASE_REDIRECT_URL`이 비어 있으면 현재 앱 origin을 사용합니다. 지정할 때는 앱 기본 URL을 입력합니다.

브라우저 환경변수에 `service_role` 또는 secret 키를 넣지 않습니다. 변경 후 `yarn dev`를 다시 시작합니다. 배포 환경은 환경변수를 수정한 뒤 다시 빌드·배포합니다.

## 4. 동작 확인

1. Google 로그인 후 `Authentication → Users`에 사용자가 생성되고, 신규 회원은 앱의 회원가입 화면으로 이동하는지 확인합니다. 닉네임을 입력해 가입을 완료한 뒤 `public.profiles`에 해당 사용자가 있는지 확인합니다.
2. 카테고리를 만들고 상위·하위 할 일을 추가한 뒤 새로고침하여 유지되는지 확인합니다.
3. 완료 체크·순서 변경·프로필 수정이 저장되는지 확인합니다.
4. 별도 브라우저 프로필에서 다른 Google 계정으로 로그인해 첫 계정의 데이터가 보이지 않는지 확인합니다.
5. 테스트용 카테고리·부모 할 일을 삭제하고 연결된 항목의 삭제도 확인합니다.

Table Editor와 SQL Editor는 관리자 권한으로 접근할 수 있으므로 사용자별 격리는 **로그인한 앱에서** 확인합니다. 자동 DB 검증용 [verify.sql](../supabase/verify.sql)은 setup.sql 실행 후 SQL Editor에서 별도로 실행할 수 있습니다. 성공하면 테스트 행은 롤백되지만 identity 시퀀스 번호는 소비될 수 있습니다.

| 증상 | 확인할 설정 |
| --- | --- |
| 테이블을 찾을 수 없음 / schema cache 오류 | 올바른 프로젝트에 setup.sql을 실행했는지, Data API의 `public` 노출 설정 |
| `permission denied for table` / `42501` | 테이블 권한, RLS 정책, 로그인 세션 |
| `new row violates row-level security policy` | 저장하는 `id`/`user_id`와 현재 로그인 사용자 UUID 일치 여부 |
| `foreign key constraint` / `23503` | 새 프로젝트의 사용자·카테고리·부모 할 일 ID인지, 소유자가 일치하는지 |
| Google 인증 후 엉뚱한 주소로 이동 | Site URL, Redirect URLs, `VITE_SUPABASE_REDIRECT_URL` |

이전 데이터를 유지하려면 DB와 Auth 사용자 이관을 별도로 계획해야 합니다. 같은 Google 계정이어도 새 프로젝트에서 사용자 UUID가 같다고 가정할 수 없으므로 할 일 데이터만 복사하면 `user_id` 관계가 맞지 않을 수 있습니다.

공식 참고: [사용자 데이터](https://supabase.com/docs/guides/auth/managing-user-data), [RLS](https://supabase.com/docs/guides/database/postgres/row-level-security), [Data API 권한](https://supabase.com/docs/guides/api/securing-your-api), [Google 로그인](https://supabase.com/docs/guides/auth/social-sign-in/auth-google), [Redirect URLs](https://supabase.com/docs/guides/auth/redirect-urls).
