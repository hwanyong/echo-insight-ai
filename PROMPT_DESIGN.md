
# 🧠 AI Server Prompt Design & Data Structure

이 문서는 클라이언트(GlassMap Web App)의 시각 검색 기능을 지원하기 위해, 서버(Google Cloud Functions + Gemini Pro Vision)에서 사용해야 할 프롬프트 설계와 입출력 데이터 구조를 정의합니다.

---

## 1. System Instruction (시스템 프롬프트)

Gemini 모델에게 부여할 역할과 행동 지침입니다.

> **Role:** You are a generic geo-spatial analysis AI specializing in analyzing 360-degree Street View images.
>
> **Task:**
> 1.  Receive a set of images (Front, Back, Right, Left views) from a specific location.
> 2.  Receive a user's search query (text description and/or reference image).
> 3.  Determine if the object described in the query exists in any of the provided images.
> 4.  If found, extract details such as the best view label, relative heading, approximate distance, and a visual description.
> 5.  **CRITICAL:** You must return the result in pure JSON format without Markdown formatting.

---

## 2. User Prompt Template (유저 프롬프트)

각 요청마다 동적으로 생성되어 모델에게 전달되는 메시지입니다.

**Input Format (Multipart):**
1.  **Text:** "Search Query: {queryText}"
2.  **Images:** [Image_Front, Image_Right, Image_Back, Image_Left] (Labeled or ordered)
3.  **Instruction:** "Analyze these 4 images. Does the object described above exist? Return JSON matching the specified schema."

---

## 3. Response Data Structure (JSON Schema)

서버는 모델의 출력을 파싱하여 Firestore `scan_points` 문서의 `aiResult` 필드에 저장해야 합니다. 클라이언트는 이 구조를 구독합니다.

### 3.1. Standard JSON Output (Target)

```json
{
  "found": boolean,                // true if the object is detected
  "confidence_score": number,      // 0-100 integer
  "best_view_label": string,       // e.g., "Front", "Right", "Back", "Left"
  "description": string,           // Brief description of the found object in context
  "matched_keywords": string[],    // Key terms identified (e.g., "red sign", "logo")
  "detected_objects": [            // Array of specific instances found
    {
      "label": string,             // Short label (e.g., "Starbucks Sign")
      "confidence": number,        // 0.0 - 1.0
      "description": string,       // Detail for this specific instance
      "spatial": {
        "heading": number,         // Relative heading (0-360)
        "distance": number         // Approximate distance in meters
      }
    }
  ]
}
```

### 3.2. Fallback / Flat JSON Output (Current Log Observation)

현재 로그에서 관찰되는 구조(Flat Structure)를 클라이언트가 지원하도록 호환성을 유지합니다.

```json
{
  "found": true,
  "confidence_score": 95,
  "best_view_label": "Front",
  "description": "A blue van is parked on the street.",
  "matched_keywords": ["blue van", "vehicle"]
}
```

*Note: 클라이언트(GoogleMap.tsx)는 `detected_objects` 배열이 누락된 경우, 위 Flat 정보를 바탕으로 가상의 객체 데이터를 생성하여 UI에 표시합니다.*

---

## 4. Firestore Document Schema (`scan_points/{panoId}`)

최종적으로 클라이언트가 읽게 되는 Firestore 문서 구조입니다.

```json
{
  "panoId": "FpXx...",
  "status": "done",       // "analyzing" -> "done"
  "location": { "latitude": 37.5, "longitude": 127.0 },
  "heading": 270,
  "aiResult": {           // The JSON object returned by Gemini
    "found": true,
    "confidence_score": 90,
    "description": "Found a red mailbox.",
    "detected_objects": [...] 
  }
}
```
