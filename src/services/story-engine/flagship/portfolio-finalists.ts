import { HumanConceptSelectionV2Schema, type HumanConceptSelectionV2 } from './setup-contracts';

export interface ApprovedPortfolioFinalistV2 {
  slotId: 'HX-04' | 'TH-01' | 'DT-11';
  blindCode: 'HX04-B' | 'TH01-C' | 'DT11-B';
  selection: HumanConceptSelectionV2;
}

const approvedAt = '2026-07-15T10:00:00.000Z';

export const APPROVED_PORTFOLIO_FINALISTS_V2: readonly ApprovedPortfolioFinalistV2[] = Object.freeze([
  {
    slotId: 'HX-04',
    blindCode: 'HX04-B',
    selection: HumanConceptSelectionV2Schema.parse({
      schemaVersion: 2,
      candidateId: 'concept_stone_degradation_cycle',
      approvedTitle: 'Bảo Tôi Xây Thành Trên Tro Trắng, Tôi Lại Bắt Đầu Bằng Lịch Thay Đá',
      approvedBy: 'human-portfolio-gate',
      rationale: 'Người vận hành đã duyệt opening thắng blind review và khóa tên trực diện nói đúng cơ chế lịch thay đá.',
      approvedAt,
    }),
  },
  {
    slotId: 'TH-01',
    blindCode: 'TH01-C',
    selection: HumanConceptSelectionV2Schema.parse({
      schemaVersion: 2,
      candidateId: 'concept_echo_chamber_farming',
      approvedTitle: 'Trọng Sinh Về Gia Tộc Tu Tiên, Tôi Gieo Tiếng Vọng Cho Mười Năm Sau',
      approvedBy: 'human-portfolio-gate',
      rationale: 'Người vận hành đã duyệt opening thắng blind review và khóa tên trực diện nói đúng đầu tư tiếng vọng nhiều thế hệ.',
      approvedAt,
    }),
  },
  {
    slotId: 'DT-11',
    blindCode: 'DT11-B',
    selection: HumanConceptSelectionV2Schema.parse({
      schemaVersion: 2,
      candidateId: 'concept_crystalline_structure',
      approvedTitle: 'Giám Bảo Gốm Cổ: Tôi Chạm Một Lần, Biết Nó Được Nung Bằng Lửa Gì',
      approvedBy: 'human-portfolio-gate',
      rationale: 'Người vận hành đã duyệt opening thắng blind review và khóa tên trực diện nói đúng nghề cùng giới hạn xúc giác.',
      approvedAt,
    }),
  },
]);
