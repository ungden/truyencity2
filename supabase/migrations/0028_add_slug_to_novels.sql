-- Add slug column for SEO-friendly URLs
-- Example: /truyen/ta-co-the-nhin-thay-gia-tri instead of /novel/6d798afb-...

ALTER TABLE novels ADD COLUMN IF NOT EXISTS slug TEXT UNIQUE;

-- Create index for fast slug lookups
CREATE INDEX IF NOT EXISTS idx_novels_slug ON novels(slug);

-- Function to generate slug from Vietnamese title
CREATE OR REPLACE FUNCTION generate_novel_slug(title TEXT) RETURNS TEXT AS $$
DECLARE
  result TEXT;
BEGIN
  result := lower(title);
  -- Remove Vietnamese diacritics
  result := translate(result,
    'áàảãạăắằẳẵặâấầẩẫậéèẻẽẹêếềểễệíìỉĩịóòỏõọôốồổỗộơớờởỡợúùủũụưứừửữựýỳỷỹỵđ',
    'aaaaaaaaaaaaaaaaaeeeeeeeeeeeiiiiiooooooooooooooooouuuuuuuuuuuyyyyyd');
  -- Remove special characters, keep alphanumeric and spaces
  result := regexp_replace(result, '[^a-z0-9\s-]', '', 'g');
  -- Replace whitespace with hyphens
  result := regexp_replace(result, '\s+', '-', 'g');
  -- Remove consecutive hyphens
  result := regexp_replace(result, '-+', '-', 'g');
  -- Trim leading/trailing hyphens
  result := trim(both '-' from result);
  -- Limit length
  result := substring(result from 1 for 120);
  RETURN result;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Backfill slugs for all existing novels
-- Append a short suffix from id if there's a collision
DO $$
DECLARE
  rec RECORD;
  base_slug TEXT;
  final_slug TEXT;
  suffix INT := 0;
BEGIN
  FOR rec IN SELECT id, title FROM novels WHERE slug IS NULL ORDER BY created_at
  LOOP
    base_slug := generate_novel_slug(rec.title);
    final_slug := base_slug;
    suffix := 0;

    -- Handle collision by appending number
    WHILE EXISTS (SELECT 1 FROM novels WHERE slug = final_slug AND id != rec.id) LOOP
      suffix := suffix + 1;
      final_slug := base_slug || '-' || suffix;
    END LOOP;

    UPDATE novels SET slug = final_slug WHERE id = rec.id;
  END LOOP;
END;
$$;

-- Make slug NOT NULL after backfill
ALTER TABLE novels ALTER COLUMN slug SET NOT NULL;

-- Trigger to auto-generate slug on INSERT if not provided
CREATE OR REPLACE FUNCTION auto_generate_novel_slug() RETURNS TRIGGER AS $$
DECLARE
  base_slug TEXT;
  final_slug TEXT;
  suffix INT := 0;
BEGIN
  IF NEW.slug IS NULL OR NEW.slug = '' THEN
    base_slug := generate_novel_slug(NEW.title);
    final_slug := base_slug;

    WHILE EXISTS (SELECT 1 FROM novels WHERE slug = final_slug AND id != NEW.id) LOOP
      suffix := suffix + 1;
      final_slug := base_slug || '-' || suffix;
    END LOOP;

    NEW.slug := final_slug;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trg_novels_auto_slug
  BEFORE INSERT ON novels
  FOR EACH ROW
  EXECUTE FUNCTION auto_generate_novel_slug();
