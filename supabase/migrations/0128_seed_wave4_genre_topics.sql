-- Wave 4: Seed 10 new trending genre topics (World Creator, Literary Dao, Fourth Disaster, etc.)

WITH seed_data AS (
  SELECT * FROM (VALUES
    -- ═══════════════════════════════════════════════════════════════════
    -- huyen-huyen (4 new topics)
    -- ═══════════════════════════════════════════════════════════════════
    ('huyen-huyen', 'Sáng Thế Lưu / Sân Cát', 'huyen-huyen-sang-the',
     'Nuôi cấy một thế giới trong hộp cát (sandbox). Tua nhanh thời gian, quan sát nền văn minh',
     'Tìm được một cái rương, bên trong là một tinh cầu thu nhỏ. Tua nhanh 1 ngày = 1 vạn năm',
     98, ARRAY['creator','god-simulator','civilization']::text[]),

    ('huyen-huyen', 'Tiến Hóa Quái Vật (Dị Thú Lưu)', 'huyen-huyen-tien-hoa-quai-vat',
     'Xuyên qua không làm người, biến thành thú, côn trùng, thực vật. Nuốt chửng vạn vật để tiến hóa',
     'Trùng sinh thành một cây liễu, rễ cắm sâu vào địa ngục, cành đâm thủng cửu tiêu',
     94, ARRAY['monster','evolution','non-human']::text[]),

    ('huyen-huyen', 'Thần Bút / Viết Sách Hiện Thực', 'huyen-huyen-than-but',
     'Viết truyện tạo ra sức mạnh thực tế. Độc giả lĩnh ngộ võ công, tác giả triệu hoán nhân vật',
     'Viết xong Tây Du Ký, có người lĩnh ngộ 72 phép thần thông, MC thì vung bút gọi ra Tôn Ngộ Không',
     97, ARRAY['literary','creation','summoning']::text[]),

    ('huyen-huyen', 'Thu Đồ Lưu (Sư Tôn Vô Địch)', 'huyen-huyen-thu-do-de',
     'Thu nhận toàn đồ đệ Khí Vận Chi Tử. Đồ đệ tu luyện, MC nhận lại sức mạnh x100',
     'Thu nhận cô bé bị từ hôn làm đồ đệ, hóa ra nàng là Nữ Đế trùng sinh',
     95, ARRAY['master-disciple','system','comedy']::text[]),

    -- ═══════════════════════════════════════════════════════════════════
    -- do-thi (3 new topics)
    -- ═══════════════════════════════════════════════════════════════════
    ('do-thi', 'Lưỡng Giới Mậu Dịch', 'do-thi-luong-gioi-mau-dich',
     'Mở cánh cửa nối liền hiện đại và dị giới/cổ đại. Làm con buôn không gian, mua rẻ bán đắt',
     'Đem mì gói, súng AK sang thế giới tu tiên đổi lấy đan dược, hoàng kim, mỹ nữ',
     95, ARRAY['trade','portal','business']::text[]),

    ('do-thi', 'Nghề Nghiệp Ẩn / Chuyên Gia Ngách', 'do-thi-nghe-nghiep-an',
     'Làm những nghề nghiệp kỳ lạ nhưng nắm giữ năng lực siêu phàm nhờ hệ thống',
     'Hệ thống thợ trang điểm thi hài, chạm vào xác chết để biết quá khứ và giải oan',
     91, ARRAY['profession','urban-fantasy','mystery']::text[]),

    ('do-thi', 'Làm Game Thế Giới Song Song', 'do-thi-lam-game',
     'Đem các siêu phẩm game của Trái Đất sang dị giới phát hành, thu oán niệm của người chơi',
     'MC phát hành Resident Evil dọa khóc toàn cầu, phát hành Dark Souls hành hạ cao thủ dị giới',
     96, ARRAY['game-dev','entertainment','comedy']::text[]),

    -- ═══════════════════════════════════════════════════════════════════
    -- vong-du (1 new topic)
    -- ═══════════════════════════════════════════════════════════════════
    ('vong-du', 'Đệ Tứ Thiên Tai', 'vong-du-de-tu-thien-tai',
     'MC triệu hoán game thủ Trái Đất sang dị giới dưới dạng nhân vật game bất tử để làm cu li',
     'MC làm NPC phát nhiệm vụ, lừa game thủ đi đánh rồng rồi thu chiến lợi phẩm',
     99, ARRAY['fourth-disaster','game-system','comedy']::text[])

  ) AS t(genre_id, name, slug, description, example, popularity_score, tags)
)
INSERT INTO genre_topics (
  genre_id,
  name,
  slug,
  description,
  example,
  status,
  display_order,
  popularity_score,
  tags,
  source_refs,
  locale
)
SELECT
  s.genre_id,
  s.name,
  s.slug,
  s.description,
  s.example,
  'active',
  500,
  s.popularity_score,
  s.tags,
  ARRAY['qidian', 'zongheng', 'faloo']::text[],
  'vi'
FROM seed_data s
WHERE NOT EXISTS (
  SELECT 1
  FROM genre_topics gt
  WHERE gt.genre_id = s.genre_id
    AND gt.slug = s.slug
);