UPDATE novels
SET hidden = true
WHERE hidden = false
  AND COALESCE(chapter_count, 0) = 0;;
