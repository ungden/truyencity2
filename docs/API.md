# API Reference

## 🔐 Authentication

All API endpoints require authentication via Supabase JWT token.

### Headers

```
Authorization: Bearer <supabase-jwt-token>
Content-Type: application/json
```

### Getting Token

```typescript
import { supabase } from '@/integrations/supabase/client';

const { data: { session } } = await supabase.auth.getSession();
const token = session?.access_token;
```

## 📝 Projects API

### List Projects

Get all AI story projects for the authenticated user.

**Endpoint**: `GET /api/ai-writer/projects`

**Response**:
```json
{
  "projects": [
    {
      "id": "uuid",
      "user_id": "uuid",
      "novel_id": "uuid",
      "genre": "tien-hiep",
      "main_character": "Lâm Phong",
      "cultivation_system": "Luyện Khí → Trúc Cơ → Kim Đan",
      "world_description": "Thế giới tu tiên...",
      "writing_style": "webnovel_chinese",
      "target_chapter_length": 2500,
      "ai_model": "gpt-4-turbo",
      "temperature": 0.7,
      "current_chapter": 42,
      "total_planned_chapters": 100,
      "status": "active",
      "created_at": "2025-01-30T00:00:00Z",
      "updated_at": "2025-01-30T12:00:00Z",
      "novel": {
        "id": "uuid",
        "title": "Tu Tiên Đại Đạo",
        "author": "AI Writer",
        "genres": ["Tiên Hiệp"],
        "cover_url": "https://...",
        "description": "Một câu chuyện tu tiên..."
      }
    }
  ]
}
```

### Create Project

Create a new AI story project.

**Endpoint**: `POST /api/ai-writer/projects`

**Request Body**:
```json
{
  "novelTitle": "Tu Tiên Đại Đạo",
  "genre": "tien-hiep",
  "mainCharacter": "Lâm Phong",
  "cultivationSystem": "Luyện Khí → Trúc Cơ → Kim Đan → Nguyên Anh",
  "worldDescription": "Thế giới tu tiên với 9 tầng trời...",
  "writingStyle": "webnovel_chinese",
  "targetChapterLength": 2500,
  "aiModel": "gpt-4-turbo",
  "temperature": 0.7,
  "totalPlannedChapters": 100
}
```

**Response**:
```json
{
  "project": {
    "id": "uuid",
    "novel_id": "uuid",
    ...
  }
}
```

### Update Project Status

Pause or resume a project.

**Endpoint**: `PATCH /api/ai-writer/projects/:id/status`

**Request Body**:
```json
{
  "status": "paused" // or "active"
}
```

**Response**:
```json
{
  "success": true,
  "project": {
    "id": "uuid",
    "status": "paused",
    ...
  }
}
```

## 📖 Jobs API

### Create Writing Job

Start writing a new chapter.

**Endpoint**: `POST /api/ai-writer/jobs`

**Request Body**:
```json
{
  "projectId": "uuid"
}
```

**Response**:
```json
{
  "jobId": "uuid",
  "chapterNumber": 43,
  "status": "pending"
}
```

### Get Job Status

Poll job status while writing.

**Endpoint**: `GET /api/ai-writer/jobs/:id`

**Response**:
```json
{
  "job": {
    "id": "uuid",
    "project_id": "uuid",
    "user_id": "uuid",
    "chapter_number": 43,
    "status": "running", // pending, running, completed, failed, stopped
    "progress": 65,
    "step_message": "Đang kiểm tra chất lượng...",
    "result_chapter_id": null,
    "error_message": null,
    "created_at": "2025-01-30T12:00:00Z",
    "updated_at": "2025-01-30T12:02:30Z"
  }
}
```

**Status Values**:
- `pending`: Job created, waiting to start
- `running`: Currently writing
- `completed`: Successfully finished
- `failed`: Error occurred
- `stopped`: Manually stopped by user

**Progress Values**: 0-100

**Step Messages**:
- "Đang khởi tạo..."
- "Đang phân tích ngữ cảnh..."
- "Đang tạo prompt..."
- "Đang viết chương..."
- "Đang kiểm tra chất lượng..."
- "Đang phát hiện mâu thuẫn..."
- "Đang cập nhật Story Graph..."
- "Đang lưu chương..."
- "Hoàn thành!"

### Stop Writing Job

Stop a running job.

**Endpoint**: `POST /api/ai-writer/jobs/:id/stop`

**Response**:
```json
{
  "success": true,
  "message": "Job stopped successfully"
}
```

### List Project Jobs

Get recent jobs for a project.

**Endpoint**: `GET /api/ai-writer/projects/:id/jobs`

**Query Parameters**:
- `limit` (optional): Number of jobs to return (default: 10)

**Response**:
```json
{
  "jobs": [
    {
      "id": "uuid",
      "chapter_number": 43,
      "status": "completed",
      "progress": 100,
      "result_chapter_id": "uuid",
      "created_at": "2025-01-30T12:00:00Z",
      "updated_at": "2025-01-30T12:03:00Z"
    }
  ]
}
```

## 📅 Schedules API

### List Schedules

Get all autopilot schedules.

**Endpoint**: `GET /api/ai-writer/schedules`

