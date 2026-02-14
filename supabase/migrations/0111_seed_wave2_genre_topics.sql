-- Wave 2: Seed additional genre topics covering summoning, apocalypse variants,
-- business variants, transmigration, horror, livestream, culinary, tower, and more.
-- Keeps taxonomy unchanged: no new genres, only new topics under existing 7 genres.

WITH seed_data AS (
  SELECT * FROM (VALUES
    -- ═══════════════════════════════════════════════════════════════════
    -- tien-hiep  (5 new topics)
    -- ═══════════════════════════════════════════════════════════════════
    ('tien-hiep', 'Triệu Hoán Thần Thú', 'tien-hiep-trieu-hoan-than-thu',
     'Triệu hoán, ký khế và tiến hóa linh thú/thần thú để chiến đấu trong tu tiên giới',
     'Triệu hoán sư phế vật nhưng linh thú đầu tiên là viễn cổ thần thú ngụy trang',
     95, ARRAY['summoning','pet','xianxia']::text[]),

    ('tien-hiep', 'Tu Tiên Gia Tộc', 'tien-hiep-gia-toc',
     'Xây dựng gia tộc tu tiên hưng thịnh xuyên nhiều thế hệ, tích lũy truyền thừa',
     'Từ gia tộc phàm nhân, trải 10 đời tích lũy thành đại gia tộc tu tiên',
     92, ARRAY['family-building','multi-generation','xianxia']::text[]),

    ('tien-hiep', 'Tu Tiên Trực Bá', 'tien-hiep-truc-ba',
     'Livestream quá trình tu tiên cho phàm nhân hoặc giới tu tiên xem',
     'Hệ thống phát sóng tu tiên, triệu người phàm xem MC đột phá Kim Đan',
     88, ARRAY['livestream','xianxia','reaction']::text[]),

    ('tien-hiep', 'Mô Phỏng Khí Tu Tiên', 'tien-hiep-mo-phong-khi',
     'Hệ thống cho phép mô phỏng kiếp sống tu tiên, rút kinh nghiệm rồi áp dụng thực tế',
     'Kiếp mô phỏng thứ 3721: Bạn chết ở Trúc Cơ vì trúng độc. Nhận được: Bách Độc Bất Xâm',
     94, ARRAY['simulator','system','xianxia']::text[]),

    ('tien-hiep', 'Đan Sư / Luyện Khí Sư', 'tien-hiep-dan-su',
     'Chuyên nghề phụ tu tiên: luyện đan, chế khí, phù lục — kết hợp thương mại và tu luyện',
     'Phế vật tu luyện nhưng thiên tài luyện đan, dùng đan dược đổi lấy tài nguyên đột phá',
     91, ARRAY['crafting','alchemy','business']::text[]),

    -- ═══════════════════════════════════════════════════════════════════
    -- huyen-huyen  (8 new topics)
    -- ═══════════════════════════════════════════════════════════════════
    ('huyen-huyen', 'Triệu Hoán Ngự Thú', 'huyen-huyen-trieu-hoan-thu',
     'Toàn dân triệu hoán/ngự thú, tiến hóa pet, thi đấu thú',
     'Toàn dân thức tỉnh khế ước thú, MC triệu hoán được phế vật nhưng thực ra là viễn cổ thần thú',
     96, ARRAY['summoning','pet','evolution']::text[]),

    ('huyen-huyen', 'Triệu Hoán Vạn Tộc', 'huyen-huyen-trieu-hoan-van-toc',
     'Triệu hoán binh chủng/chủng tộc đa dạng, xây quân đoàn chinh phạt',
     'Triệu hoán Long Kỵ Binh, Tinh Linh Cung Thủ, Vong Linh Quân Đoàn thống nhất đại lục',
     93, ARRAY['summoning','army-building','strategy']::text[]),

    ('huyen-huyen', 'Toàn Dân Lãnh Chủ', 'huyen-huyen-toan-dan-lanh-chu',
     'Mỗi người nhận lãnh địa ở dị giới, xây dựng, phát triển và chinh phạt',
     'Toàn cầu dịch chuyển vào dị giới, mỗi người nhận 1 lãnh địa, MC mở được lãnh địa SSS cấp',
     97, ARRAY['territory','base-building','strategy']::text[]),

    ('huyen-huyen', 'Vô Hạn Lưu', 'huyen-huyen-vo-han-luu',
     'Vào phó bản/thế giới phim kinh dị lặp đi lặp lại, sống sót theo quy tắc hoặc chết',
     'Bị kéo vào không gian chính, mỗi nhiệm vụ là một bộ phim kinh dị, hoàn thành hoặc chết',
     95, ARRAY['infinite-loop','horror','survival']::text[]),

    ('huyen-huyen', 'Quỷ Mật / Linh Dị', 'huyen-huyen-quy-mat',
     'Thế giới quỷ dị, thần bí với hệ thống sức mạnh dựa trên quy tắc siêu nhiên',
     'Mỗi Dị Tượng tuân theo quy tắc riêng, MC phải suy luận quy tắc trước khi bị giết',
     94, ARRAY['occult','mystery','horror']::text[]),

    ('huyen-huyen', 'Tử Linh Pháp Sư', 'huyen-huyen-tu-linh-phap-su',
     'Vong linh triệu hoán, chỉ huy đội quân xác sống/vong linh, dark fantasy',
     'Pháp sư bóng tối bị truy sát, lặng lẽ xây quân đoàn vong linh từ chiến trường cũ',
     90, ARRAY['necromancer','dark-fantasy','army-building']::text[]),

    ('huyen-huyen', 'Bá Tháp / Phó Bản', 'huyen-huyen-ba-thap',
     'Leo tháp vô tận hoặc phó bản bí ẩn, mỗi tầng/phó bản một thử thách và phần thưởng',
     'Tháp 10.000 tầng giáng xuống đại lục, ai lên đỉnh sẽ thành thần',
     93, ARRAY['tower-climbing','dungeon','progression']::text[]),

    ('huyen-huyen', 'Học Viện Ma Pháp', 'huyen-huyen-hoc-vien',
     'Học viện pháp sư/chiến binh, xếp hạng thi đấu, tình bạn và âm mưu học đường huyền huyễn',
     'Tân sinh viên phế vật vào học viện đệ nhất, từng bước vươn lên đỉnh bảng xếp hạng',
     91, ARRAY['academy','school','tournament']::text[]),

    -- ═══════════════════════════════════════════════════════════════════
    -- do-thi  (10 new topics)
    -- ═══════════════════════════════════════════════════════════════════
    ('do-thi', 'Văn Ngu (Văn Sao)', 'do-thi-van-ngu',
     'Xuyên đến thế giới song song, sáng tác lại các tác phẩm kinh điển từ Trái Đất gốc',
     'Xuyên đến thế giới không có Kim Dung, viết lại Xạ Điêu Anh Hùng Truyện gây chấn động',
     96, ARRAY['literary','entertainment','parallel-world']::text[]),

    ('do-thi', 'Chú Tế / Long Vương', 'do-thi-chu-te',
     'Rể hờ bị khinh thường thật ra là cường giả/phú hào ẩn mình, face-slapping liên hoàn',
     'Ba năm rể hờ bị nhục, một ngày thân phận chân long phơi bày, cả gia tộc vợ quỳ',
     97, ARRAY['face-slapping','hidden-identity','power-fantasy']::text[]),

    ('do-thi', 'Thần Y Đô Thị', 'do-thi-than-y',
     'Y thuật thần kỳ trong đô thị, chữa bệnh nan y, kết giao quyền quý',
     'Thanh niên nghèo thừa kế y thuật cổ, chữa bệnh cho tổng tài → mở ra thế giới thượng lưu',
     93, ARRAY['medical','urban','power-fantasy']::text[]),

    ('do-thi', 'Giám Bảo Kiểm Lậu', 'do-thi-giam-bao',
     'Nhận diện giá trị cổ vật/báu vật, mua rẻ bán đắt, thế giới đồ cổ',
     'Nhặt được cặp mắt thiên nhãn, nhìn thấu chân giả cổ vật, từ vé số trúng đến ông trùm đồ cổ',
     92, ARRAY['antique','treasure','appraisal']::text[]),

    ('do-thi', 'Mỹ Thực Đô Thị', 'do-thi-my-thuc',
     'Nấu ăn thần cấp, thi đấu ẩm thực, mở nhà hàng, food porn text',
     'Đầu bếp vỉa hè có bàn tay vàng, từ xe hủ tiếu thành chuỗi nhà hàng Michelin',
     91, ARRAY['culinary','food','business']::text[]),

    ('do-thi', 'Hoang Dã Trực Bá', 'do-thi-hoang-da-truc-ba',
     'Livestream sinh tồn hoang dã, câu cá, săn bắt, thám hiểm',
     'MC livestream câu cá biển sâu, vô tình kéo lên cá quý tiền tỷ, chat room nổ tung',
     93, ARRAY['livestream','survival','fishing']::text[]),

    ('do-thi', 'Giải Trí Quyền', 'do-thi-giai-tri',
     'Làm minh tinh, ca sĩ, idol, xây đế chế giải trí trong thế giới song song',
     'Trùng sinh thành diễn viên quần chúng, dùng kinh nghiệm kiếp trước thành ảnh đế',
     94, ARRAY['entertainment','celebrity','showbiz']::text[]),

    ('do-thi', 'Quy Tắc Quái Đàm', 'do-thi-quy-tac-quai-dam',
     'Horror dựa trên quy tắc bí ẩn, sống sót bằng suy luận và tuân thủ quy tắc đúng',
     'Nếu tài xế xe buýt cười, hãy xuống xe ngay. Nếu không cười, ĐỪNG xuống xe.',
     95, ARRAY['horror','rule-based','mystery']::text[]),

    ('do-thi', 'Thần Hào Hệ Thống', 'do-thi-than-hao',
     'Hệ thống cho tiền vô hạn nhưng phải tiêu đúng cách, challenge tiêu tiền',
     'Tiêu 10 tỷ trong 24 giờ, không được cho ai, không được mua bất động sản. Bắt đầu!',
     90, ARRAY['system','comedy','money']::text[]),

    ('do-thi', 'Thiên Tai Tị Nạn', 'do-thi-thien-tai',
     'Chuẩn bị và sinh tồn qua thiên tai: động đất, lũ lụt, núi lửa, băng hà',
     'MC biết trước đại động đất sẽ xảy ra, tích trữ vật tư và xây bunker',
     89, ARRAY['disaster','survival','prepper']::text[]),

    -- ═══════════════════════════════════════════════════════════════════
    -- khoa-huyen  (5 new topics)
    -- ═══════════════════════════════════════════════════════════════════
    ('khoa-huyen', 'Trùng Tộc Tận Thế', 'khoa-huyen-trung-toc',
     'Đại dịch côn trùng khổng lồ/sinh vật kiểu tổ ong tấn công, nhân loại sinh tồn',
     'Côn trùng đột biến tràn ngập thành phố, MC dẫn đội sinh tồn chống lại trùng mẫu hoàng hậu',
     91, ARRAY['insect','apocalypse','survival']::text[]),

    ('khoa-huyen', 'Băng Hà Tận Thế', 'khoa-huyen-bang-ha',
     'Kỷ băng hà mới, sinh tồn trong giá lạnh cực đoan, tranh giành nhiên liệu và thức ăn',
     'Nhiệt độ toàn cầu giảm -80°C, MC dẫn đoàn người di cư tìm vùng đất ấm cuối cùng',
     90, ARRAY['ice-age','apocalypse','survival']::text[]),

    ('khoa-huyen', 'Phế Thổ Tận Thế', 'khoa-huyen-phe-tho',
     'Hậu hạt nhân/thảm họa, wasteland hoang tàn, thu nhặt phế liệu tái xây văn minh',
     'Đại chiến hạt nhân 50 năm trước, MC là scavenger lặn vào phế tích tìm công nghệ cũ',
     92, ARRAY['wasteland','post-nuclear','scavenging']::text[]),

    ('khoa-huyen', 'Toàn Cầu Tiến Hóa', 'khoa-huyen-toan-cau-tien-hoa',
     'Nhân loại buộc tiến hóa qua hệ thống toàn cầu, xếp hạng thế giới, sinh tồn cạnh tranh',
     'Hệ thống toàn cầu giáng xuống, mỗi người nhận class và nhiệm vụ, xếp hạng thế giới bắt đầu',
     96, ARRAY['global-evolution','system','ranking']::text[]),

    ('khoa-huyen', 'Toàn Dân Tinh Tế', 'khoa-huyen-toan-dan-tinh-te',
     'Mỗi người nhận phi thuyền hoặc hành tinh riêng, khai phá vũ trụ quy mô toàn dân',
     'Toàn cầu thức tỉnh, mỗi người nhận 1 phi thuyền, MC nhận được phi thuyền cấp huyền thoại',
     89, ARRAY['space','fleet','base-building']::text[]),

    -- ═══════════════════════════════════════════════════════════════════
    -- lich-su  (8 new topics)
    -- ═══════════════════════════════════════════════════════════════════
    ('lich-su', 'Triệu Hoán Vũ Tướng', 'lich-su-trieu-hoan-vu-tuong',
     'Triệu hoán danh tướng lịch sử chiến đấu, gacha tướng, xây quân đoàn huyền thoại',
     'Hệ thống triệu hoán danh tướng: lần đầu triệu hoán ra Triệu Vân, xây đội quân vô địch',
     97, ARRAY['summoning','generals','strategy']::text[]),

    ('lich-su', 'Triệu Hoán Văn Thần', 'lich-su-trieu-hoan-van-than',
     'Triệu hoán mưu sĩ/văn thần lịch sử để trị quốc, phát triển kinh tế, ngoại giao',
     'Triệu hoán Phạm Lãi quản lý tài chính, Trương Lương bày mưu, Bao Thanh Thiên xử án',
     94, ARRAY['summoning','strategists','governance']::text[]),

    ('lich-su', 'Xuyên Không Khai Công Xưởng', 'lich-su-khai-cong-xuong',
     'Xuyên về cổ đại mở nhà máy, đưa cách mạng công nghiệp sớm hàng trăm năm',
     'Kỹ sư hiện đại xuyên về thời Tống, từ xưởng rèn nhỏ tạo ra cách mạng công nghiệp mini',
     93, ARRAY['industry','factory','transmigration']::text[]),

    ('lich-su', 'Xuyên Không Cơ Kiến', 'lich-su-co-kien',
     'Xuyên không xây hạ tầng: đường, đập, kênh đào — thay đổi vận mệnh quốc gia bằng xây dựng',
     'Kỹ sư xây dựng xuyên về cổ đại, đắp đê trị thủy cứu vạn dân, xây đường nối liền biên cương',
     92, ARRAY['infrastructure','construction','transmigration']::text[]),

    ('lich-su', 'Xuyên Không Quân Sự', 'lich-su-quan-su',
     'Cải cách quân sự bằng kiến thức hiện đại: chiến thuật, vũ khí, huấn luyện, hậu cần',
     'Sĩ quan đặc nhiệm xuyên về thời loạn, dùng chiến thuật hiện đại biến dân binh thành quân đội bất bại',
     95, ARRAY['military','warfare','transmigration']::text[]),

    ('lich-su', 'Xuyên Không Đại Phu', 'lich-su-dai-phu',
     'Làm thầy thuốc ở cổ đại bằng y học hiện đại, cứu người thay đổi vận mệnh',
     'Bác sĩ phẫu thuật xuyên về thời Minh, từ lang y vô danh thành thần y triều đình',
     91, ARRAY['medical','transmigration','historical']::text[]),

    ('lich-su', 'Cổ Đại Mỹ Thực', 'lich-su-my-thuc',
     'Nấu ăn kiểu hiện đại trong bối cảnh cổ đại, mở tửu lâu, chinh phục vị giác hoàng tộc',
     'Đầu bếp xuyên về Đường triều, xào rau bằng dầu thay mỡ khiến cả kinh thành xếp hàng',
     90, ARRAY['culinary','food','transmigration']::text[]),

    ('lich-su', 'Du Lịch Xuyên Thời', 'lich-su-du-lich-xuyen-thoi',
     'Dẫn người hiện đại về cổ đại du lịch, mở khu du lịch, thuê người cổ đại làm việc',
     'MC mở cổng thời gian, dẫn du khách thế kỷ 21 sang Tam Quốc trải nghiệm, vé 100 triệu/chuyến',
     88, ARRAY['tourism','time-travel','business']::text[]),

    -- ═══════════════════════════════════════════════════════════════════
    -- dong-nhan  (4 new topics)
    -- ═══════════════════════════════════════════════════════════════════
    ('dong-nhan', 'Triệu Hoán Ảnh Thị', 'dong-nhan-trieu-hoan-anh-thi',
     'Triệu hoán nhân vật từ phim, anime, game, tiểu thuyết — cross-universe army',
     'Hệ thống triệu hoán đa vũ trụ: Naruto + Goku + Iron Man + Lữ Bố trong cùng 1 đội',
     95, ARRAY['summoning','crossover','anime']::text[]),

    ('dong-nhan', 'Xuyên Thư / Khoái Xuyên', 'dong-nhan-xuyen-thu',
     'Xuyên vào thế giới tiểu thuyết, nhảy giữa nhiều thế giới sách hoàn thành nhiệm vụ',
     'MC xuyên vào từng cuốn tiểu thuyết, phải sửa bug cốt truyện trước khi thế giới sụp đổ',
     94, ARRAY['transmigration','book-world','quick-transmigration']::text[]),

    ('dong-nhan', 'Liêu Thiên Quần', 'dong-nhan-lieu-thien-quan',
     'Nhóm chat xuyên vũ trụ với nhân vật fiction từ nhiều thế giới khác nhau',
     'MC gia nhập group chat có Lý Bạch, Tôn Ngộ Không, Batman, Voldemort',
     93, ARRAY['chat-group','crossover','trade']::text[]),

    ('dong-nhan', 'Chư Thiên Trực Bá', 'dong-nhan-chu-thien-truc-ba',
     'Livestream xuyên vạn giới cho người ở nhiều thế giới cùng xem và phản ứng',
     'MC phát sóng trực tiếp cuộc đời các anh hùng/phản diện, người ở vạn giới comment sôi nổi',
     92, ARRAY['livestream','crossover','reaction']::text[]),

    -- ═══════════════════════════════════════════════════════════════════
    -- vong-du  (4 new topics)
    -- ═══════════════════════════════════════════════════════════════════
    ('vong-du', 'Phó Bản Lưu', 'vong-du-pho-ban',
     'Dungeon/instance hoàn chỉnh, clear hoặc chết, mỗi phó bản một thế giới riêng',
     'Cánh cổng phó bản xuất hiện khắp nơi, MC xông vào clear để nhận phần thưởng và mạnh lên',
     94, ARRAY['dungeon','instance','survival']::text[]),

    ('vong-du', 'NPC Giác Tỉnh', 'vong-du-npc',
     'MC là NPC trong game, có ý thức riêng, phải đối phó với người chơi và hệ thống game',
     'MC thức tỉnh thành NPC thợ rèn trong MMORPG, người chơi ép quest nhưng MC muốn sống tự do',
     92, ARRAY['npc','reverse-perspective','self-aware']::text[]),

    ('vong-du', 'Toàn Cầu Giáng Lâm', 'vong-du-toan-cau-giang-lam',
     'Tháp/phó bản/dungeon rơi từ trời xuống Trái Đất, toàn nhân loại buộc phải chinh phục',
     'Tháp 100 tầng giáng xuống mỗi thành phố, không ai được phép từ chối — clear hoặc thành phố bị xóa',
     96, ARRAY['tower','global-descent','apocalypse']::text[]),

    ('vong-du', 'Mô Phỏng Khí Game', 'vong-du-mo-phong-khi',
     'Mô phỏng trước kết quả/tương lai rồi chọn đường tối ưu trong game hoặc đời thực',
     'Mô phỏng #847: Bạn chọn class Thần Xạ, chết ở tầng 37 vì boss AoE. Phần thưởng: Kỹ năng Né Tránh',
     93, ARRAY['simulator','system','optimization']::text[])

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
