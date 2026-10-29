# Daily Routine · 데스크톱 와이어프레임

기존 React 18 / TypeScript / Vite 프로젝트를 읽고 `ui-ux-pro-max`로 구성한 UI 개편 제안입니다. 앱 소스와 연결되지 않은 정적 디자인 산출물입니다.

## 파일

- [전체 보드](desktop-wireframes.svg): 네 화면을 한 번에 비교하는 SVG.
- [01 로그인](01-login.svg): Google로 계속하기만 제공하는 단일 로그인 화면.
- [02 전체 할 일](02-todo-dashboard.svg): 고정 사이드바, 요약, 카테고리 표시, 완료 체크, 하위 할 일, 추가·랜덤 추가.
- [03 카테고리와 편집](03-category-editor.svg): 카테고리 목록과 우측 에디터, 하위 할 일 추가, 카테고리 이름 수정·삭제.
- [04 마이페이지](04-my-page.svg): 프로필 이미지·이름 수정, 완료 현황, 생성일별·카테고리별 통계.

개별 화면은 **1440 × 1000**, 전체 보드는 **3088 × 2376**입니다. 브라우저로 열거나 Figma에 SVG를 가져올 수 있습니다. 글자는 편집 가능한 텍스트이며, 한국어 폰트가 없는 환경에서는 대체 글꼴에 따라 폭이 달라질 수 있습니다. Google 로고는 프로젝트의 기존 이미지 파일을 SVG 안에 포함했습니다. 그 외 외부 이미지·폰트 요청은 없습니다.

## 구성 방향

- 무채색, 얇은 구분선, 넓은 여백으로 구조와 정보 위계를 먼저 검토합니다. 최종 브랜드 색상 제안은 아닙니다.
- 240px 고정 사이드바를 목록·편집·마이페이지에 공통으로 사용합니다. 현재 위치는 배경, 굵기, 좌측 표시로 구분합니다.
- 본문 16px, 제목 32px, 기본 버튼 높이 44px, 8px 간격 체계를 사용합니다.
- 기존 인라인 서식 에디터를 우측 패널로 옮겨 목록과 함께 볼 수 있게 제안했습니다. 별도 제목·설명 데이터 필드를 추가하지 않습니다.
- 기존 전체 목록은 날짜로 필터링되지 않으므로 ‘오늘 할 일’로 이름을 바꾸지 않았습니다.
- 생성일별 통계는 `created_at`으로 묶은 **현재 완료 상태**입니다. 완료일 추이나 연속 달성 기록으로 해석하지 않습니다.
- 예시 데이터는 상위 할 일 8개 / 완료 3개 / 미완료 5개 / 완료율 37.5%입니다. 업무 4개, 공부 2개, 일상 2개이며 하위 할 일 2개는 별도입니다.

## 코드와의 대응

| 화면 요소 | 참고한 코드 |
| --- | --- |
| Google 로그인 | `src/components/landing/LoginPanel/LoginPanel.tsx`, `src/supabase/auth.ts`, `src/router/index.tsx` |
| 공통 프레임·내비게이션 | `src/components/layout/DefaultLayout/DefaultLayout.tsx`, `src/components/header/DefaultHeader/DefaultHeader.tsx`, `src/components/profile/UserProfile/UserProfile.tsx` |
| 카테고리 선택·추가·수정·삭제 | `src/components/todo-page/TodoCategoryDashboard/TodoCategoryDashboard.tsx`, `src/components/list-item/CategoryListItem/CategoryListItem.tsx` |
| 2단계 목록·완료·순서 변경·랜덤 추가 | `src/components/todo-item/DepsTodoList/DepsTodoList.tsx`, `src/components/list-item/DefaultTodoItem/DefaultTodoItem.tsx`, `src/hooks/todo/useTodoList.ts` |
| 서식 에디터 | `src/components/input/EditorInputWrapper/EditorInputWrapper.tsx`, `src/components/input/EditorInput/EditorInput.tsx`, `src/utils/editor.utils.ts` |
| 프로필 수정 | `src/components/sidebar/MyPageSidebar/MyPageSidebar.tsx` |
| 통계와 집계 기준 | `src/components/my-page/MyPageChartWrapper/MyPageChartWrapper.tsx`, `src/service/chart/chart.service.ts` |

## 구현 시 적용할 동작

아래는 디자인 제안이며 SVG에서 작동하거나 현재 코드에 추가된 기능이 아닙니다.

- 할 일의 더보기 메뉴: 하위 할 일 추가, 위로 이동, 아래로 이동, 삭제. 하위 항목에는 하위 추가를 제공하지 않아 기존 2단계를 유지합니다. 드래그와 함께 버튼·키보드로 순서를 변경할 수 있게 합니다.
- 상위 완료 체크는 기존 로직대로 하위 항목에도 반영하며, 하위 항목이 모두 완료되면 상위도 완료됩니다.
- 카테고리 삭제 전 ‘카테고리 안의 할 일도 모두 삭제됩니다’라는 확인창을 제공합니다. 취소를 기본 포커스로 두고, 취소하면 원래 화면을 유지합니다.
- 에디터는 새 할 일·하위 할 일 작성에도 재사용합니다. 저장 중 중복 클릭을 막고, 실패 시 작성 내용을 유지한 채 재시도 안내를 표시합니다. 변경 내용을 버리고 닫을 때 확인합니다.
- 로그인은 Google만 제공합니다. Google 인증 중 진행 상태를 표시하고, 취소·실패 시 버튼 아래에 안내와 재시도를 제공합니다. Google 인증 자체는 공급자 화면으로 이동합니다.
- 최초 진입 또는 빈 카테고리는 ‘아직 할 일이 없습니다’와 ‘할 일 추가’를, 로딩 시 목록 스켈레톤을, 조회 실패 시 재시도를 제공합니다.
- 구현에서는 체크박스·버튼·입력의 실제 HTML 의미, 보이는 포커스, 폼 레이블, 에디터 포커스 이동을 검증합니다. 정적 SVG가 실제 앱 접근성 검증을 대체하지 않습니다.
- 차트는 색만으로 구분하지 않고 패턴·범례·수치를 함께 제공합니다. 구현 시 표 형태의 데이터 대안도 제공합니다.

## 스킬 적용과 검수

`ui-ux-pro-max`의 디자인 시스템 검색을 실행했습니다. 자동 추천의 랜딩페이지 패턴은 제품 내부 화면에 맞지 않아 재검색했으며, 재검색에서도 적합한 내비게이션 패턴을 얻지 못했습니다. 화면 구성은 스킬의 기본 UX 지침과 기존 코드 구조를 기준으로 설계했습니다. 적합성이 확인된 `Flat Design`, 명시적 스타일 검색의 `Minimalism & Swiss Style`, `dragging movements` UX 검색 결과를 반영했습니다. 자동 추천의 색상·영문 서체는 이번 무채색 한국어 와이어프레임에 적용하지 않았습니다.

SVG XML 파싱, 중복 ID, 외부 스크립트 유무, 예시 수치 일관성을 확인하고 macOS Quick Look으로 렌더링하여 화면을 검토했습니다. 앱 구현, 모바일·다크 모드, 별도 회원가입 화면, 실제 OAuth 및 API 동작 검증은 이번 산출물 범위에 포함하지 않았습니다.
