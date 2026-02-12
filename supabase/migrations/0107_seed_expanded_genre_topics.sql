-- Seed additional high-demand topics under existing genres.
-- Keeps taxonomy unchanged: no new genres.

WITH seed_data AS (
  SELECT * FROM (VALUES
    -- tien-hiep
    ('tien-hiep', 'Hồng Hoang', 'tien-hiep-hong-hoang', 'Bối cảnh thượng cổ, thần ma, thiên đạo và đại kiếp', 'Nhập Hồng Hoang, tranh đoạt cơ duyên trước các đại năng', 98, ARRAY['hong-hoang','ancient-myth','high-power']::text[]),
    ('tien-hiep', 'Khai Tông Lập Phái', 'tien-hiep-khai-tong-lap-phai', 'Từ tiểu tu sĩ xây tông môn, tranh tài nguyên và danh vọng', 'Bắt đầu từ ngoại môn, từng bước lập tông môn bất hủ', 93, ARRAY['sect-building','progression']::text[]),
    ('tien-hiep', 'Tiên Giới Kinh Doanh', 'tien-hiep-tien-gioi-kinh-doanh', 'Buôn đan dược, pháp bảo, linh tài trong giới tu tiên', 'Mở thương hội tiên giới, lấy tài phú đổi cảnh giới', 91, ARRAY['business','xianxia']::text[]),
    ('tien-hiep', 'Linh Điền Nông Trại', 'tien-hiep-linh-dien-nong-trang', 'Trồng linh dược, nuôi linh thú, vận hành nông trại tu tiên', 'Một mẫu linh điền, đổi lấy vạn năm cơ duyên', 89, ARRAY['farming','resource-management']::text[]),
    ('tien-hiep', 'Sơn Lâm Săn Thú', 'tien-hiep-son-lam-san-thu', 'Săn yêu thú, lấy nội đan, sinh tồn trong cấm địa', 'Thợ săn phàm nhân dùng yêu thú để đổi tài nguyên tu luyện', 90, ARRAY['hunting','survival']::text[]),
    ('tien-hiep', 'Hải Vực Săn Bảo', 'tien-hiep-hai-vuc-san-bao', 'Ra khơi săn bảo, bí cảnh hải đảo, tranh đoạt truyền thừa', 'Đội thuyền tu sĩ vượt hải vực tìm cổ mộ tiên nhân', 90, ARRAY['ocean','treasure-hunt']::text[]),
    ('tien-hiep', 'Mở Tiệm Net Tiên Hiệp', 'tien-hiep-mo-tiem-net', 'Đem mô hình tiệm net/game vào thế giới tu tiên', 'Mở tiệm net giúp tu sĩ mô phỏng bí cảnh để đột phá', 87, ARRAY['internet-cafe','cross-genre']::text[]),

    -- do-thi
    ('do-thi', 'Tận Thế Đô Thị', 'do-thi-tan-the', 'Đô thị sụp đổ, sinh tồn và tái thiết trật tự', 'Thành phố thất thủ, MC dựng khu an toàn giữa hỗn loạn', 97, ARRAY['apocalypse','urban-survival']::text[]),
    ('do-thi', 'Khởi Nghiệp Kinh Doanh', 'do-thi-kinh-doanh-khoi-nghiep', 'Từ người thường thành ông trùm doanh nghiệp', 'Từ quầy nhỏ ven đường thành chuỗi thương hiệu toàn quốc', 95, ARRAY['business','startup']::text[]),
    ('do-thi', 'Mở Vườn Kinh Doanh', 'do-thi-mo-vuon-kinh-doanh', 'Làm nông nghiệp đô thị, vườn hữu cơ, mô hình farm-to-table', 'Mở nông trại công nghệ cao rồi tạo đế chế thực phẩm sạch', 92, ARRAY['farming','business']::text[]),
    ('do-thi', 'Đi Biển Bắt Hải Sản', 'do-thi-di-bien-hai-san', 'Nghề biển hiện đại, săn hải sản và làm giàu', 'Một con tàu cũ giúp MC lật đời từ nghề biển', 93, ARRAY['ocean','wealth-building']::text[]),
    ('do-thi', 'Lên Núi Săn Thú', 'do-thi-len-nui-san-thu', 'Sinh tồn vùng núi, săn bắt và kinh doanh đặc sản', 'Từ thợ săn nghiệp dư thành ông vua lâm nghiệp', 91, ARRAY['hunting','mountain']::text[]),
    ('do-thi', 'Mở Tiệm Net Đô Thị', 'do-thi-mo-tiem-net', 'Kinh doanh tiệm net, esports, cộng đồng game thủ', 'Mở tiệm net cũ nát rồi thành trung tâm esports số một thành phố', 90, ARRAY['internet-cafe','esports']::text[]),
    ('do-thi', 'Võng Du Vào Hiện Thực', 'do-thi-vong-du-hien-thuc', 'Năng lực trong game ảnh hưởng trực tiếp đời thực', 'Sau bản cập nhật định mệnh, kỹ năng game xuất hiện ngoài đời', 96, ARRAY['game-to-reality','system']::text[]),

    -- khoa-huyen
    ('khoa-huyen', 'Tận Thế Khoa Huyễn', 'khoa-huyen-tan-the', 'Mạt thế kết hợp công nghệ và dị biến', 'AI phản loạn, hạ tầng sụp đổ, nhân loại co cụm thành pháo đài', 96, ARRAY['sci-fi','apocalypse']::text[]),
    ('khoa-huyen', 'Võng Du Vào Hiện Thực', 'khoa-huyen-vong-du-hien-thuc', 'Cơ chế game tràn vào đời thật theo hướng sci-fi', 'Class game kích hoạt ngoài đời sau sự kiện đồng bộ thần kinh', 94, ARRAY['game-to-reality','neural-tech']::text[]),
    ('khoa-huyen', 'Khai Hoang Tinh Cầu', 'khoa-huyen-khai-hoang-tinh-cau', 'Mở rộng thuộc địa, xây căn cứ ngoài hành tinh', 'Đội khai hoang từ con số 0 xây thành phố trên sao hoang', 92, ARRAY['space-colony','base-building']::text[]),
    ('khoa-huyen', 'Kinh Doanh Công Nghệ', 'khoa-huyen-kinh-doanh-cong-nghe', 'Startup AI, robot, biotech, cạnh tranh tập đoàn', 'Bán công nghệ lõi để đổi địa vị trong trật tự mới', 91, ARRAY['business','hard-tech']::text[]),
    ('khoa-huyen', 'Mở Tiệm Net Tương Lai', 'khoa-huyen-mo-tiem-net', 'Kinh doanh VR net-cafe, mô phỏng chiến trường tương lai', 'Một tiệm VR nhỏ thành cổng huấn luyện liên hành tinh', 89, ARRAY['internet-cafe','vr']::text[]),

    -- lich-su
    ('lich-su', 'Kinh Doanh Cổ Đại', 'lich-su-kinh-doanh', 'Buôn bán, thương hội, tuyến đường thương mại lịch sử', 'Từ tiệm nhỏ ở chợ huyện thành thương hội xuyên triều', 92, ARRAY['business','historical']::text[]),
    ('lich-su', 'Sơn Lâm Săn Thú', 'lich-su-son-lam-san-thu', 'Săn bắt nơi biên cương, sinh tồn và đổi đời', 'Thợ săn vùng núi dùng kỹ nghệ săn để lập nghiệp', 88, ARRAY['hunting','historical']::text[]),
    ('lich-su', 'Biển Cổ Đại', 'lich-su-di-bien-hai-san', 'Đội tàu cổ đại, hải thương, săn hải sản và tranh cảng', 'Từ ngư dân thành bá chủ tuyến hải thương', 89, ARRAY['ocean','historical']::text[]),
    ('lich-su', 'Mở Tiệm Net Lịch Sử', 'lich-su-mo-tiem-net', 'Nhánh xuyên thời gian: đưa mô hình net-cafe vào thời cổ', 'Xuyên không mở tiệm cờ mô phỏng chiến trận cho võ tướng luyện binh', 84, ARRAY['cross-time','internet-cafe']::text[]),

    -- huyen-huyen
    ('huyen-huyen', 'Mở Tiệm Net', 'huyen-huyen-mo-tiem-net', 'Mở tiệm net trong thế giới ma pháp/huyền huyễn', 'Game mô phỏng chiến trường giúp học viên ma pháp tăng cấp', 88, ARRAY['internet-cafe','fantasy']::text[]),
    ('huyen-huyen', 'Nông Trại Ma Pháp', 'huyen-huyen-nong-trang-ma-phap', 'Trồng nguyên liệu ma pháp, vận hành trang trại thần bí', 'Từ nông dân bị khinh thành lãnh chúa nguyên liệu ma pháp', 87, ARRAY['farming','fantasy']::text[]),
    ('huyen-huyen', 'Thương Hội', 'huyen-huyen-thuong-hoi', 'Kinh doanh thương hội, đấu trí tài chính và thế lực', 'Xây thương hội vượt ba đế quốc bằng pháp khí độc quyền', 89, ARRAY['business','guild']::text[]),
    ('huyen-huyen', 'Săn Thú Ma Vực', 'huyen-huyen-san-thu', 'Săn ma thú trong cấm khu, đổi tài nguyên tiến cấp', 'Đội săn ma thú nhỏ vươn lên thành quân đoàn huyền thoại', 86, ARRAY['hunting','dark-zone']::text[]),

    -- vong-du
    ('vong-du', 'Vào Hiện Thực', 'vong-du-vao-hien-thuc', 'Thế giới game hòa vào đời thật, kỹ năng dùng ngoài đời', 'Sau biến cố máy chủ, toàn dân nhận class ngoài đời', 99, ARRAY['game-to-reality','system']::text[]),
    ('vong-du', 'Toàn Dân Chuyển Chức', 'vong-du-toan-dan-chuyen-chuc', 'Mỗi người thức tỉnh nghề nghiệp và cây kỹ năng', 'MC sở hữu nghề ẩn phá vỡ meta toàn dân', 96, ARRAY['class-awakening','progression']::text[]),
    ('vong-du', 'Lãnh Địa Công Hội', 'vong-du-linh-dia-cong-hoi', 'Xây thành, giữ đất, chiến tranh công hội liên server', 'Từ guild vô danh thành thế lực thống trị bản đồ', 93, ARRAY['guild-war','territory']::text[]),
    ('vong-du', 'Kinh Tế Game', 'vong-du-kinh-te-game', 'Đầu cơ vật phẩm, thương trường trong game và đời thực', 'Lật thị trường đấu giá bằng hệ thống phân tích giá', 92, ARRAY['game-economy','trading']::text[]),
    ('vong-du', 'Đời Sống Nghề Nghiệp', 'vong-du-doi-song-nghe-nghiep', 'Nghề phụ, crafting, sản xuất tạo lợi thế dài hạn', 'Thợ rèn bị coi thường thành nhà cung ứng thần trang', 90, ARRAY['crafting','life-skills']::text[])
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
