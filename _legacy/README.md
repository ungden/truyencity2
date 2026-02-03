# Legacy Files

This folder contains the old AI Writer system that has been replaced by the new **Story Factory** system.

## What was replaced

The old system had:
- `/admin/ai-writer` - Manual chapter writing interface
- `/admin/story-factory` - Original story factory workflow
- `/api/ai-writer/*` - Various API routes for jobs, schedules, projects
- `/api/story-factory/*` - Planning and writing APIs
- `/services/ai-story-writer.ts` - AI story generation service

## New System

The new **Story Factory** is located at:
- **Admin UI**: `/admin/factory/*` (dashboard, ideas, blueprints, production, publishing, authors, errors, config)
- **API Routes**: `/api/factory/*` (dashboard, config, control, bootstrap, ideas, blueprints, production, publishing, authors, errors)
- **Services**: `/services/factory/*` (orchestrator, idea-bank, blueprint-factory, chapter-writer, production-manager, publishing-scheduler, quality-controller, author-manager, error-handler, gemini-client, gemini-image)
- **Edge Functions**: `/supabase/functions/factory-*` (main-loop, daily-tasks, writer-worker, publisher)
- **Database**: Migration `0022_create_factory_tables.sql` with 10 new tables

## Restoration

If you need to restore any of these files, simply move them back to their original locations in `src/`.

## Moved on: 2026-02-04
