import { PremiseSchema, type Premise } from './contracts';

import tiepVan from '../../../factory/serial/song-xuyen/01-tiep-van-cuu-chin-thanh.json';
import bangPhong from '../../../factory/serial/song-xuyen/02-tiem-tap-hoa-bang-phong.json';
import pheDan from '../../../factory/serial/song-xuyen/03-phe-dan-thuc-tinh.json';
import thanhDao from '../../../factory/serial/song-xuyen/04-thanh-dao-gi-chem-quy.json';
import haiVuc from '../../../factory/serial/song-xuyen/05-may-loc-nuoc-long-cung.json';
import xeNang from '../../../factory/serial/song-xuyen/06-xe-nang-phao-dai.json';
import truongQuay from '../../../factory/serial/song-xuyen/07-dien-vien-cao-thu.json';
import duocThanh from '../../../factory/serial/song-xuyen/08-hop-chi-khau-cuu-thanh-chu.json';
import amPhu from '../../../factory/serial/song-xuyen/09-hang-ma-phap-khi.json';
import caoVo from '../../../factory/serial/song-xuyen/10-rac-chien-truong-sieu-vat-lieu.json';

/** Review facts that are important to a dual-world launch but deliberately not schema. */
export interface SerialPremiseCatalogEntry {
  id: string;
  priority: number;
  sourcePath: string;
  startLocationId: string;
  startLocationNote: string;
  chapterOneProof: string;
  modernBuyer: string;
  otherworldBuyer: string;
  otherworldCapitalUse: string;
  premise: Premise;
}

const entry = (
  metadata: Omit<SerialPremiseCatalogEntry, 'premise'>,
  candidate: unknown,
): SerialPremiseCatalogEntry => ({ ...metadata, premise: PremiseSchema.parse(candidate) });

/**
 * Human-review catalog. Nothing in this list is seeded, approved or allowed to spend.
 * `priority` ranks the three pilots first; it does not bypass the premise/opening gate.
 */
