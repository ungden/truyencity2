CREATE TABLE IF NOT EXISTS public.app_versions (
  platform TEXT NOT NULL CHECK (platform IN ('ios','android')),
  latest_version TEXT NOT NULL,           -- "1.0.2" (semver)
  latest_build TEXT NOT NULL,             -- "1" iOS buildNumber / Android versionCode
  min_supported_version TEXT NOT NULL,    -- "1.0.0" — below this = force update
  store_url TEXT NOT NULL,                -- App Store / Play Store URL
  release_notes TEXT,                     -- "Sửa lỗi TTS, tăng tốc tải truyện, ..."
  force_update BOOLEAN NOT NULL DEFAULT false, -- override min_supported (emergency)
  released_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (platform)
);

ALTER TABLE public.app_versions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anyone can read app_versions" ON public.app_versions;
CREATE POLICY "anyone can read app_versions" ON public.app_versions
  FOR SELECT USING (true);

-- Seed iOS row
INSERT INTO public.app_versions (platform, latest_version, latest_build, min_supported_version, store_url, release_notes)
VALUES (
  'ios',
  '1.0.2',
  '1',
  '1.0.0',
  'https://apps.apple.com/us/app/truy%E1%BB%87n-city-truy%E1%BB%87n-ch%E1%BB%AF/id6759160705',
  'Phiên bản mới — đọc truyện mượt hơn, sửa lỗi TTS, cải thiện hiệu năng.'
)
ON CONFLICT (platform) DO NOTHING;

-- Seed Android (placeholder until app is submitted)
INSERT INTO public.app_versions (platform, latest_version, latest_build, min_supported_version, store_url, release_notes)
VALUES (
  'android',
  '1.0.2',
  '2',
  '1.0.0',
  'https://play.google.com/store/apps/details?id=com.truyencity.app',
  'Phiên bản mới — đọc truyện mượt hơn, sửa lỗi TTS, cải thiện hiệu năng.'
)
ON CONFLICT (platform) DO NOTHING;;
