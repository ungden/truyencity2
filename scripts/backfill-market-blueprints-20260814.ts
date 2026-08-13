/**
 * One-time, idempotent market/world/setup uplift for the five active hidden novels.
 *
 *   node --import tsx scripts/backfill-market-blueprints-20260814.ts
 *   node --import tsx scripts/backfill-market-blueprints-20260814.ts --apply
 */
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { MarketBlueprintSchema, type MarketBlueprint } from '../src/services/story-factory/setup';

dotenv.config({ path: '.env.runtime', quiet: true });
dotenv.config({ path: '.env.local', quiet: true });

const apply = process.argv.includes('--apply');
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error('Supabase server environment is missing.');
const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

type Uplift = { title: string; directive: string; blueprint: MarketBlueprint };

const uplifts: Record<string, Uplift> = {
  '0888ab7b-664d-4149-82b7-a7eeb267bace': {
    title: 'Làng Biển 1988: Từ Bốn Con Mồi Giả Đến Vua Câu Mực',
    directive: 'Từ chương kế tiếp, chấm dứt vòng bắt mực → bán → trả Ba Cẩn → Ba Cẩn phá. Ba Cẩn chỉ còn là bậc đối thủ địa phương và không được lặp cảnh thu nợ. Đưa Phan sang cuộc tranh quyền tiếp cận luồng mực, đầu ra và định giá: kết quả phải hiện trên giá đấu, hợp đồng, sản lượng đội tàu hoặc quyền vào ngư trường. Bốn con mồi giả phải tiến hóa thành hệ thống đọc luồng, phối hợp tàu và tiêu chuẩn hàng, không chỉ tăng số con câu được. Mỗi cụm ba chương phải có một thắng lợi hữu hình, một người có quyền phản ứng và một áp lực cấp cao hơn; kỹ thuật chỉ là đòn bẩy.',
    blueprint: {
      familiarArena: 'Trùng sinh năm 1988 trong một làng biển nghèo, nơi ngư dân sống bằng sản lượng, nợ dầu và giá thu mua mỗi rạng sáng.',
      noveltyCollision: 'Bốn con mồi giả tự chế va vào cuộc chiến giành luồng mực, quyền định giá và tổ chức đội tàu trong thời kỳ thị trường vừa mở.',
      protagonistStartingPosition: 'Phan có một xuồng máy yếu, gia đình mang nợ, anh trai mất uy tín và toàn bộ đầu ra bị một nậu vựa địa phương bóp nghẹt.',
      coreAdvantage: 'Khả năng đọc dòng, ánh sáng và phản ứng của mực rồi biến hiểu biết ấy thành dụng cụ, đội hình tàu, dữ liệu ngư trường và tiêu chuẩn hàng hóa có thể nhân rộng.',
      comparisonEngine: 'Phiên cân cá công khai, giá đấu rạng sáng, hợp đồng theo phẩm cấp, bảng sản lượng từng tàu và quyền vào ngư trường khiến ưu thế của Phan được người mua, chủ tàu và nghiệp đoàn trực tiếp đo rồi phản ứng.',
      worldConflictEngine: 'Dầu, đá, tín dụng, ngư trường, giấy phép, năng lực chế biến và đầu ra xuất khẩu luôn khan hiếm; mỗi lần Phan giành một mắt xích sẽ đụng tầng lợi ích cao hơn từ nậu vựa đến đội tàu, nhà máy, cảng và doanh nghiệp ngoại.',
      earlyPayoffs: [
        { byChapter: 1, payoff: 'Mồi giả đầu tiên kéo được mực khi thuyền khác trắng tay và đổi ngay thành tiền dầu.', visibleTo: 'Minh và những người chờ cân ở bến cá', positionChange: 'Phan từ con nợ bất lực thành người có một phương pháp kiếm tiền thật.', nextPressure: 'Nậu vựa siết đầu ra vì nhận ra Phan có thể thoát khỏi vòng nợ.' },
        { byChapter: 3, payoff: 'Bốn con mồi tạo một mẻ vượt rõ đội xuồng cùng bến và giúp Phan tự chọn người mua.', visibleTo: 'Các chủ xuồng, người cân cá và thương lái', positionChange: 'Phan có quyền mặc cả lần đầu thay vì nhận giá bị áp.', nextPressure: 'Đối thủ khóa dầu, đá hoặc chỗ neo để cắt khả năng lặp lại thắng lợi.' },
        { byChapter: 5, payoff: 'Phan dùng phẩm cấp và thời điểm bán để lập mức giá mới cho mực tươi.', visibleTo: 'Người mua ngoài vùng và toàn bộ phiên chợ cá', positionChange: 'Lợi thế chuyển từ bắt được cá sang tác động được giá thị trường.', nextPressure: 'Các nậu vựa liên kết giữ nguồn lạnh và tín dụng.' },
        { byChapter: 7, payoff: 'Một chủ tàu khác xin đi theo tín hiệu luồng mực của Phan và chia lợi nhuận công khai.', visibleTo: 'Đội tàu nhỏ và gia đình các ngư dân', positionChange: 'Phan từ tay câu đơn lẻ thành hạt nhân của một nhóm lợi ích.', nextPressure: 'Quyền vào ngư trường và an toàn đội hình trở thành chiến trường mới.' },
        { byChapter: 10, payoff: 'Nhóm của Phan thắng một lượt giá hoặc hợp đồng đủ lớn để cắt lệ thuộc vào Ba Cẩn.', visibleTo: 'Thương lái cấp tỉnh, nghiệp đoàn và các chủ tàu', positionChange: 'Phan bước từ sinh tồn gia đình sang tranh quyền tổ chức thị trường địa phương.', nextPressure: 'Đối thủ cấp vùng dùng giấy phép, kho lạnh và đội tàu lớn để chặn đường.' },
      ],
      scaleLadder: [
        { scope: 'Gia đình mắc nợ', arena: 'Xuồng nhỏ, bến cá Gành Đỏ và phiên cân mực rạng sáng.', statusPrize: 'Tự nuôi được chuyến biển và giành quyền chọn người mua.', oppositionClass: 'Chủ nợ cùng tay chân kiểm soát dầu và đầu ra.', advantageEvolution: 'Mồi giả chứng minh khả năng tìm và dụ mực trong một chuyến.' },
        { scope: 'Nhóm tàu ven bờ', arena: 'Ngư trường có tranh chấp, xưởng đá và các điểm thu mua cạnh tranh.', statusPrize: 'Dẫn luồng cho nhiều tàu và đặt điều kiện bán theo phẩm cấp.', oppositionClass: 'Nghiệp đoàn tàu lưới cùng mạng lưới nhà cung cấp địa phương.', advantageEvolution: 'Đọc dòng và ánh sáng thành quy trình phối hợp nhiều tàu.' },
        { scope: 'Liên minh làng biển', arena: 'Cảng huyện, kho lạnh, hợp tác xã và tuyến bán lên chợ tỉnh.', statusPrize: 'Nắm quyền gom hàng và chia lợi ích cho cả một liên minh.', oppositionClass: 'Đầu nậu cấp huyện, chủ kho và cán bộ giữ cửa giấy phép.', advantageEvolution: 'Dữ liệu ngư trường kết hợp phân loại, bảo quản và lịch tàu.' },
        { scope: 'Doanh nghiệp cấp tỉnh', arena: 'Nhà máy chế biến, đấu thầu hậu cần và mạng lưới phân phối liên tỉnh.', statusPrize: 'Định giá bằng chất lượng và hợp đồng thay vì bán mẻ hàng thô.', oppositionClass: 'Doanh nghiệp chế biến lâu năm và cartel vận tải lạnh.', advantageEvolution: 'Lợi thế thành tiêu chuẩn vận hành cho đội tàu và nhà máy.' },
        { scope: 'Thị trường quốc gia', arena: 'Cảng nước sâu, chuỗi bán lẻ lớn và các vùng khai thác xa bờ.', statusPrize: 'Sở hữu thương hiệu cùng quyền phân bổ sản lượng nhiều vùng.', oppositionClass: 'Tập đoàn thủy sản, liên minh cảng và cơ quan kiểm định.', advantageEvolution: 'Mạng dự báo luồng mực điều phối hạm đội, tồn kho và giá bán.' },
        { scope: 'Chuỗi đại dương', arena: 'Ngư trường quốc tế, tàu mẹ, sàn hợp đồng và thị trường xuất khẩu.', statusPrize: 'Trở thành người đặt chuẩn khai thác và giao dịch mực bền vững.', oppositionClass: 'Hạm đội nước ngoài, nhà mua toàn cầu và khủng hoảng tài nguyên.', advantageEvolution: 'Hệ thống sinh thái dữ liệu, đội tàu và chế biến tự thích ứng theo đại dương.' },
      ],
    },
  },
  'c85268bb-edfc-42c4-8277-39dc50909334': {
    title: 'Toàn Dân Lãnh Chúa: Giao Kèo Của Ta Biến Xác Quái Thành Vạn Vật',
    directive: 'Từ chương kế tiếp, fantasy chính là quyền lực giao kèo và sự đổi bậc lãnh chúa, không phải chuỗi xử lý nguyên liệu. Mỗi cụm ba chương phải cho giao kèo mở một quyền mới, làm thay đổi bảng xếp hạng/giá thị trường/kết quả chiến trận và gọi ra đối thủ cấp cao hơn. Xác quái là nhiên liệu của xung đột chứ không phải nghề mổ xẻ lặp lại. Cho dân, đồng minh, thương nhân hoặc lãnh chúa khác có lợi ích riêng và phản ứng vì cán cân quyền lực đổi. Tránh lặp một loại quái, một công thức và một phản diện; mỗi payoff phải đổi lãnh thổ, quân lực, quyền giao dịch hoặc địa vị công khai.',
    blueprint: {
      familiarArena: 'Toàn dân thức tỉnh lãnh địa trong một thế giới sinh tồn có bảng xếp hạng, quái triều, tài nguyên và chiến tranh giữa các lãnh chúa.',
      noveltyCollision: 'Năng lực giao kèo bảo toàn giá trị biến xác quái và phế vật thành vật tư, binh chủng hoặc quyền năng nhưng luôn buộc các bên trả một cái giá tương xứng.',
      protagonistStartingPosition: 'Main nhận lãnh địa cằn cỗi ở đáy bảng, dân đói, quân yếu, không có mỏ tài nguyên và bị các lãnh chúa lân cận coi là kho chiến lợi phẩm.',
      coreAdvantage: 'Giao kèo định nghĩa thứ được trao, giá phải trả và người chịu trách nhiệm; nó tiến từ chuyển hóa vật chất sang liên kết sản xuất, quân đội, luật lãnh địa và hiệp ước giữa các nền văn minh.',
      comparisonEngine: 'Bảng xếp hạng lãnh địa, chiến báo quái triều, giá trên chợ liên vùng, điều khoản hiệp ước và kết quả công thành công khai lượng hóa sức mạnh khiến mọi phe trực tiếp điều chỉnh chiến lược.',
      worldConflictEngine: 'Quái triều tạo xác và khủng hoảng; lõi lãnh địa, dân số, tuyến thương mại và quyền lập luật đều hữu hạn; mỗi tầng lãnh chúa, vương quốc và thần hệ tranh quyền xác định ai được phân phối giá trị và ai phải trả giá.',
      earlyPayoffs: [
        { byChapter: 1, payoff: 'Giao kèo biến xác quái đầu tiên thành lương thực và vũ khí đủ cứu cổng thành.', visibleTo: 'Dân đói và đội lính giữ cổng', positionChange: 'Main từ lãnh chúa chắc chắn bị xóa sổ thành người giữ được lãnh địa.', nextPressure: 'Mùi tài nguyên mới gọi bầy quái lớn hơn và kẻ do thám lân địa.' },
        { byChapter: 3, payoff: 'Một giao kèo lao động giúp dân đổi công lấy khẩu phần và dựng được tuyến phòng thủ trước hạn.', visibleTo: 'Toàn bộ cư dân và sứ giả lãnh địa bên cạnh', positionChange: 'Main có trật tự sản xuất thay vì chỉ sống nhờ may mắn.', nextPressure: 'Người ngoài muốn cướp công thức hoặc phá tính chính danh của giao kèo.' },
        { byChapter: 5, payoff: 'Lãnh địa thắng đợt quái triều vượt cấp và nhảy hạng công khai.', visibleTo: 'Các lãnh chúa trong bảng khu vực', positionChange: 'Main trở thành biến số mà liên minh địa phương phải tính đến.', nextPressure: 'Đối thủ phong tỏa chợ và đường lấy lõi nâng cấp.' },
        { byChapter: 7, payoff: 'Main ký một giao kèo thương mại khiến phế vật đổi thành tài nguyên chiến lược có giá niêm yết.', visibleTo: 'Thương nhân, thợ thủ công và các lãnh địa mua bán', positionChange: 'Main nắm một mắt xích phân phối thay vì chỉ có năng lực cá nhân.', nextPressure: 'Tổ chức giữ chợ đòi quyền kiểm soát điều khoản và thuế.' },
        { byChapter: 10, payoff: 'Main buộc một lãnh chúa mạnh hơn chấp nhận hiệp ước ngang hàng sau một chiến thắng có bằng chứng.', visibleTo: 'Liên minh khu vực và cư dân hai lãnh địa', positionChange: 'Lãnh địa bước từ con mồi sang một cực quyền lực địa phương.', nextPressure: 'Vương quốc hoặc hệ thống cổ đại chú ý đến quyền sửa cấu trúc trao đổi.' },
      ],
      scaleLadder: [
        { scope: 'Lãnh địa hấp hối', arena: 'Cổng làng, kho lương trống và bãi xác sau quái triều.', statusPrize: 'Giữ mạng dân cư và có tài nguyên tái thiết đầu tiên.', oppositionClass: 'Quái cấp thấp, nội loạn và lãnh chúa săn mồi lân cận.', advantageEvolution: 'Giao kèo chuyển hóa một vật liệu với cái giá minh bạch.' },
        { scope: 'Cụm lãnh địa', arena: 'Chợ khu vực, mỏ lõi và chiến trường tranh tuyến vận tải.', statusPrize: 'Được công nhận là đối tác và đặt giá cho một tài nguyên.', oppositionClass: 'Liên minh lãnh chúa địa phương và nhà buôn độc quyền.', advantageEvolution: 'Giao kèo nối nhiều người, nhiều đầu vào và nghĩa vụ theo thời hạn.' },
        { scope: 'Thành bang', arena: 'Đấu trường xếp hạng, công hội nghề và cơ quan phán quyết hiệp ước.', statusPrize: 'Có ghế trong hội đồng và quyền lập quy tắc giao dịch.', oppositionClass: 'Gia tộc thành bang, công hội pháp sư và quan tòa hợp đồng.', advantageEvolution: 'Giao kèo trở thành mạng sản xuất và cơ chế cưỡng chế có phản biện.' },
        { scope: 'Vương quốc', arena: 'Chiến tranh biên giới, ngân khố và hệ thống phong tước.', statusPrize: 'Nắm một vùng chiến lược cùng quyền phong cấp dưới.', oppositionClass: 'Quý tộc quân sự, vương thất và giáo đoàn giữ chính danh.', advantageEvolution: 'Giao kèo gắn quân lực, lãnh thổ và hậu quả vi phạm ở quy mô lớn.' },
        { scope: 'Toàn đại lục', arena: 'Liên minh chủng tộc, cổng thế giới và thị trường tài nguyên xuyên quốc gia.', statusPrize: 'Được quyền viết điều khoản cho trật tự đại lục mới.', oppositionClass: 'Đế quốc, chủng tộc cổ và thế lực thao túng quái triều.', advantageEvolution: 'Giao kèo tương thích nhiều hệ giá trị và biến luật đối phương thành điều kiện thương lượng.' },
        { scope: 'Trật tự thế giới', arena: 'Nguồn gốc hệ thống lãnh chúa và chiến trường quyết định luật phân phối.', statusPrize: 'Định nghĩa lại quan hệ giữa sinh mệnh, tài nguyên và quyền lực.', oppositionClass: 'Thần hệ, ý chí thế giới và những người hưởng lợi từ luật cũ.', advantageEvolution: 'Giao kèo chạm luật nền nhưng phải chịu counterplay và cái giá cấp thế giới.' },
      ],
    },
  },
  'ef5598bf-c0ea-4c2e-88fe-77574f98701c': {
    title: 'Toàn Dân Lãnh Địa: Ranh Giới Của Ta Có Thể Viết Lại Quy Tắc',
    directive: 'Từ chương kế tiếp, trọng tâm là cuộc chiến ai có quyền đặt luật trong lãnh thổ. Mỗi cụm ba chương phải cho một quy tắc ranh giới tạo thắng lợi nhìn thấy trên chiến báo, xếp hạng, quyền đất hoặc thỏa ước, rồi bị một tầng quyền lực mới tìm cách vô hiệu hóa. Không biến năng lực thành danh sách buff hoặc tiếp tục đánh một băng cướp cùng cấp. Ranh giới phải tiến hóa từ vòng bảo hộ đơn lẻ sang các vùng liên kết, luật kinh tế, hành lang và trật tự quốc gia; mỗi lần mở rộng đều có chi phí, xung đột luật và người có thẩm quyền phản ứng.',
    blueprint: {
      familiarArena: 'Toàn dân thức tỉnh lãnh địa, tranh tài nguyên, nâng cấp thành trì và leo bảng xếp hạng trong một thế giới biên cương liên tục chiến tranh.',
      noveltyCollision: 'Main không triệu hồi quân thần cấp mà dùng phấn ranh giới để viết một quy tắc vật lý hoặc xã hội cục bộ, rồi nối các vùng luật thành lãnh thổ sống.',
      protagonistStartingPosition: 'Main giữ một nơi trú ẩn cuối bảng, tường vỡ, dân ít, đất cằn và đang nằm trên đường cướp phá của thế lực địa phương.',
      coreAdvantage: 'Viết luật có phạm vi, nhiên liệu, điều kiện và xung đột rõ ràng; từ một vòng bảo hộ tiến thành mạng vùng luật về sản xuất, vận tải, chiến đấu và quyền công dân.',
      comparisonEngine: 'Bảng xếp hạng lãnh địa, bản đồ chiếm đất, chiến báo, thuế chợ, hợp đồng hành lang và phán quyết của hội đồng biến hiệu quả mỗi luật thành dữ liệu mà đồng minh lẫn đối thủ buộc phải phản ứng.',
      worldConflictEngine: 'Đất tốt, lõi thành, năng lượng luật và hành lang giao thương hữu hạn; luật của các lãnh địa có thể xung đột; tầng lãnh chúa, thành bang, đế quốc và người giữ luật cổ tranh quyền quyết định quy tắc nào có hiệu lực.',
      earlyPayoffs: [
        { byChapter: 1, payoff: 'Quy tắc đầu tiên chặn cuộc đột kích và giữ được kho lương đang bị cướp.', visibleTo: 'Dân trú ẩn và toán cướp ngoài ranh', positionChange: 'Main từ mục tiêu sắp bị xóa tên thành người có lãnh thổ không dễ xâm phạm.', nextPressure: 'Kẻ địch thử tìm điều kiện và giới hạn của vòng luật.' },
        { byChapter: 3, payoff: 'Một luật sản xuất biến mảnh đất cằn thành nguồn cung đủ nuôi đội phòng thủ.', visibleTo: 'Nông dân, binh lính và thương nhân đi ngang', positionChange: 'Lãnh địa có năng lực tự nuôi thay vì đốt kho dự trữ.', nextPressure: 'Lãnh địa cạnh tranh tranh nguồn năng lượng duy trì luật.' },
        { byChapter: 5, payoff: 'Main dùng hai vùng luật phối hợp để thắng một đội quân đông hơn và tăng hạng.', visibleTo: 'Các lãnh chúa trong bảng khu vực', positionChange: 'Main có học thuyết chiến đấu riêng chứ không chỉ một mẹo thủ thành.', nextPressure: 'Đối thủ mang vật phẩm phá luật và ép main phải biến hóa.' },
        { byChapter: 7, payoff: 'Một khu chợ trong ranh giới được luật bảo chứng giao dịch công bằng và hút thương nhân.', visibleTo: 'Thương hội, cư dân và lãnh địa lân cận', positionChange: 'Main giành quyền phân phối tài nguyên và thuế.', nextPressure: 'Thương hội hoặc thành bang đòi kiểm soát tuyến giao thương.' },
        { byChapter: 10, payoff: 'Main nối nhiều ranh giới thành hành lang khiến đối thủ phải ký thỏa ước công nhận chủ quyền.', visibleTo: 'Hội đồng khu vực và các đoàn thương nhân', positionChange: 'Main bước từ thủ lĩnh trú ẩn thành một lãnh chúa có tiếng nói.', nextPressure: 'Người giữ luật cấp thành bang xem mạng ranh giới là đe dọa.' },
      ],
      scaleLadder: [
        { scope: 'Nơi trú ẩn', arena: 'Tường vỡ, kho lương và vòng phấn bảo hộ đầu tiên.', statusPrize: 'Sống sót và được cư dân thừa nhận quyền chỉ huy.', oppositionClass: 'Toán cướp, quái hoang và nội gián thiếu niềm tin.', advantageEvolution: 'Một quy tắc đơn giản trong vùng nhỏ với chi phí trực tiếp.' },
        { scope: 'Cụm thôn trấn', arena: 'Đất canh tác, mỏ lõi và đường nối nhiều điểm dân cư.', statusPrize: 'Nắm tài nguyên đủ tự chủ và thu phục lãnh địa nhỏ.', oppositionClass: 'Lãnh chúa địa phương có vật phẩm phá luật và quân đông.', advantageEvolution: 'Nhiều vùng luật phối hợp và chia năng lượng theo ưu tiên.' },
        { scope: 'Thành bang', arena: 'Chợ lớn, học viện luật, đấu trường và hội đồng chủ quyền.', statusPrize: 'Có ghế quyết định quy tắc thương mại cùng biên giới.', oppositionClass: 'Gia tộc thành bang, pháp quan và thương hội độc quyền.', advantageEvolution: 'Luật vật lý kết hợp luật kinh tế, hợp đồng và quyền công dân.' },
        { scope: 'Vương quốc', arena: 'Mạng thành trì, chiến tuyến và hành lang vận tải quốc gia.', statusPrize: 'Được công nhận quyền lập một hệ thống lãnh thổ riêng.', oppositionClass: 'Vương thất, quân đoàn và lãnh chúa cấp vùng.', advantageEvolution: 'Ranh giới thành mạng luật có dự phòng, trung tâm và điểm yếu chiến lược.' },
        { scope: 'Toàn đại lục', arena: 'Biên giới đế quốc, cổng dị giới và liên minh nhiều giống loài.', statusPrize: 'Đặt luật cho các tuyến giao thương và an ninh đại lục.', oppositionClass: 'Đế quốc cổ, chủng tộc giữ di sản và kẻ viết luật đối nghịch.', advantageEvolution: 'Luật có thể đàm phán, tương thích hoặc xung đột với hệ quy tắc khác.' },
        { scope: 'Thế giới', arena: 'Mạng ranh giới hành tinh và nơi lưu giữ nguồn luật nguyên thủy.', statusPrize: 'Tái lập trật tự chủ quyền để thế giới không còn bị một ý chí độc chiếm.', oppositionClass: 'Người giữ luật cổ, ý chí thế giới và liên minh hưởng lợi từ độc quyền.', advantageEvolution: 'Main viết cấu trúc luật phân tán nhưng phải trả giá và chấp nhận cơ chế phản biện.' },
      ],
    },
  },
  '2c001721-b8a0-4161-bf67-59fa7de0121b': {
    title: 'Trùng Sinh 1988: Ta Từ Xưởng Máy Rách Xây Đội Tàu Vạn Tấn',
    directive: 'Từ chương kế tiếp, máy móc chỉ có ý nghĩa khi thắng một hợp đồng, cứu một chuyến biển, phá thế độc quyền phụ tùng hoặc đổi quyền sở hữu xưởng/tàu. Cấm dành cả chương để tháo, đo, hàn, thử rồi hẹn ngày mai. Mỗi cụm ba chương phải có deadline hoặc cuộc so sánh công khai, sea trial/kết quả hợp đồng, đối thủ có lợi ích bị đụng và một bậc arena mới. Lợi thế của main phải tiến từ sửa máy đơn chiếc sang chuẩn hóa phụ tùng, điều phối xưởng, thiết kế tàu và năng lực công nghiệp; thay lớp đối thủ theo quy mô, không kéo một chủ xưởng địa phương suốt truyện.',
    blueprint: {
      familiarArena: 'Trùng sinh năm 1988, đi lên từ xưởng máy phế liệu trong thời kỳ đội tàu cá thiếu phụ tùng, vốn và năng lực đóng sửa công nghiệp.',
      noveltyCollision: 'Một kỹ sư hàng hải biết trước các chuẩn thiết kế tương lai dùng đống máy rách để xây năng lực đóng tàu vạn tấn, nhưng phải thắng bằng hợp đồng và vận hành thật.',
      protagonistStartingPosition: 'Main không vốn, không giấy phép, chỉ có xưởng sắp bị thu hồi, thiết bị phế và danh tiếng của một người thợ không ai dám giao máy lớn.',
      coreAdvantage: 'Khả năng chẩn đoán hệ thống, chuẩn hóa phụ tùng và thiết kế theo vòng đời; tiến từ cứu một động cơ sang tổ chức dây chuyền, xưởng đóng tàu, đội tàu và hệ sinh thái công nghiệp.',
      comparisonEngine: 'Deadline sửa máy, biên bản nghiệm thu, cuộc chạy thử trên biển, giá thầu, số giờ hoạt động và hợp đồng đội tàu công khai cho chủ tàu, ngân hàng và cơ quan cấp phép đo trực tiếp năng lực main.',
      worldConflictEngine: 'Phụ tùng, ngoại tệ, ụ tàu, tín dụng, giấy phép và hợp đồng nhà nước đều bị phân bổ qua mạng lợi ích; mỗi bước mở rộng đụng cartel vật tư, xưởng tỉnh, tổng công ty, đối thủ quốc gia rồi tập đoàn nước ngoài.',
      earlyPayoffs: [
        { byChapter: 1, payoff: 'Main làm một động cơ phế nổ máy trước deadline và nhận tiền cứu xưởng.', visibleTo: 'Chủ tàu, thợ xưởng và chủ nợ', positionChange: 'Main từ người sắp mất xưởng thành thợ có kết quả không ai phủ nhận.', nextPressure: 'Đối thủ khóa phụ tùng và tung tin máy chỉ chạy may mắn.' },
        { byChapter: 3, payoff: 'Chiếc máy hoàn tất chuyến biển thử mà máy mới cùng loại thất bại.', visibleTo: 'Các chủ tàu trong bến và người nghiệm thu', positionChange: 'Main có đơn hàng xếp hàng thay vì đi xin việc.', nextPressure: 'Xưởng lớn dùng nguồn hàng và giấy tờ để ép main.' },
        { byChapter: 5, payoff: 'Main chuẩn hóa một chi tiết thay thế giúp ba tàu cùng quay lại khai thác.', visibleTo: 'Nghiệp đoàn chủ tàu và nhà cung cấp', positionChange: 'Năng lực từ tay nghề cá nhân thành giải pháp có thể nhân rộng.', nextPressure: 'Cartel phụ tùng coi main là mối đe dọa về giá.' },
        { byChapter: 7, payoff: 'Main thắng một gói sửa đội tàu bằng cam kết hiệu suất có kiểm chứng.', visibleTo: 'Ngân hàng, chủ đội tàu và xưởng cạnh tranh', positionChange: 'Xưởng có dòng tiền cùng uy tín hợp đồng.', nextPressure: 'Thiếu ụ, máy công cụ và giấy phép để nhận tàu lớn hơn.' },
        { byChapter: 10, payoff: 'Một cuộc chạy thử buộc cơ quan tỉnh trao quyền tham gia dự án đóng mới.', visibleTo: 'Lãnh đạo cảng, kỹ sư và các nhà thầu', positionChange: 'Main bước từ xưởng sửa chữa sang người chơi của ngành đóng tàu.', nextPressure: 'Xưởng cấp tỉnh và mạng phân bổ vật tư liên kết chặn dự án.' },
      ],
      scaleLadder: [
        { scope: 'Xưởng sắp phá sản', arena: 'Bãi máy phế, cầu tàu nhỏ và các đơn cứu hộ khẩn cấp.', statusPrize: 'Giữ xưởng và có danh tiếng sửa được máy khó.', oppositionClass: 'Chủ nợ, thợ đầu đàn bảo thủ và lái buôn phụ tùng.', advantageEvolution: 'Chẩn đoán một động cơ và tận dụng linh kiện phế.' },
        { scope: 'Cảng huyện', arena: 'Đội tàu cá, kho phụ tùng và các hợp đồng bảo dưỡng theo mùa.', statusPrize: 'Trở thành xưởng được đội tàu chọn đầu tiên.', oppositionClass: 'Xưởng lâu năm và cartel nhà cung cấp địa phương.', advantageEvolution: 'Chuẩn hóa chi tiết, quy trình và bảo hành nhiều máy.' },
        { scope: 'Công nghiệp cấp tỉnh', arena: 'Ụ tàu, trường nghề, ngân hàng và đấu thầu đóng tàu mới.', statusPrize: 'Có giấy phép, vốn và năng lực đóng tàu hoàn chỉnh.', oppositionClass: 'Nhà máy quốc doanh cùng nhóm phân bổ vật tư.', advantageEvolution: 'Tích hợp động cơ, thân tàu, điện và tổ chức đội kỹ sư.' },
        { scope: 'Hạm đội quốc gia', arena: 'Tổng công ty, cảng lớn và dự án tàu vận tải chuyên dụng.', statusPrize: 'Đặt một tiêu chuẩn kỹ thuật được áp dụng toàn ngành.', oppositionClass: 'Tổng thầu quốc gia, quan chức lợi ích và đối thủ công nghệ.', advantageEvolution: 'Thiết kế nền tảng tàu theo module, chuỗi cung ứng và vòng đời.' },
        { scope: 'Thị trường quốc tế', arena: 'Đăng kiểm quốc tế, tuyến biển xa và đấu thầu với hãng tàu ngoại.', statusPrize: 'Xuất khẩu tàu hoặc giành hợp đồng đóng sửa xuyên biên giới.', oppositionClass: 'Tập đoàn đóng tàu nước ngoài và hệ tiêu chuẩn bảo hộ.', advantageEvolution: 'Nền tảng thiết kế đáp ứng nhiều chuẩn, khí hậu và nhiệm vụ.' },
        { scope: 'Tập đoàn công nghiệp biển', arena: 'Chuỗi cảng, viện nghiên cứu và chương trình hạ tầng đại dương.', statusPrize: 'Xây năng lực công nghiệp có thể tồn tại ngoài một cá nhân.', oppositionClass: 'Chu kỳ kinh tế, cạnh tranh quốc gia và khủng hoảng công nghệ.', advantageEvolution: 'Lợi thế thành tổ chức nghiên cứu, đào tạo và mạng cung ứng tự đổi mới.' },
      ],
    },
  },
  '70a839ab-8a80-4625-baed-2f0703fdb2e9': {
    title: 'Trùng Sinh 1988: Từ Thùng Đá Phế Liệu Đến Ông Trùm Hải Sản',
    directive: 'Từ chương kế tiếp, nước brine và thao tác bảo quản chỉ là vũ khí để đổi quyền mặc cả, hợp đồng, tổ chức và thị trường. Cấm viết tiếp một chuỗi hướng dẫn phân loại–ướp–chở hàng hoặc chỉ đánh Ba Hồng bằng thêm sản lượng. Mỗi cụm ba chương phải có giá/kiểm định/hợp đồng công khai, một phe có quyền lợi bị đổi, payoff về tài sản hoặc vị thế và đối thủ cấp cao hơn. Lợi thế phải tiến từ giữ tươi một thùng cá sang tiêu chuẩn đội tàu, hợp tác xã, logistics, thương hiệu và xuất khẩu; thay arena và lớp đối thủ thật sự.',
    blueprint: {
      familiarArena: 'Trùng sinh làm giàu năm 1988 tại bến cá nghèo, nơi chất lượng tụt từng giờ và nậu vựa kiếm lời nhờ ngư dân không có đá, vốn hay đường ra chợ lớn.',
      noveltyCollision: 'Kiến thức chuỗi lạnh hiện đại va vào hạ tầng phế liệu, biến thứ đang thối rữa thành hàng cao cấp rồi thành quyền định chuẩn cho cả ngành hải sản.',
      protagonistStartingPosition: 'Phan chỉ có một thùng phế, ít tiền mặt, không kho lạnh, không phương tiện và bị hệ thống nậu vựa khóa cả giá mua lẫn nguồn đá.',
      coreAdvantage: 'Nhìn toàn chuỗi thời gian–nhiệt độ–phẩm cấp–thị trường như một hệ thống; tiến từ cứu một mẻ cá sang tiêu chuẩn tàu, mạng thu mua, logistics, chế biến, thương hiệu và dữ liệu cung cầu.',
      comparisonEngine: 'Giá cân công khai, tỷ lệ hàng loại một, biên bản kiểm định, tỷ lệ hao hụt, hợp đồng nhà hàng và đơn xuất khẩu biến chất lượng thành tiền cùng vị thế mà ngư dân, người mua và đối thủ trực tiếp nhìn thấy.',
      worldConflictEngine: 'Đá, điện, xe lạnh, tín dụng, giấy phép, nguồn cá và cửa vào thị trường cao cấp hữu hạn; mỗi mắt xích main giành được sẽ đụng quyền lợi của nậu vựa, nhà máy, nhà phân phối, chuỗi bán lẻ và tập đoàn xuất khẩu.',
      earlyPayoffs: [
        { byChapter: 1, payoff: 'Một thùng cá phế được giữ đạt loại một và bán cao hơn rõ rệt ngay trong buổi chợ.', visibleTo: 'Ngư dân, người cân cá và nậu vựa', positionChange: 'Phan chứng minh kiến thức có thể đổi trực tiếp thành tiền.', nextPressure: 'Nậu vựa khóa nguồn đá và tung tin cách làm phá cá.' },
        { byChapter: 3, payoff: 'Phan thắng một cuộc kiểm tra mù giữa cá thường và cá được bảo quản đúng.', visibleTo: 'Nhà hàng, thương lái tỉnh và chủ ghe', positionChange: 'Phan có đơn hàng dựa trên tiêu chuẩn thay vì quan hệ.', nextPressure: 'Nguồn cung không đủ đồng nhất để giữ hợp đồng.' },
        { byChapter: 5, payoff: 'Hai chủ ghe chấp nhận quy chuẩn đổi lấy mức giá bảo đảm.', visibleTo: 'Toàn bến cá và các nhà thu mua', positionChange: 'Main bắt đầu kiểm soát chất lượng từ trên tàu.', nextPressure: 'Ba Hồng ép người cung cấp đá, muối và vận chuyển.' },
        { byChapter: 7, payoff: 'Một chuyến hàng lên chợ tỉnh đạt tỷ lệ loại một vượt xa mọi vựa khác.', visibleTo: 'Ban quản lý chợ và người mua lớn', positionChange: 'Phan có quyền mặc cả tuyến phân phối độc lập.', nextPressure: 'Đối thủ logistics và giấy phép chặn quy mô tiếp theo.' },
        { byChapter: 10, payoff: 'Nhóm của Phan ký hợp đồng định kỳ đủ để ngư dân rời hệ nợ của nậu vựa.', visibleTo: 'Các chủ ghe, ngân hàng và chính quyền địa phương', positionChange: 'Main từ lái buôn nhỏ thành hạt nhân tổ chức chuỗi cung ứng.', nextPressure: 'Thế lực cấp tỉnh cạnh tranh kho, vốn và quyền phân phối.' },
      ],
      scaleLadder: [
        { scope: 'Một thùng cá', arena: 'Bến cá Cửa Sỏi, xưởng đá nhỏ và chợ sáng.', statusPrize: 'Có vốn quay vòng cùng một khách hàng trả giá theo chất lượng.', oppositionClass: 'Nậu vựa địa phương và nhà cung cấp bị kiểm soát.', advantageEvolution: 'Kiểm soát nhiệt độ cho một mẻ hàng bằng vật liệu phế.' },
        { scope: 'Nhóm chủ ghe', arena: 'Ngư trường, điểm thu mua và tuyến xe lên chợ tỉnh.', statusPrize: 'Đặt quy chuẩn hàng cho nhiều tàu và giữ hợp đồng định kỳ.', oppositionClass: 'Mạng nậu vựa, chủ xe và nhà máy đá cấp huyện.', advantageEvolution: 'Chuẩn hóa thao tác trên tàu, phân loại và lịch vận chuyển.' },
        { scope: 'Hợp tác xã', arena: 'Kho lạnh, tín dụng, đấu thầu đất và cơ quan cấp phép.', statusPrize: 'Nắm năng lực gom hàng và chia lợi ích cho cộng đồng.', oppositionClass: 'Doanh nghiệp tỉnh, ngân hàng và nhóm giữ hạ tầng.', advantageEvolution: 'Điều phối tồn kho, vốn, chất lượng và người lao động.' },
        { scope: 'Thương hiệu quốc gia', arena: 'Nhà máy chế biến, chuỗi bán lẻ và mạng logistics liên vùng.', statusPrize: 'Bán bằng thương hiệu và hợp đồng thay vì nguyên liệu vô danh.', oppositionClass: 'Nhà phân phối lớn, chuỗi bán lẻ và đối thủ công nghiệp.', advantageEvolution: 'Dữ liệu chất lượng nối sản xuất, chế biến và nhu cầu thị trường.' },
        { scope: 'Nhà xuất khẩu', arena: 'Cảng nước sâu, kiểm định quốc tế và thị trường ngoại tệ.', statusPrize: 'Có giấy chứng nhận và quyền giao trực tiếp cho khách ngoại.', oppositionClass: 'Tập đoàn xuất khẩu, rào cản kỹ thuật và nhà mua toàn cầu.', advantageEvolution: 'Truy xuất toàn chuỗi, cấp đông và thiết kế sản phẩm theo thị trường.' },
        { scope: 'Hệ sinh thái biển', arena: 'Nhiều vùng nguyên liệu, viện nghiên cứu và chính sách tài nguyên.', statusPrize: 'Đặt chuẩn ngành vừa sinh lời vừa giữ nguồn cá lâu dài.', oppositionClass: 'Khủng hoảng nguồn lợi, cạnh tranh quốc gia và lợi ích khai thác ngắn hạn.', advantageEvolution: 'Chuỗi lạnh thành hệ điều hành dữ liệu, tái tạo tài nguyên và phân phối giá trị.' },
      ],
    },
  },
};

