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