**Response**:
```json
{
  "schedules": [
    {
      "id": "uuid",
      "user_id": "uuid",
      "project_id": "uuid",
      "frequency": "daily",
      "time_of_day": "14:00:00",
      "chapters_per_run": 1,
      "next_run_at": "2025-01-31T14:00:00Z",
      "last_run_at": "2025-01-30T14:00:00Z",
      "status": "active",
      "created_at": "2025-01-30T00:00:00Z",
      "project": {
        "novel": {
          "title": "Tu Tiên Đại Đạo"
        }
      }
    }
  ]
}
```

### Create Schedule

Create a new autopilot schedule.

**Endpoint**: `POST /api/ai-writer/schedules`

**Request Body**:
```json
{
  "projectId": "uuid",
  "frequency": "daily",
  "timeOfDay": "14:00",
  "chaptersPerRun": 1,
  "startNow": false
}
```

**Frequency Values**:
- `daily`: Every day
- `weekly`: Every week
- `custom`: Custom interval (future)

**Response**:
```json
{
  "schedule": {
    "id": "uuid",
    "next_run_at": "2025-01-31T14:00:00Z",
    ...
  }
}
```

### Update Schedule Status

Pause or resume a schedule.

**Endpoint**: `PATCH /api/ai-writer/schedules/:id`

**Request Body**:
```json
{
  "status": "paused" // or "active"
}
```

**Response**:
```json
{
  "success": true,
  "schedule": {
    "id": "uuid",
    "status": "paused",
    ...
  }
}
```

### Delete Schedule

Delete a schedule.

**Endpoint**: `DELETE /api/ai-writer/schedules/:id`

**Response**:
```json
{
  "success": true,
  "message": "Schedule deleted successfully"
}
```

## 📚 Chapters API

### Get Chapter

Get chapter content.

**Endpoint**: `GET /api/chapters/:id`

**Response**:
```json
{
  "chapter": {
    "id": "uuid",
    "novel_id": "uuid",
    "chapter_number": 43,
    "title": "Đột phá Kim Đan",
    "content": "Lâm Phong ngồi kiết già...",
    "created_at": "2025-01-30T12:03:00Z",
    "updated_at": "2025-01-30T12:03:00Z"
  }
}
```

### Delete Chapter

Delete a chapter (admin or owner only).

**Endpoint**: `DELETE /api/chapters/:id`

**Response**:
```json
{
  "success": true,
  "message": "Chapter deleted successfully"
}
```

## 🔧 Edge Functions

### OpenRouter Chat

Call OpenRouter API for text generation.

**Endpoint**: `POST https://<project-id>.supabase.co/functions/v1/openrouter-chat`

**Request Body**:
```json
{
  "model": "openai/gpt-4-turbo",
  "messages": [
    {
      "role": "system",
      "content": "Bạn là một nhà văn chuyên nghiệp..."
    },
    {
      "role": "user",
      "content": "Viết chương 43..."
    }
  ],
  "temperature": 0.7,
  "max_tokens": 8000
}
```

**Response**:
```json
{
  "content": "Lâm Phong ngồi kiết già...",
  "usage": {
    "prompt_tokens": 1500,
    "completion_tokens": 6500,
    "total_tokens": 8000
  }
}
```

### AI Writer Scheduler

Cron job for autopilot (called automatically).

**Endpoint**: `POST https://<project-id>.supabase.co/functions/v1/ai-writer-scheduler`

**Response**:
```json
{
  "processed": 3,
  "results": [
    {
      "scheduleId": "uuid",
      "projectId": "uuid",
      "jobId": "uuid",
      "success": true
    }
  ]
}
```

### Notify New Chapter

Send notifications for new chapter (called automatically).

**Endpoint**: `POST https://<project-id>.supabase.co/functions/v1/notify-new-chapter`

**Request Body**:
```json
{
  "novelId": "uuid",
  "chapterId": "uuid",
  "chapterNumber": 43
}
```

**Response**:
```json
{
  "success": true,
  "notificationId": "uuid",
  "recipientCount": 150
}
```

## 🚨 Error Responses

### Standard Error Format

```json
{
  "error": "Error message",
  "code": "ERROR_CODE",
  "details": {
    "field": "Additional info"
  }
}
```

### Common Error Codes

**401 Unauthorized**
```json
{
  "error": "Unauthorized",
  "code": "AUTH_REQUIRED"
}
```

**403 Forbidden**
```json
{
  "error": "Forbidden",
  "code": "INSUFFICIENT_PERMISSIONS"
}
```

**404 Not Found**
```json
{
  "error": "Resource not found",
  "code": "NOT_FOUND"
}
```

**429 Too Many Requests**
```json
{
  "error": "Rate limit exceeded",
  "code": "RATE_LIMIT_EXCEEDED",
  "details": {
    "retryAfter": 60
  }
}
```

**500 Internal Server Error**
```json
{
  "error": "Internal server error",
  "code": "INTERNAL_ERROR"
}
```

## 📊 Rate Limits

### API Routes

- **Projects**: 100 requests/minute
- **Jobs**: 10 requests/minute (create), 60 requests/minute (read)
- **Schedules**: 20 requests/minute

### Edge Functions

- **OpenRouter Chat**: 10 requests/minute
- **Scheduler**: No limit (cron only)
- **Notifications**: No limit (internal only)

## 🔍 Pagination

For endpoints that return lists, use these query parameters:

```
?page=1&limit=20
```

**Response includes**:
```json
{
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "totalPages": 5
  }
}
```

## 🔔 Webhooks (Future)

Coming soon: Webhooks for chapter completion, job failures, etc.

---

**Last Updated**: 2025-01-30
**Version**: 1.0.0