async function main() {
  const validated = Object.entries(uplifts).map(([id, uplift]) => ({
    id,
    ...uplift,
    blueprint: MarketBlueprintSchema.parse(uplift.blueprint),
  }));
  console.log(JSON.stringify({ apply, projects: validated.map(item => ({
    id: item.id,
    title: item.title,
    payoffs: item.blueprint.earlyPayoffs.map(payoff => payoff.byChapter),
    scaleSteps: item.blueprint.scaleLadder.length,
  })) }, null, 2));
  if (!apply) return;

  for (const item of validated) {
    const job = await db.from('story_factory_jobs')
      .select('lease_owner,lease_until')
      .eq('project_id', item.id)
      .single();
    if (job.error) throw job.error;
    if (job.data.lease_owner && job.data.lease_until && new Date(job.data.lease_until) > new Date()) {
      throw new Error(`${item.title} has an active worker lease; refusing to mutate its setup.`);
    }
    const updated = await db.from('ai_story_projects')
      .update({ market_blueprint: item.blueprint, author_directive: item.directive })
      .eq('id', item.id)
      .select('id,market_blueprint,author_directive')
      .single();
    if (updated.error) throw updated.error;
    MarketBlueprintSchema.parse(updated.data.market_blueprint);
    if (updated.data.author_directive !== item.directive) throw new Error(`Directive readback failed for ${item.title}.`);
    console.log(`[backfill] ${item.title}: persisted and read back.`);
  }
}

main().catch(error => {
  console.error(error instanceof Error ? `${error.name}: ${error.message}` : String(error));
  process.exitCode = 1;
});
