# GlassMap 서버 사이드 구현 프롬프트 (Firebase + AI)

이 문서는 'GlassMap' 프로젝트의 백엔드를 구현하기 위한 상세 명세서입니다.
이 내용을 AI 코딩 도구(Cursor, GitHub Copilot 등)나 개발자에게 전달하여 서버를 구축하십시오.

---

## 1. 프로젝트 개요
**GlassMap**은 구글 맵 스트릿뷰를 활용하여 특정 지역의 **전신주(Utility Pole) 위치를 탐지**하는 애플리케이션입니다.
현재 React 프론트엔드는 구현되어 있으며, 이제 **Firebase**를 기반으로 대량의 이미지 처리 및 AI 분석 파이프라인을 담당할 백엔드가 필요합니다.

## 2. 목표 아키텍처 (Serverless)
*   **Platform**: Firebase (Google Cloud Platform)
*   **Database**: Cloud Firestore (NoSQL)
*   **Storage**: Cloud Storage (이미지 저장용)
*   **Compute**: Cloud Functions for Firebase (2nd Gen) - Node.js/TypeScript
*   **External API**: Google Maps Street View Static API

## 3. 데이터베이스 스키마 설계 (Firestore)

데이터는 두 단계의 컬렉션 구조로 관리합니다.

### A. `scan_jobs` (메인 작업)
사용자가 클라이언트에서 "Upload"를 눌렀을 때 생성되는 작업 단위입니다.
*   **Document ID**: Auto-generated UUID
*   **Fields**:
    *   `createdAt` (Timestamp): 생성 일시
    *   `userId` (String): 사용자 ID (익명 가능)
    *   `status` (String): 'uploading' | 'processing' | 'completed'
    *   `totalPoints` (Number): 요청된 마커 총 개수
    *   `processedPoints` (Number): 분석 완료된 개수 (진행률 표시용)
    *   `region` (Map): { ne: {lat, lng}, sw: {lat, lng} }

### B. `scan_points` (개별 분석 포인트)
각 스트릿뷰 파노라마 지점에 대한 데이터입니다.
*   **Document ID**: `panoId` (파노라마 ID를 그대로 사용하거나, 해시값 사용)
*   **Fields**:
    *   `jobId` (String): 부모 `scan_jobs` 문서 ID
    *   `location` (GeoPoint): 위도, 경도
    *   `panoId` (String): 구글 스트릿뷰 Pano ID
    *   `status` (String): 'ready' | 'downloading' | 'analyzing' | 'done' | 'error'
    *   `imageUrl` (String): Cloud Storage에 저장된 원본 이미지 경로
    *   `aiResult` (Map):
        *   `detected` (Boolean): 전신주 발견 여부
        *   `confidence` (Number): 0.0 ~ 1.0 확률
        *   `processedAt` (Timestamp)

## 4. 구현해야 할 Cloud Functions (API)

### 기능 1: `uploadScanData` (HTTPS Callable Function)
클라이언트로부터 대량의 좌표 데이터를 받아 DB에 초기화하는 함수입니다.

*   **Input**: `{ region: object, markers: Array<{lat, lng, panoId}> }`
*   **Logic**:
    1.  `scan_jobs` 컬렉션에 새 문서 생성.
    2.  `scan_points` 컬렉션에 받은 마커 데이터를 **Batch Write**로 저장 (500개 제한 고려하여 청크 분할 처리).
    3.  클라이언트에게 `jobId` 반환.

### 기능 2: `processPointPipeline` (Firestore Trigger)
`scan_points` 컬렉션에 문서가 생성(`onCreate`)되면 자동으로 실행되는 비동기 파이프라인입니다.

*   **Trigger**: `firestore.document('scan_points/{docId}').onCreate`
*   **Logic**:
    1.  **이미지 다운로드**:
        *   Google Street View Static API를 호출하여 해당 `panoId` 또는 `location`의 이미지를 가져옵니다. (해상도: 640x640 권장)
        *   *주의: API Key는 Firebase 환경변수(`GOOGLE_MAPS_API_KEY`)로 관리.*
    2.  **Storage 저장**:
        *   가져온 이미지를 `gs://{bucket}/scans/{jobId}/{panoId}.jpg` 경로에 저장.
        *   저장된 `imageUrl`을 DB에 업데이트.
    3.  **AI 분석 수행 (Mockup/Placeholder)**:
        *   *현재 단계에서는 실제 AI 모델 대신 Mock 로직을 구현합니다.*
        *   로직 예시: `Math.random() > 0.7` 이면 `detected: true`로 설정.
        *   (추후 Vertex AI 또는 TensorFlow.js 연동을 위한 인터페이스 마련).
    4.  **결과 업데이트**:
        *   해당 `scan_points` 문서에 `aiResult` 필드 업데이트.
        *   부모 `scan_jobs` 문서의 `processedPoints` 필드를 +1 증가 (Transaction 또는 Atomic Increment 사용).

