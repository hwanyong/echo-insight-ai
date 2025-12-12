# 📑 소프트웨어 기획서: Street View Visual Search Engine

## 1. 프로젝트 개요 (Project Overview)
*   **제품명:** GlassMap AI (Visual Search Edition)
*   **목적:** 기존의 단일 목적(전신주 탐지) 앱을 사용자가 입력한 프롬프트(텍스트/이미지)를 기반으로 현실 세계의 객체를 찾아 지도에 매핑해주는 범용 검색 도구로 피봇팅(Pivoting)함.
*   **핵심 가치:** "지도 위에서 '빨간 우체통'을 검색하면, 실제 스트릿뷰를 분석해 그 위치를 찍어준다."
*   **타겟 플랫폼:** Web (SPA), Mobile, Desktop (Responsive)

---

## 2. 사용자 경험 시나리오 (UX Flow)

### 2.1. 탐색 및 영역 설정
1.  사용자는 지도를 이동/확대하여 관심 지역을 찾는다.
2.  `Draw Area` 버튼을 활성화하고 지도 위에 사각형(Bounding Box)을 그린다.
3.  **[변경]** 드로잉이 끝나는 즉시 **'검색 설정 모달(Search Query Modal)'**이 팝업된다.

### 2.2. 검색 조건 입력 (신규)
1.  모달에서 사용자는 **찾고자 하는 대상**을 입력한다.
    *   *Text Input:* "스타벅스 로고", "파손된 보도블럭", "불법 주차된 오토바이" 등.
    *   *Image Input (Optional):* 찾고 싶은 대상의 레퍼런스 이미지 업로드.
2.  **검색 밀도(Density) 설정:** 비용/정확도 조절을 위해 검색 간격(촘촘하게/듬성듬성)을 선택한다.
3.  `Start Scan` 버튼을 누르면 모달이 닫히고 분석이 시작된다.

### 2.3. 결과 확인 및 상호작용
1.  지도 위에 분석 진행 상황(Loading Indicator)이 표시된다.
2.  **[변경]** 발견된 객체는 단순 원형 마커가 아닌, **발견된 방향(Heading)을 가리키는 화살표** 또는 **아이콘**으로 표시된다.
3.  마커 클릭 시 사이드 패널이 열리며, AI가 분석한 **대상 이미지(Crop)**, **요약 설명**, **추정 거리**가 표시된다.

### 2.4. 히스토리 관리 (신규)
1.  사이드바 메뉴에서 'Search History' 탭을 선택한다.
2.  과거에 수행한 검색(키워드 + 지역) 목록이 날짜순으로 나열된다.
3.  항목 클릭 시 해당 지역으로 이동하며 이전 검색 결과 마커들을 복원한다. (API 재호출 방지)

---

## 3. 기능 명세 (Functional Specifications)

### 3.1. Frontend (React)
*   **Search Modal Component:**
    *   드로잉 완료 이벤트(`mouseup`)를 트리거로 모달 활성화.
    *   폼 데이터(Prompt, Reference Image)를 상태로 관리.
    *   "취소" 시 드로잉 된 영역 삭제.
*   **Marker System Upgrade:**
    *   기존: 색상으로 위험도 표시 (Safe/Risk).
    *   변경: 검색 정확도(Confidence Score)에 따른 투명도 조절.
    *   방향성 표시: `google.maps.marker.AdvancedMarkerElement`의 `content`를 회전(CSS `rotate`)시켜 객체의 실제 위치 방향을 지시.
*   **Local Data Caching:**
    *   `localStorage` 또는 `IndexedDB`를 사용하여 `JobID`, `Timestamp`, `Query`, `ResultData`를 저장.
    *   앱 재실행 시 로컬 데이터를 불러와 "최근 검색 기록" 구성.

### 3.2. Data Model (Type Definition Changes)
기존의 전신주(Pole) 중심 데이터 구조를 범용 객체(Object) 구조로 변경해야 합니다.

**`ScanJob` (변경)**
```typescript
interface ScanJob {
  jobId: string;
  userId?: string;
  status: 'processing' | 'completed';
  searchQuery: {
    text: string;      // 예: "Red Fire Hydrant"
    imageRef?: string; // 업로드된 이미지 URL
  };
  region: { centerLat: number; centerLng: number; bounds: any };
  createdAt: number;
}
```

