-- Wave 3: Seed 5 top-tier genre topics (Vô Địch, Phản Phái, Bộc Quang, Cá Mặn, Tứ Hợp Viện)

WITH seed_data AS (
  SELECT * FROM (VALUES
    -- ═══════════════════════════════════════════════════════════════════
    -- huyen-huyen (3 new topics)
    -- ═══════════════════════════════════════════════════════════════════
    ('huyen-huyen', 'Vô Địch Lưu', 'huyen-huyen-vo-dich-luu',
     'MC mạnh vô địch ngay từ đầu, giả heo ăn hổ, đi dạo nhân gian',
     'Vừa xuyên không đã là cảnh giới cao nhất, nhận đồ đệ phế vật rồi đào tạo thành thần',
     97, ARRAY['overpowered','invincible','comedy']::text[]),

    ('huyen-huyen', 'Phản Phái Lưu', 'huyen-huyen-phan-phai-luu',
     'Xuyên thành nhân vật phản diện, cướp đoạt cơ duyên và hồng nhan của Thiên Mệnh Chi Tử',
     'Trở thành thiếu gia phản diện sắp bị main đánh chết, dùng hệ thống cướp đoạt khí vận để lật kèo',
     96, ARRAY['villain','system','faceslap']::text[]),

    ('huyen-huyen', 'Bộc Quang Lưu / Ký Ức Lộ Ra', 'huyen-huyen-boc-quang-luu',
     'MC bị hiểu lầm là ác ma tàn bạo, khi sắp chết thì ký ức quá khứ được chiếu cho cả thiên hạ xem',
     'Thiên hạ bủa vây giết Ma Đế, nhưng khi Ký Ức phơi bày, mọi người mới biết hắn đã gánh vác mọi tội lỗi',
     94, ARRAY['misunderstanding','tragedy','regret']::text[]),

    -- ═══════════════════════════════════════════════════════════════════
    -- do-thi (2 new topics)
    -- ═══════════════════════════════════════════════════════════════════
    ('do-thi', 'Cá Mặn Lưu (Nằm Vạ)', 'do-thi-ca-man-luu',
     'MC cực kỳ lười biếng, chỉ muốn sống qua ngày nhưng hệ thống/hoàn cảnh cứ ép phải thành cường giả/tỷ phú',
     'Hệ thống bắt làm nhiệm vụ nguy hiểm, MC từ chối chọn nằm ngủ, hệ thống tức điên đành phải thưởng điểm Bất Tử',
     93, ARRAY['lazy','comedy','system']::text[]),

    ('do-thi', 'Tứ Hợp Viện / Niên Đại Văn', 'do-thi-tu-hop-vien',
     'Xuyên về thời bao cấp (thập niên 60-80), sống trong khu tập thể với những người hàng xóm "cầm thú"',
     'Trở về năm 1960, mỗi ngày đấu trí với mấy bà thím hàng xóm hay ăn cắp vặt, tự xây dựng cuộc sống sung túc',
     91, ARRAY['historical','slice-of-life','drama']::text[])

  ) AS t(genre_id, name, id, description, example, sort_order, tags)
)
INSERT INTO genre_topics (genre_id, name, id, description, example, sort_order, tags)
SELECT genre_id, name, id, description, example, sort_order, tags FROM seed_data
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  example = EXCLUDED.example,
  sort_order = EXCLUDED.sort_order,
  tags = EXCLUDED.tags;