## 5. API 데이터 인터페이스 규격 (Data Specifications)

클라이언트(Client)와 Cloud Functions(Server) 간 통신 시 준수해야 할 데이터 구조(TypeScript Interface)입니다.

### A. Request: `uploadScanData`
클라이언트가 분석 요청을 보낼 때 전송하는 데이터 본문(Body)입니다.

```typescript
// Function Name: uploadScanData
interface UploadScanDataRequest {
  // 사용자가 선택한 지역의 경계값 (Bounding Box)
  region: {
    ne: { lat: number; lng: number }; // North East
    sw: { lat: number; lng: number }; // South West
  };
  
  // 클라이언트에서 수집한 파노라마 포인트 목록
  markers: Array<{
    lat: number;
    lng: number;
    panoId: string; // Google Street View Panorama ID
  }>;
  
  // (Optional) 클라이언트 타임스탬프 (ISO 8601 String)
  clientTimestamp?: string;
}
```

### B. Response: `uploadScanData`
Cloud Functions가 처리를 수락했을 때 반환하는 응답입니다.

```typescript
interface UploadScanDataResponse {
  // 요청 성공 여부
  success: boolean;
  
  // 생성된 작업 ID (클라이언트가 Firestore 구독 시 사용)
  jobId: string; 
  
  // 응답 메시지
  message: string;
  
  // 서버가 수신하여 처리 대기 중인 포인트 총 개수
  totalPointsReceived: number;
}
```

### C. Firestore Data Models (Client Subscription)
클라이언트가 `onSnapshot`으로 구독하여 UI에 반영할 데이터 모델입니다.

**1. Job Status (`scan_jobs/{jobId}`)**
```typescript
interface ScanJobDocument {
  jobId: string;
  status: 'uploading' | 'processing' | 'completed' | 'failed';
  totalPoints: number;     // 전체 마커 수
  processedPoints: number; // 현재 분석 완료된 수 (Progress Bar용)
  createdAt: FirebaseFirestore.Timestamp;
}
```

**2. Point Result (`scan_points/{panoId}`)**
```typescript
interface ScanPointDocument {
  panoId: string;
  status: 'ready' | 'downloading' | 'analyzing' | 'done' | 'error';
  
  // AI 분석 결과 (분석 완료 시 생성됨)
  aiResult?: {
    detected: boolean;     // 전신주 탐지 여부 (True/False)
    confidence: number;    // 신뢰도 (0.0 ~ 1.0)
    processedAt: FirebaseFirestore.Timestamp;
  };
  
  // 에러 발생 시
  error?: string;
}
```

## 6. 개발 환경 설정 가이드

1.  **Firebase CLI 설치 및 로그인**:
    ```bash
    npm install -g firebase-tools
    firebase login
    ```
2.  **프로젝트 초기화**:
    ```bash
    firebase init functions firestore storage
    ```
3.  **환경 변수 설정**:
    ```bash
    firebase functions:config:set google.maps_api_key="YOUR_KEY"
    ```

## 7. 클라이언트 연동 가이드 (참고)
서버 구현 후 프론트엔드(`GoogleMap.tsx`)는 다음과 같이 수정되어야 합니다.
*   `firebase` SDK 설치.
*   `handleSaveToServer` 함수 내에서 `httpsCallable('uploadScanData')` 호출.
*   `onSnapshot`을 사용하여 `scan_jobs/{jobId}`의 `processedPoints`를 실시간으로 감지하여 UI 업데이트.
*   `onSnapshot`을 사용하여 `scan_points` 쿼리를 구독, 분석이 완료된 마커의 색상 변경 (예: 전신주 발견됨=빨강, 없음=초록).

---
**작업 지시:**
위 명세에 따라 `functions/src/index.ts` 및 필요한 모듈 파일들을 작성하십시오.