**`DetectedObject` (기존 `DetectedPole` 대체)**
```typescript
interface DetectedObject {
  id: string;
  confidence: number; // AI가 얼마나 확신하는지 (0.0 ~ 1.0)
  label: string;      // 감지된 객체 이름
  description: string; // AI의 상세 설명
  spatial: {
    heading: number;  // 카메라 기준 객체 방향 (0~360)
    distance: number; // 추정 거리 (미터)
    location: { lat: number; lng: number }; // 계산된 실제 좌표
  };
  image_crop_url?: string; // 객체 부분만 잘라낸 이미지 (Optional)
}
```

---

## 4. UI/UX 디자인 가이드 (Design Specifications)

### 4.1. Search Modal (Glassmorphism)
*   **배경:** `backdrop-filter: blur(20px)`가 적용된 어두운 반투명 레이어.
*   **입력창:** 큼직한 텍스트 입력 필드. 플레이스홀더: *"Describe what you are looking for..."*
*   **스타일:** 전체적으로 앱의 기존 테마(Dark/Minimal) 유지. 테두리는 얇은 흰색(`border-white/20`).

### 4.2. Result Marker
*   **형태:** 작은 원(Car Position) + 부채꼴 모양(View Cone) 또는 화살표.
*   **인터랙션:**
    *   Hover: 발견된 객체 이름 툴팁 표시.
    *   Click: 해당 스트릿뷰 파노라마로 진입하되, 초기 시점(POV)을 **발견된 객체 방향**으로 자동 설정.

### 4.3. Analysis Panel (Right Side)
*   기존의 "Risk Score", "Lean Direction" 같은 엔지니어링 수치 제거.
*   **표시 항목:**
    *   **Prompt Match:** 사용자의 검색어와 얼마나 일치하는지.
    *   **Snippet:** AI가 작성한 짧은 묘사 (예: *"건물 입구 오른쪽에 위치한 붉은색 소화전입니다."*).
    *   **Thumbnail:** 전체 파노라마 중 해당 객체가 있는 부분.

---

## 5. 기술적 고려사항 및 제약 (Technical Constraints)

1.  **좌표 계산 알고리즘 (Geolocation Logic):**
    *   프론트엔드 또는 백엔드에서 다음 공식을 적용해야 합니다.
    *   `Object Lat` = `Car Lat` + `cos(Total Heading) * Distance`
    *   `Object Lng` = `Car Lng` + `sin(Total Heading) * Distance`
    *   *Note: 거리(Distance)는 Gemini가 시각적으로 추정한 값이므로 오차가 있을 수 있음을 UI에 명시해야 함.*

2.  **API 비용 최적화:**
    *   Gemini 멀티모달 분석은 비용이 높으므로, 드로잉 영역 내의 파노라마 포인트 개수를 제한(Max 50개 등)하는 로직을 `performGridSearch` 함수 내에 강제해야 합니다.

3.  **반응형 (Mobile):**
    *   모바일에서는 드로잉 제스처가 불편할 수 있으므로, "현재 화면 내 검색(Search This Area)" 버튼을 대안으로 제공하는 것을 고려합니다. (이번 스펙에서는 드로잉 유지하되 터치 이벤트 지원 확인).

---

## 6. 마이그레이션 단계 (Migration Steps)

이 기획서에 따라 개발을 진행할 때 다음 순서로 코드를 변경할 것을 권장합니다.

1.  **Refactor Types:** `types.ts`에서 Pole 관련 용어를 제거하고 일반화된 용어로 변경.
2.  **UI Component:** `SearchModal.tsx` 신규 개발 및 `GoogleMap.tsx`에 연동.
3.  **Logic Update:** `GoogleMap.tsx` 내 `performGridSearch` 이후 즉시 업로드가 아닌, 모달 입력을 기다리도록 수정.
4.  **Panel Update:** `AnalysisPanel.tsx` UI를 일반 텍스트 설명 위주로 변경.
5.  **History Feature:** `Sidebar.tsx`에 `localStorage` 연동 리스트 추가.
