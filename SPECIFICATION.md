# 📑 기획서: Vision Search 데이터 페이로드 및 로직 설계

## 1. 개요 (Overview)
기존에는 단순히 특정 구역의 전신주(Pole)를 찾는 것이 목적이었으나, 이제는 **"사용자가 입력한 텍스트(Prompt)와 참조 이미지(Reference Image)"**를 기반으로 범용적인 시각 검색을 수행해야 합니다.

따라서 서버 요청 시 `Scan Points`(좌표 목록) 외에 **`Search Criteria`(검색 기준)** 정보가 필수적으로 포함되어야 합니다.

---

## 2. 데이터 페이로드 설계 (Data Payload Specification)

클라이언트에서 `performMultiRegionSearch()` 완료 후 파노라마 ID 수집이 끝나면, 사용자가 "검색(Search)" 버튼을 눌렀을 때 `uploadScanData` 함수로 보낼 JSON 구조입니다.

### Request Body (Client → Server)

```json
{
  "searchContext": {
    "queryText": "string",          // 필수: 사용자 입력 프롬프트 (예: '스타벅스 로고', '빨간 우체통')
    "queryImages": ["base64_string_or_url"], // 선택: 참조 이미지 (비전 검색 정확도 향상용)
    "searchMode": "vision",         // 고정값: 처리 로직 분기용 ('vision' vs 'pole_legacy')
    "timestamp": "ISO8601"          // 요청 시간
  },
  "regionMetadata": {
    "center": { 
      "latitude": number, 
      "longitude": number 
    },
    "totalBounds": {                // 전체 검색 영역의 외각 경계 (지도 UI 복원용)
      "north": number,
      "south": number,
      "east": number,
      "west": number
    },
    "regionCount": number           // 선택된 영역 개수 (예: 3 areas)
  },
  "scanPoints": [                   // 분석할 대상 지점 목록 (최대 N개로 제한 필요)
    {
      "panoId": "string",           // Google Street View Pano ID (고유키)
      "location": {
        "latitude": number,
        "longitude": number
      },
      "heading": number,            // 도로 방향 (Car Heading)
      "pitch": 0                    // 기본값 0
    }
    // ... 추가 포인트들
  ]
}
```

---

## 3. 프로세스 로직 (Process Logic)

### 3.1. 클라이언트 동작 (Client-Side)
1.  **트리거:** 사용자가 검색바에 텍스트를 입력하고 (옵션: 이미지 업로드), `Vision Search` 버튼(보라색 번개 아이콘)을 클릭.
2.  **유효성 검사:**
    *   입력된 `Search Query`가 비어있지 않은지 확인.
    *   선택된 `Region`(영역)이 1개 이상이며, `Found Panos`(파노라마 포인트)가 존재하는지 확인.
3.  **데이터 패키징:**
    *   현재 메모리에 있는 `foundPanos` 배열을 순회하며 `scanPoints` 배열 생성.
    *   업로드된 이미지 파일(`uploadedImages`)이 있다면 Base64 문자열로 변환하거나, 임시 스토리지 URL로 변환하여 `queryImages` 배열에 추가.
4.  **전송:** `httpsCallable('uploadScanData')` 호출.
5.  **상태 변경:** UI를 'Uploading...' 상태로 변경하고 반환되는 `jobId`를 대기.

### 3.2. 서버 동작 (Server-Side Logic - Concept)
이 부분은 클라이언트 개발 범위를 벗어나지만, 데이터 흐름 이해를 위해 기술합니다.

1.  **Job 생성:** Firestore `scan_jobs` 컬렉션에 문서를 생성하고 `jobId` 발급. 이때 `searchContext`를 문서 필드에 저장 (히스토리용).
2.  **분할 처리 (Batching):** `scanPoints`가 많을 경우(예: 100개), Gemini API 속도 제한을 고려하여 5~10개 단위로 청크(Chunk) 분할.
3.  **Gemini 프롬프트 구성:**
    *   시스템 프롬프트: *"당신은 지리공간 분석 AI입니다. 다음 스트릿뷰 이미지에서 사용자가 요청한 [queryText]를 찾으세요."*
    *   유저 프롬프트: 사용자가 보낸 `queryText` + 해당 PanoID의 이미지.
4.  **결과 저장:** 분석 결과(발견 여부, 위치, 설명)를 Firestore의 하위 컬렉션 `scan_points`에 실시간 업데이트.
