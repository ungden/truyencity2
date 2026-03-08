-- Reduce daily chapter quota from 20 to 5 per project
ALTER TABLE project_daily_quotas ALTER COLUMN target_chapters SET DEFAULT 5;

-- Update today's active quotas that haven't reached 5 yet
UPDATE project_daily_quotas
SET target_chapters = 5
WHERE vn_date = (NOW() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date
  AND status = 'active'
  AND written_chapters < 5;

-- For quotas that already wrote >= 5 today, mark them completed
UPDATE project_daily_quotas
SET target_chapters = 5, status = 'completed'
WHERE vn_date = (NOW() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date
  AND status = 'active'
  AND written_chapters >= 5;
