export const GENRE_CONFIG = {
  'tien-hiep': {
    name: 'Tiên Hiệp',
    icon: '⚔️',
    requiredFields: ['cultivation_system'],
    optionalFields: ['world_description', 'cultivation_levels'],
    aiPromptCategory: 'cultivation',
    description: 'Truyện tu tiên, tu luyện, hệ thống sức mạnh đặc trưng',
    example: 'Luyện Khí → Trúc Cơ → Kim Đan...',
    compositionTargets: {
      dialogue: [35, 45],
      description: [40, 50],
      inner: [10, 20]
    },
    topics: [
      { 
        id: 'tien-hiep-co-dien', 
        name: 'Cổ Điển', 
        description: 'Tu tiên truyền thống, hệ thống tu luyện cổ điển',
        example: 'Luyện Khí → Trúc Cơ → Kim Đan → Nguyên Anh...'
      },
      { 
        id: 'tien-hiep-hien-dai', 
        name: 'Hiện Đại', 
        description: 'Tu tiên trong thế giới hiện đại',
        example: 'Tu tiên kết hợp công nghệ, đô thị phồn hoa'
      },
      { 
        id: 'tien-hiep-trong-sinh', 
        name: 'Trọng Sinh', 
        description: 'Tu tiên với ký ức tiền kiếp',
        example: 'Trọng sinh từ thượng cổ, lợi dụng kinh nghiệm tu luyện'
      },
      { 
        id: 'tien-hiep-dong-huyen', 
        name: 'Đồng Huyễn', 
        description: 'Kết hợp yếu tố huyền huyễn',
        example: 'Tu tiên trong thế giới phép thuật'
      },
      {
        id: 'tien-hiep-hong-hoang',
        name: 'Hồng Hoang',
        description: 'Bối cảnh thượng cổ, thần ma, thiên đạo và đại kiếp',
        example: 'Nhập Hồng Hoang, tranh đoạt cơ duyên trước các đại năng'
      },
      {
        id: 'tien-hiep-khai-tong-lap-phai',
        name: 'Khai Tông Lập Phái',
        description: 'Từ tiểu tu sĩ xây tông môn, tranh tài nguyên và danh vọng',
        example: 'Bắt đầu từ ngoại môn, từng bước lập tông môn bất hủ'
      },
      {
        id: 'tien-hiep-tien-gioi-kinh-doanh',
        name: 'Tiên Giới Kinh Doanh',
        description: 'Buôn đan dược, pháp bảo, linh tài trong giới tu tiên',
        example: 'Mở thương hội tiên giới, lấy tài phú đổi cảnh giới'
      },
      {
        id: 'tien-hiep-linh-dien-nong-trang',
        name: 'Linh Điền Nông Trại',
        description: 'Trồng linh dược, nuôi linh thú, vận hành nông trại tu tiên',
        example: 'Một mẫu linh điền, đổi lấy vạn năm cơ duyên'
      },
      {
        id: 'tien-hiep-son-lam-san-thu',
        name: 'Sơn Lâm Săn Thú',
        description: 'Săn yêu thú, lấy nội đan, sinh tồn trong cấm địa',
        example: 'Thợ săn phàm nhân dùng yêu thú để đổi tài nguyên tu luyện'
      },
      {
        id: 'tien-hiep-hai-vuc-san-bao',
        name: 'Hải Vực Săn Bảo',
        description: 'Ra khơi săn bảo, bí cảnh hải đảo, tranh đoạt truyền thừa',
        example: 'Đội thuyền tu sĩ vượt hải vực tìm cổ mộ tiên nhân'
      },
      {
        id: 'tien-hiep-mo-tiem-net',
        name: 'Mở Tiệm Net Tiên Hiệp',
        description: 'Đem mô hình tiệm net/game vào thế giới tu tiên',
        example: 'Mở tiệm net giúp tu sĩ mô phỏng bí cảnh để đột phá'
      }
    ]
  },
  'huyen-huyen': {
    name: 'Huyền Huyễn',
    icon: '🔮',
    requiredFields: ['magic_system'],
    optionalFields: ['world_description', 'races'],
    aiPromptCategory: 'fantasy',
    description: 'Thế giới kỳ ảo với phép thuật và sinh vật huyền bí',
    example: 'Phép thuật nguyên tố, hệ thống ma pháp phức tạp...',
    compositionTargets: {
      dialogue: [30, 40],
      description: [45, 55],
      inner: [10, 20]
    },
    topics: [
      { 
        id: 'huyen-huyen-trong-sinh', 
        name: 'Trọng Sinh', 
        description: 'Trọng sinh vào thế giới huyền huyễn',
        example: 'Trọng sinh thành thiên tài ma pháp'
      },
      { 
        id: 'huyen-huyen-kinh-doanh', 
        name: 'Kinh Doanh', 
        description: 'Kết hợp kinh doanh trong thế giới huyền huyễn',
        example: 'Mở tiệm dược phẩm ma pháp, buôn bán nguyên liệu'
      },
      { 
        id: 'huyen-huyen-toan-dan', 
        name: 'Toàn Dân', 
        description: 'Toàn dân tu luyện/phép thuật',
        example: 'Mọi người đều có thể học phép thuật'
      },
      { 
        id: 'huyen-huyen-dong-nhan', 
        name: 'Đồng Nhân', 
        description: 'Dựa trên tác phẩm huyền huyễn nổi tiếng',
        example: 'Dựa trên Tây Du Ký, Hồng Lâu Mộng...'
      },
      {
        id: 'huyen-huyen-mo-tiem-net',
        name: 'Mở Tiệm Net',
        description: 'Mở tiệm net trong thế giới ma pháp/huyền huyễn',
        example: 'Game mô phỏng chiến trường giúp học viên ma pháp tăng cấp'
      },
      {
        id: 'huyen-huyen-nong-trang-ma-phap',
        name: 'Nông Trại Ma Pháp',
        description: 'Trồng nguyên liệu ma pháp, vận hành trang trại thần bí',
        example: 'Từ nông dân bị khinh thành lãnh chúa nguyên liệu ma pháp'
      },
      {
        id: 'huyen-huyen-thuong-hoi',
        name: 'Thương Hội',
        description: 'Kinh doanh thương hội, đấu trí tài chính và thế lực',
        example: 'Xây thương hội vượt ba đế quốc bằng pháp khí độc quyền'
      },
      {
        id: 'huyen-huyen-san-thu',
        name: 'Săn Thú Ma Vực',
        description: 'Săn ma thú trong cấm khu, đổi tài nguyên tiến cấp',
        example: 'Đội săn ma thú nhỏ vươn lên thành quân đoàn huyền thoại'
      }
    ]
  },
  'do-thi': {
    name: 'Đô Thị',
    icon: '🏙️',
    requiredFields: ['modern_setting'],
    optionalFields: ['professions', 'social_conflicts'],
    aiPromptCategory: 'urban',
    description: 'Bối cảnh hiện đại, đời sống xã hội đô thị',
    example: 'Công ty đa quốc gia, tranh giành quyền lực...',
    compositionTargets: {
      dialogue: [45, 60],
      description: [25, 40],
      inner: [10, 20]
    },
    topics: [
      { 
        id: 'do-thi-thuong-chien', 
        name: 'Thương Chiến', 
        description: 'Truyện về kinh doanh, cạnh tranh doanh nghiệp',
        example: 'Công ty đa quốc gia, tranh giành thị phần'
      },
      { 
        id: 'do-thi-lam-phim', 
        name: 'Làm Phim Hollywood', 
        description: 'Truyện về ngành công nghiệp điện ảnh',
        example: 'Trở thành đạo diễn Hollywood, sản xuất phim bom tấn'
      },
      { 
        id: 'do-thi-di-nang', 
        name: 'Dị Năng', 
        description: 'Đô thị với siêu năng lực',
        example: 'Siêu năng lực trong thế giới hiện đại'
      },
      { 
        id: 'do-thi-linh-khi', 
        name: 'Linh Khí Sống Lại', 
        description: 'Linh khí trở lại trong đô thị hiện đại',
        example: 'Tu tiên trong thành phố, linh khí phục hồi'
      },
      {
        id: 'do-thi-tan-the',
        name: 'Tận Thế Đô Thị',
        description: 'Đô thị sụp đổ, sinh tồn và tái thiết trật tự',
        example: 'Thành phố thất thủ, MC dựng khu an toàn giữa hỗn loạn'
      },
      {
        id: 'do-thi-kinh-doanh-khoi-nghiep',
        name: 'Khởi Nghiệp Kinh Doanh',
        description: 'Từ người thường thành ông trùm doanh nghiệp',
        example: 'Từ quầy nhỏ ven đường thành chuỗi thương hiệu toàn quốc'
      },
      {
        id: 'do-thi-mo-vuon-kinh-doanh',
        name: 'Mở Vườn Kinh Doanh',
        description: 'Làm nông nghiệp đô thị, vườn hữu cơ, mô hình farm-to-table',
        example: 'Mở nông trại công nghệ cao rồi tạo đế chế thực phẩm sạch'
      },
      {
        id: 'do-thi-di-bien-hai-san',
        name: 'Đi Biển Bắt Hải Sản',
        description: 'Nghề biển hiện đại, săn hải sản và làm giàu',
        example: 'Một con tàu cũ giúp MC lật đời từ nghề biển'
      },
      {
        id: 'do-thi-len-nui-san-thu',
        name: 'Lên Núi Săn Thú',
        description: 'Sinh tồn vùng núi, săn bắt và kinh doanh đặc sản',
        example: 'Từ thợ săn nghiệp dư thành ông vua lâm nghiệp'
      },
      {
        id: 'do-thi-mo-tiem-net',
        name: 'Mở Tiệm Net Đô Thị',
        description: 'Kinh doanh tiệm net, esports, cộng đồng game thủ',
        example: 'Mở tiệm net cũ nát rồi thành trung tâm esports số một thành phố'
      },
      {
        id: 'do-thi-vong-du-hien-thuc',
        name: 'Võng Du Vào Hiện Thực',
        description: 'Năng lực trong game ảnh hưởng trực tiếp đời thực',
        example: 'Sau bản cập nhật định mệnh, kỹ năng game xuất hiện ngoài đời'
      }
    ]
  },
  'khoa-huyen': {
    name: 'Khoa Huyễn',
    icon: '🚀',
    requiredFields: ['tech_level'],
    optionalFields: ['future_world', 'scientific_concepts'],
    aiPromptCategory: 'sci-fi',
    description: 'Khoa học viễn tưởng, công nghệ tương lai',
    example: 'Du hành không gian, AI siêu cấp...',
    compositionTargets: {
      dialogue: [35, 50],
      description: [35, 50],
      inner: [10, 20]
    },
    topics: [
      { 
        id: 'khoa-huyen-co-dien', 
        name: 'Cổ Điển', 
        description: 'Khoa học viễn tưởng truyền thống',
        example: 'Du hành không gian, chiến tranh giữa các hành tinh'
      },
      { 
        id: 'khoa-huyen-tuong-lai-gan', 
        name: 'Tương Lai Gần', 
        description: 'Công nghệ tiên tiến trong tương lai gần',
        example: 'AI, robot trong đời sống hàng ngày'
      },
      { 
        id: 'khoa-huyen-post-apocalypse', 
        name: 'Hậu Khải Huyền', 
        description: 'Thế giới sau thảm họa',
        example: 'Sống sót sau chiến tranh hạt nhân'
      },
      { 
        id: 'khoa-huyen-cyberpunk', 
        name: 'Cyberpunk', 
        description: 'Công nghệ cao, xã hội thấp',
        example: 'Thành phố tương lai, hacker, AI độc hại'
      },
      {
        id: 'khoa-huyen-tan-the',
        name: 'Tận Thế Khoa Huyễn',
        description: 'Mạt thế kết hợp công nghệ và dị biến',
        example: 'AI phản loạn, hạ tầng sụp đổ, nhân loại co cụm thành pháo đài'
      },
      {
        id: 'khoa-huyen-vong-du-hien-thuc',
        name: 'Võng Du Vào Hiện Thực',
        description: 'Cơ chế game tràn vào đời thật theo hướng sci-fi',
        example: 'Class game kích hoạt ngoài đời sau sự kiện đồng bộ thần kinh'
      },
      {
        id: 'khoa-huyen-khai-hoang-tinh-cau',
        name: 'Khai Hoang Tinh Cầu',
        description: 'Mở rộng thuộc địa, xây căn cứ ngoài hành tinh',
        example: 'Đội khai hoang từ con số 0 xây thành phố trên sao hoang'
      },
      {
        id: 'khoa-huyen-kinh-doanh-cong-nghe',
        name: 'Kinh Doanh Công Nghệ',
        description: 'Startup AI, robot, biotech, cạnh tranh tập đoàn',
        example: 'Bán công nghệ lõi để đổi địa vị trong trật tự mới'
      },
      {
        id: 'khoa-huyen-mo-tiem-net',
        name: 'Mở Tiệm Net Tương Lai',
        description: 'Kinh doanh VR net-cafe, mô phỏng chiến trường tương lai',
        example: 'Một tiệm VR nhỏ thành cổng huấn luyện liên hành tinh'
      }
    ]
  },
  'lich-su': {
    name: 'Lịch Sử',
    icon: '📜',
    requiredFields: ['historical_period'],
    optionalFields: ['key_events', 'historical_figures'],
    aiPromptCategory: 'historical',
    description: 'Dựa trên các sự kiện lịch sử có thật',
    example: 'Thời nhà Đường, chiến tranh Tam Quốc...',
    compositionTargets: {
      dialogue: [30, 45],
      description: [40, 55],
      inner: [10, 20]
    },
    topics: [
      { 
        id: 'lich-su-co-dai', 
        name: 'Cổ Đại', 
        description: 'Thời kỳ cổ đại',
        example: 'Thời Tam Quốc, Xuân Thu Chiến Quốc'
      },
      { 
        id: 'lich-su-trung-dai', 
        name: 'Trung Đại', 
        description: 'Thời kỳ trung đại',
        example: 'Thời Đường Tống Nguyên Minh Thanh'
      },
      { 
        id: 'lich-su-hien-dai', 
        name: 'Hiện Đại', 
        description: 'Thế kỷ 19-20',
        example: 'Chiến tranh thế giới, cách mạng công nghiệp'
      },
      { 
        id: 'lich-su-gia-tuong', 
        name: 'Giả Tưởng', 
        description: 'Lịch sử với yếu tố hư cấu',
        example: 'Nếu Khổng Tử có siêu năng lực'
      },
      {
        id: 'lich-su-kinh-doanh',
        name: 'Kinh Doanh Cổ Đại',
        description: 'Buôn bán, thương hội, tuyến đường thương mại lịch sử',
        example: 'Từ tiệm nhỏ ở chợ huyện thành thương hội xuyên triều'
      },
      {
        id: 'lich-su-son-lam-san-thu',
        name: 'Sơn Lâm Săn Thú',
        description: 'Săn bắt nơi biên cương, sinh tồn và đổi đời',
        example: 'Thợ săn vùng núi dùng kỹ nghệ săn để lập nghiệp'
      },
      {
        id: 'lich-su-di-bien-hai-san',
        name: 'Biển Cổ Đại',
        description: 'Đội tàu cổ đại, hải thương, săn hải sản và tranh cảng',
        example: 'Từ ngư dân thành bá chủ tuyến hải thương'
      },
      {
        id: 'lich-su-mo-tiem-net',
        name: 'Mở Tiệm Net Lịch Sử',
        description: 'Nhánh xuyên thời gian: đưa mô hình net-cafe vào thời cổ',
        example: 'Xuyên không mở tiệm “cờ mô phỏng chiến trận” cho võ tướng luyện binh'
      }
    ]
  },
  'dong-nhan': {
    name: 'Đồng Nhân',
    icon: '🎭',
    requiredFields: ['original_work'],
    optionalFields: ['character_adaptations', 'universe_rules'],
    aiPromptCategory: 'fanfiction',
    description: 'Phát triển từ tác phẩm gốc đã có',
    example: 'Dựa trên Tây Du Ký, Hồng Lâu Mộng...',
    compositionTargets: {
      dialogue: [40, 55],
      description: [30, 45],
      inner: [10, 20]
    },
    topics: [
      { 
        id: 'dong-nhan-tien-hiep', 
        name: 'Tiên Hiệp', 
        description: 'Đồng nhân thể loại tiên hiệp',
        example: 'Đồng nhân Đấu Phá Thương Khung'
      },
      { 
        id: 'dong-nhan-huyen-huyen', 
        name: 'Huyền Huyễn', 
        description: 'Đồng nhân thể loại huyền huyễn',
        example: 'Đồng nhân Toàn Chức Cao Thủ'
      },
      { 
        id: 'dong-nhan-do-thi', 
        name: 'Đô Thị', 
        description: 'Đồng nhân thể loại đô thị',
        example: 'Đồng nhân Toàn Chức Cao Thủ'
      },
      { 
        id: 'dong-nhan-khoa-huyen', 
        name: 'Khoa Huyễn', 
        description: 'Đồng nhân thể loại khoa huyễn',
        example: 'Đồng nhân Tam Thể'
      }
    ]
  },
  'vong-du': {
    name: 'Võng Du',
    icon: '🎮',
    requiredFields: ['game_system'],
    optionalFields: ['virtual_world', 'game_mechanics'],
    aiPromptCategory: 'game',
    description: 'Truyện về thế giới game ảo',
    example: 'MMORPG, hệ thống kỹ năng game...',
    compositionTargets: {
      dialogue: [45, 60],
      description: [25, 40],
      inner: [10, 20]
    },
    topics: [
      { 
        id: 'vong-du-mmo', 
        name: 'MMO', 
        description: 'Truyện về game MMORPG',
        example: 'Thế giới ảo rộng lớn, guild chiến'
      },
      { 
        id: 'vong-du-vr', 
        name: 'VR', 
        description: 'Truyện về công nghệ thực tế ảo',
        example: 'Full Dive VR, trải nghiệm game như thật'
      },
      { 
        id: 'vong-du-esports', 
        name: 'Esports', 
        description: 'Truyện về thi đấu game chuyên nghiệp',
        example: 'Trở thành tuyển thủ hàng đầu'
      },
      { 
        id: 'vong-du-system', 
        name: 'Hệ Thống', 
        description: 'Truyện có hệ thống đặc biệt',
        example: 'Hệ thống nhiệm vụ, kỹ năng độc đáo'
      },
      {
        id: 'vong-du-vao-hien-thuc',
        name: 'Vào Hiện Thực',
        description: 'Thế giới game hòa vào đời thật, kỹ năng dùng ngoài đời',
        example: 'Sau biến cố máy chủ, toàn dân nhận class ngoài đời'
      },
      {
        id: 'vong-du-toan-dan-chuyen-chuc',
        name: 'Toàn Dân Chuyển Chức',
        description: 'Mỗi người thức tỉnh nghề nghiệp và cây kỹ năng',
        example: 'MC sở hữu nghề ẩn phá vỡ meta toàn dân'
      },
      {
        id: 'vong-du-linh-dia-cong-hoi',
        name: 'Lãnh Địa Công Hội',
        description: 'Xây thành, giữ đất, chiến tranh công hội liên server',
        example: 'Từ guild vô danh thành thế lực thống trị bản đồ'
      },
      {
        id: 'vong-du-kinh-te-game',
        name: 'Kinh Tế Game',
        description: 'Đầu cơ vật phẩm, thương trường trong game và đời thực',
        example: 'Lật thị trường đấu giá bằng hệ thống phân tích giá'
      },
      {
        id: 'vong-du-doi-song-nghe-nghiep',
        name: 'Đời Sống Nghề Nghiệp',
        description: 'Nghề phụ, crafting, sản xuất tạo lợi thế dài hạn',
        example: 'Thợ rèn bị coi thường thành nhà cung ứng thần trang'
      }
    ]
  }
};

export type GenreKey = keyof typeof GENRE_CONFIG;
export type Topic = {
  id: string;
  name: string;
  description: string;
  example: string;
};