export const SERIAL_PREMISE_CATALOG: SerialPremiseCatalogEntry[] = [
  entry({
    id: 'phe-dan-thuc-tinh', priority: 1,
    sourcePath: 'factory/serial/song-xuyen/03-phe-dan-thuc-tinh.json',
    startLocationId: 'kho_thuoc_thanh_lo',
    startLocationNote: 'Kho thuốc cũ của Thanh Lô, nơi mẻ phế đan và cửa sang Lâm Thành cùng bị giấu.',
    chapterOneProof: 'Một viên phế đan cứu An Diệp khỏi bạo hạch và khiến cô thức tỉnh Lôi Quang trước toàn trạm; tinh hạch trả lại giúp Tạ Vân đột phá.',
    modernBuyer: 'Trạm trú ẩn Lâm Thành mua đan ổn định tinh hạch thông qua bác sĩ Vũ Tịnh.',
    otherworldBuyer: 'Tán tu và lò thuốc Thanh Lô mua đan luyện bằng tinh hạch theo phẩm cấp tại chỗ.',
    otherworldCapitalUse: 'Linh thạch ở lại Thanh Lô để thuê lò, mua dược liệu và dựng đội luyện đan độc lập.',
  }, pheDan),
  entry({
    id: 'hang-ma-phap-khi', priority: 2,
    sourcePath: 'factory/serial/song-xuyen/09-hang-ma-phap-khi.json',
    startLocationId: 'xuong_in_van_cang',
    startLocationNote: 'Xưởng in đồ lễ mắc nợ tại Vân Cảng, cửa sau máy cắt thông sang ngõ nghèo U Đô.',
    chapterOneProof: 'Áo mưa giấy cứu A Noãn khỏi Hồn Vũ; đội trưởng Sầm Giang mua sạch lô đầu và Âm Trầm Mộc giữ xưởng khỏi bị khóa.',
    modernBuyer: 'Các Phục Cổ Vân Cảng mua Âm Trầm Mộc và sách thất truyền sau giám định.',
    otherworldBuyer: 'Đội quỷ sai và dân ngõ nghèo U Đô mua vật dụng giấy đã thành hình.',
    otherworldCapitalUse: 'Âm tiền ở lại U Đô để thuê quỷ sai, mua quyền cư trú và mở tuyến giao vận độc lập Thuế Ty.',
  }, amPhu),
  entry({
    id: 'tiep-van-cuu-chin-thanh', priority: 3,
    sourcePath: 'factory/serial/song-xuyen/01-tiep-van-cuu-chin-thanh.json',
    startLocationId: 'kho_cu_van_cang',
    startLocationNote: 'Kho cũ của gia đình Lâm Duy tại Vân Cảng, cửa sau mở vào cổng thành Trấn Sa.',
    chapterOneProof: 'Hai mươi suất cơm tự sôi giữ quân Trấn Sa tại cổng qua một đêm; kim bài vàng trả lại thanh toán ngay khoản nợ đầu tiên.',
    modernBuyer: 'Kim Phường Vân Cảng mua kim bài, vàng, ngọc và dược liệu có hồ sơ giám định.',
    otherworldBuyer: 'Quan kho Trấn Sa và các thành Cửu Lộ mua từng lô hàng giải đúng nguy cấp quân lương.',
    otherworldCapitalUse: 'Tiền Cửu Lộ ở lại mua kho, thuê đoàn xe và giành quyền vận hành các chặng thương lộ.',
  }, tiepVan),
  entry({
    id: 'tiem-tap-hoa-bang-phong', priority: 4,
    sourcePath: 'factory/serial/song-xuyen/02-tiem-tap-hoa-bang-phong.json',
    startLocationId: 'kho_lanh_tiem_tap_hoa',
    startLocationNote: 'Kho lạnh của tiệm tiện lợi sắp đóng tại Vân Cảng, thông tới lò địa hỏa Băng Phong.',
    chapterOneProof: 'Miếng giữ nhiệt cứu Tuyết Con và giữ lò qua đêm; Tuyết Sâm nhận lại được Bách Thảo Các mua đủ trả tiền thuê.',
    modernBuyer: 'Bách Thảo Các mua Tuyết Sâm và dược liệu sau giám định.',
    otherworldBuyer: 'Thợ mỏ, tán tu và quan kho Băng Phong mua hàng cứu rét theo nhu cầu thật.',
    otherworldCapitalUse: 'Linh thạch ở lại thuê tán tu, mua đất phường thị và dựng thương hội liên mỏ.',
  }, bangPhong),
  entry({
    id: 'thanh-dao-gi-chem-quy', priority: 5,
    sourcePath: 'factory/serial/song-xuyen/04-thanh-dao-gi-chem-quy.json',
    startLocationId: 'kho_tang_vat_van_cang',
    startLocationNote: 'Kho tang vật ca đêm tại Vân Cảng, cửa sắt hỏng thông sang bãi binh khí Ly Châu.',
    chapterOneProof: 'Khương Ly dùng thanh đao gỉ chém Hồng Sa Quỷ trước đội trưởng từng đuổi cô; đèn và băng gạc cứu tiêu đội bên kia.',
    modernBuyer: 'Đội tuần tra và kho trừ quỷ Vân Cảng tiếp nhận binh khí có chứng tích qua Bà Tần.',
    otherworldBuyer: 'Tiêu đội Ly Châu mua bộ cứu viện hiện đại bằng vàng, chiến lợi phẩm và quyền tiếp cận bãi binh khí.',
    otherworldCapitalUse: 'Tiền ở Ly Châu thuê người thu gom, mua trạm nghỉ và bảo vệ tuyến tiêu đội.',
  }, thanhDao),
  entry({
    id: 'may-loc-nuoc-long-cung', priority: 6,
    sourcePath: 'factory/serial/song-xuyen/05-may-loc-nuoc-long-cung.json',
    startLocationId: 'cua_hang_lan_van_cang',
    startLocationNote: 'Hầm chứa của cửa hàng lặn Vân Cảng, thông tới quảng trường giếng đảo Ngân Nhãn.',
    chapterOneProof: 'Máy lọc biến nước biển thành nước uống trước cuộc xử tội; Hắc Triều Châu đổi lại giúp Ngô Hải trả khoản siết đầu tiên.',
    modernBuyer: 'Kim Các Lam Sa và Viện Tinh Vật mua ngọc biển, trân châu và kim loại sau giám định.',
    otherworldBuyer: 'Gia tộc trên đảo và hạm đội mua trạm nước theo hợp đồng công khai.',
    otherworldCapitalUse: 'Hải tệ ở lại đóng tàu, thuê thủy thủ và dựng các trạm lọc do đảo đồng sở hữu.',
  }, haiVuc),
  entry({
    id: 'xe-nang-phao-dai', priority: 7,
    sourcePath: 'factory/serial/song-xuyen/06-xe-nang-phao-dai.json',
    startLocationId: 'container_so_bay',
    startLocationNote: 'Container số bảy ở bãi logistics Vân Cảng, nối thẳng cổng thành Hôi Nham.',
    chapterOneProof: 'Xe nâng dựng lại cổng thành, chặn đợt cướp và kéo Hôi Nham khỏi hạng cuối ngay lần cập nhật đầu.',
    modernBuyer: 'Viện Tinh Vật mua mai dị thú và ma kim sau kiểm định.',
    otherworldBuyer: 'Dân Hôi Nham và lãnh địa đồng minh mua mô-đun xây nhanh, thiết bị nâng và hậu cần.',
    otherworldCapitalUse: 'Tinh tệ ở lại trả công dân, mở mỏ và xây lực lượng phòng thủ Hôi Nham.',
  }, xeNang),
  entry({
    id: 'dien-vien-cao-thu', priority: 8,
    sourcePath: 'factory/serial/song-xuyen/07-dien-vien-cao-thu.json',
    startLocationId: 'kho_dao_cu_anh_sao',
    startLocationNote: 'Kho đạo cụ của hãng Ánh Sao, phông nền cũ thông sang tiêu cục Trường Phong.',
    chapterOneProof: 'Bùi Yến cứu buổi quay trực tiếp và kéo về hợp đồng đầu tiên; tiền đặt cọc mua lương thuốc cứu tiêu cục.',
    modernBuyer: 'Hãng Ánh Sao, khán giả và nhà đấu giá Vân Cảng trả tiền cho biểu diễn, tranh, gỗ quý và đạo cụ đã thẩm định.',
    otherworldBuyer: 'Tiêu cục và phường nghề Hạ Châu nhận lương thực, thuốc, công cụ bằng doanh thu họ cùng tạo ra.',
    otherworldCapitalUse: 'Tiền Hạ Châu ở lại thuê tiêu sư, mua trạm nghỉ và dựng trường quay do người địa phương sở hữu.',
  }, truongQuay),
  entry({
    id: 'hop-chi-khau-cuu-thanh-chu', priority: 9,
    sourcePath: 'factory/serial/song-xuyen/08-hop-chi-khau-cuu-thanh-chu.json',
    startLocationId: 'kho_lanh_vat_tu',
    startLocationNote: 'Kho vật tư y tế bị đóng tại Vân Cảng, cửa phòng lạnh nối với y quán Dược Thành.',
    chapterOneProof: 'Liên Dao dùng hộp chỉ khâu cứu thành chủ trước mặt đan sư; Dưỡng Mạch Thảo đổi lại cứu mẫu thử của Tân Sinh.',
    modernBuyer: 'Phòng thí nghiệm Tân Sinh mua vật liệu sau kiểm nghiệm và công bố dữ liệu an toàn.',
    otherworldBuyer: 'Y quán cùng thành vệ Dược Thành mua bộ cấp cứu và trả bằng dược liệu, vàng, quyền mở y quán.',
    otherworldCapitalUse: 'Linh thạch ở lại thuê y sư, mua mặt bằng và mở mạng cứu chữa ngoại thành.',
  }, duocThanh),
  entry({
    id: 'rac-chien-truong-sieu-vat-lieu', priority: 10,
    sourcePath: 'factory/serial/song-xuyen/10-rac-chien-truong-sieu-vat-lieu.json',
    startLocationId: 'bai_can_van_cang',
    startLocationNote: 'Bãi cân phế liệu Vân Cảng, khe container mở sang kho chiến lợi phẩm Bắc Tuyến.',
    chapterOneProof: 'Mảnh mai dị thú được Viện Tinh Vật trả giá; lô chăn và đèn mua bằng tiền đó cứu đội Đào Lam khỏi bão tuyết.',
    modernBuyer: 'Viện Tinh Vật và xưởng vật liệu mua mẫu đã kiểm định theo hợp đồng công khai.',
    otherworldBuyer: 'Đội trinh sát và thành trì Bắc Tuyến mua hàng cứu viện qua quyền thu gom chiến trường.',
    otherworldCapitalUse: 'Chiến tệ ở lại thuê đội thu gom, mở xưởng phân loại và cấp phần lợi nhuận cho tiền tuyến.',
  }, caoVo),
].sort((a, b) => a.priority - b.priority);
