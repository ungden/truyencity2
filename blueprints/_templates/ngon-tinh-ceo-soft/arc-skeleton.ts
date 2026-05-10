/**
 * Ngon-tinh "ceo-soft" master template — 1000-chapter skeleton.
 *
 * Archetype: Romance hiện đại Trung-style. Female lead {{FEMALE_MC}} hoặc
 * male lead {{MALE_MC}} (CEO bá đạo nhưng soft inside) gặp nhau qua
 * misunderstanding, romance arc với career escalation, family drama,
 * rival lover, separation + reunion, ending wedding + child.
 *
 * NON_COMBAT — conflict qua misunderstanding / family interference /
 * career rivalry / past trauma. KHÔNG bạo lực vật lý.
 *
 * Cảnh giới romance:
 *   Arc 1 (1-50):    First meet → first kiss (misunderstanding + tension)
 *   Arc 2 (51-150):  Dating → confess (family interference)
 *   Arc 3 (151-300): Engaged → break up (rival + past trauma reveal)
 *   Arc 4 (301-500): Separation → reunion (career parallel)
 *   Arc 5 (501-700): Wedding → first child
 *   Arc 6 (701-900): Family business empire
 *   Arc 7 (901-1000): {{ENDING_GOAL}}
 *
 * Tokens:
 *   {{FEMALE_MC}}, {{FEMALE_MC_FAMILY}} — Nữ chính, vd "Lin Wan", "Lin"
 *   {{MALE_MC}}, {{MALE_MC_FAMILY}} — Nam chính (CEO), vd "Trần Mộ Dao", "Trần"
 *   {{COMPANY_NAME}} — Công ty CEO, vd "Mộ Dao Tập Đoàn"
 *   {{HOMETOWN}}, {{CITY_NAME}}
 *   {{RIVAL_LOVER}} — Đối thủ tình, vd "Lý Vy" (cũ female / male)
 *   {{INTERFERING_FAMILY}} — Gia đình cản, vd "Lý gia"
 *   {{PAST_TRAUMA}} — Trauma từ kiếp trước, vd "MC bị fiancé phản bội năm 18"
 *   {{ENDING_GOAL}} — Vd "vợ chồng bá đạo, family empire stable"
 */

export type { BeatType, ChapterBrief, SubArc, ArcSkeleton } from '../../../src/services/story-engine/blueprint/types';

import type { ArcSkeleton } from '../../../src/services/story-engine/blueprint/types';

export const NGON_TINH_CEO_SOFT_ARC_SKELETON: ArcSkeleton[] = [
  {
    arcNumber: 1, range: [1, 50],
    theme: 'First meet — misunderstanding tension',
    corePayoff: '{{FEMALE_MC}} + {{MALE_MC}} gặp nhau qua misunderstanding, work together at {{COMPANY_NAME}}, first kiss',
    subArcs: [
      { number: 1, range: [1, 5], theme: 'Warm baseline — first meet, misunderstanding', payoff: 'meet cute, tension established' },
      { number: 2, range: [6, 10], theme: 'Work together at {{COMPANY_NAME}}', payoff: 'professional dynamic' },
      { number: 3, range: [11, 15], theme: '{{RIVAL_LOVER}} appear — jealousy', payoff: 'tension escalate, MC react' },
      { number: 4, range: [16, 20], theme: 'Resolve first work crisis together', payoff: 'team bond, mutual respect' },
      { number: 5, range: [21, 25], theme: 'BIG WOW: dance / event / public moment', payoff: 'visible chemistry, public notice' },
      { number: 6, range: [26, 30], theme: '{{INTERFERING_FAMILY}} first contact', payoff: 'family interference, MC defends' },
      { number: 7, range: [31, 35], theme: 'Misunderstanding deepens', payoff: 'tension peak, near-break' },
      { number: 8, range: [36, 40], theme: 'Resolve misunderstanding', payoff: 'vulnerability, deeper connection' },
      { number: 9, range: [41, 45], theme: 'Family business crisis - solve together', payoff: 'company stable, MC promote' },
      { number: 10, range: [46, 50], theme: 'CLIMAX: first kiss + dating start', payoff: 'official dating, sẵn sàng arc 2' },
    ],
  },
  {
    arcNumber: 2, range: [51, 150],
    theme: 'Dating → confess — family interference',
    corePayoff: '{{FEMALE_MC}} + {{MALE_MC}} confess yêu, đối phó {{INTERFERING_FAMILY}}, career escalate together',
    subArcs: [
      { number: 1, range: [51, 60], theme: 'Dating phase — sweet moments', payoff: 'romance escalate' },
      { number: 2, range: [61, 70], theme: '{{RIVAL_LOVER}} mass interference', payoff: 'MC face-slap rival' },
      { number: 3, range: [71, 80], theme: 'Career milestone together', payoff: 'company expand, project win' },
      { number: 4, range: [81, 90], theme: '{{INTERFERING_FAMILY}} mass attack relationship', payoff: 'family drama escalate' },
      { number: 5, range: [91, 100], theme: 'BIG WOW: confess yêu', payoff: 'official I-love-you moment' },
      { number: 6, range: [101, 110], theme: 'Move in together', payoff: 'live-in, deeper bond' },
      { number: 7, range: [111, 120], theme: '{{RIVAL_LOVER}} final attempt', payoff: 'rival lui retreat, MC face-slap' },
      { number: 8, range: [121, 130], theme: '{{INTERFERING_FAMILY}} reveal: setup MC', payoff: 'family interference exposed' },
      { number: 9, range: [131, 140], theme: 'Family bại — public apology', payoff: '{{INTERFERING_FAMILY}} face-slap mass' },
      { number: 10, range: [141, 150], theme: 'CLIMAX arc 2: relationship public stable', payoff: 'sẵn sàng arc 3 engaged' },
    ],
  },
  {
    arcNumber: 3, range: [151, 300],
    theme: 'Engaged → break up — past trauma reveal',
    corePayoff: 'Engaged lễ + reveal {{PAST_TRAUMA}} → break up, MC career rebuild solo, parallel career arcs',
    subArcs: [
      { number: 1, range: [151, 165], theme: 'Engaged announcement', payoff: 'engagement official' },
      { number: 2, range: [166, 180], theme: 'Build wedding plan', payoff: 'wedding prep' },
      { number: 3, range: [181, 200], theme: '{{PAST_TRAUMA}} reveal', payoff: 'past trauma surface, conflict' },
      { number: 4, range: [201, 220], theme: 'Misunderstanding deep — break up', payoff: 'break up, separation' },
      { number: 5, range: [221, 240], theme: 'BIG WOW: solo career escalate', payoff: 'MC top company independent' },
      { number: 6, range: [241, 260], theme: 'Parallel career arcs', payoff: 'both peak career' },
      { number: 7, range: [261, 280], theme: '{{RIVAL_LOVER}} attempt move in', payoff: 'MC reject, still love {{MALE_MC}}/{{FEMALE_MC}}' },
      { number: 8, range: [281, 295], theme: 'Mass company merger — work together again', payoff: 'forced collaboration' },
      { number: 9, range: [296, 300], theme: 'CLIMAX arc 3: forced collaboration tension', payoff: 'sẵn sàng reunion arc 4' },
    ],
  },
  {
    arcNumber: 4, range: [301, 500],
    theme: 'Separation → reunion',
    corePayoff: 'Reunion + understanding past trauma, marry {{ENDING_GOAL}} prep, career empire ổn định',
    subArcs: [
      { number: 1, range: [301, 320], theme: 'Forced collaboration deepens', payoff: 'old feelings resurface' },
      { number: 2, range: [321, 340], theme: 'Resolve {{PAST_TRAUMA}} together', payoff: 'understanding + healing' },
      { number: 3, range: [341, 360], theme: 'Reunion - public', payoff: 'official reunion' },
      { number: 4, range: [361, 380], theme: '{{INTERFERING_FAMILY}} last attempt block', payoff: 'family bại lần cuối' },
      { number: 5, range: [381, 400], theme: 'BIG WOW: re-engagement', payoff: 're-engagement official' },
      { number: 6, range: [401, 420], theme: 'Build joint business empire', payoff: 'mass merger, company top quốc tế' },
      { number: 7, range: [421, 440], theme: '{{RIVAL_LOVER}} final closure', payoff: 'rival ending, MC + partner solo' },
      { number: 8, range: [441, 460], theme: 'Mass corp acquisition', payoff: 'business empire expand' },
      { number: 9, range: [461, 480], theme: 'Pre-wedding final prep', payoff: 'wedding ceremony prep' },
      { number: 10, range: [481, 500], theme: 'CLIMAX arc 4: re-engagement + business top', payoff: 'sẵn sàng wedding arc 5' },
    ],
  },
  {
    arcNumber: 5, range: [501, 700],
    theme: 'Wedding → first child',
    corePayoff: 'Wedding + first child + family business empire stable + happy life',
    subArcs: [
      { number: 1, range: [501, 520], theme: 'Wedding ceremony lavish', payoff: 'official marriage' },
      { number: 2, range: [521, 540], theme: 'Honeymoon — sweet moments', payoff: 'deepening intimacy' },
      { number: 3, range: [541, 560], theme: 'Mass mistake at corp - solve together', payoff: 'corp issue resolve' },
      { number: 4, range: [561, 580], theme: 'Pregnancy reveal', payoff: 'baby arrival news' },
      { number: 5, range: [581, 600], theme: 'BIG WOW: first child born', payoff: 'family of 3' },
      { number: 6, range: [601, 620], theme: 'Build family routine', payoff: 'baby + work balance' },
      { number: 7, range: [621, 640], theme: 'Career milestones - top quốc tế', payoff: 'business top global' },
      { number: 8, range: [641, 660], theme: '{{RIVAL_LOVER}} farewell', payoff: 'closure rival' },
      { number: 9, range: [661, 680], theme: 'Family bonds - parents reconcile', payoff: 'all family reconciled' },
      { number: 10, range: [681, 700], theme: 'CLIMAX arc 5: family stable + business empire', payoff: 'sẵn sàng arc 6' },
    ],
  },
  {
    arcNumber: 6, range: [701, 900],
    theme: 'Family business empire',
    corePayoff: 'Family empire global, kế thừa thế hệ 2 prep, mass corp ALL bowed',
    subArcs: [
      { number: 1, range: [701, 720], theme: 'Empire global expansion', payoff: 'multi-country operations' },
      { number: 2, range: [721, 740], theme: 'Second child', payoff: 'family of 4' },
      { number: 3, range: [741, 760], theme: 'Cosmic-tier business deal', payoff: 'mass acquisition global' },
      { number: 4, range: [761, 780], theme: 'Past mafia kinh tế interference', payoff: 'face-slap mafia' },
      { number: 5, range: [781, 800], theme: 'BIG WOW: Forbes top 10', payoff: 'global recognition' },
      { number: 6, range: [801, 820], theme: 'Charity foundation lập', payoff: 'foundation 5B USD' },
      { number: 7, range: [821, 840], theme: 'Children grow - thế hệ 2', payoff: 'children prep kế thừa' },
      { number: 8, range: [841, 860], theme: 'Mass mafia bại', payoff: 'mafia kinh tế dập' },
      { number: 9, range: [861, 880], theme: 'Davos / global recognition', payoff: 'global leadership' },
      { number: 10, range: [881, 900], theme: 'CLIMAX arc 6: top global + family stable', payoff: 'sẵn sàng arc 7' },
    ],
  },
  {
    arcNumber: 7, range: [901, 1000],
    theme: '{{ENDING_GOAL}}',
    corePayoff: 'MC + spouse đạt {{ENDING_GOAL}}, kế thừa thế hệ 2, ending warm',
    subArcs: [
      { number: 1, range: [901, 920], theme: 'Last business challenge - black swan', payoff: 'phát hiện black swan' },
      { number: 2, range: [921, 940], theme: 'Restructure for endgame', payoff: 'restructured ready' },
      { number: 3, range: [941, 960], theme: 'Black swan resolve', payoff: 'crisis past' },
      { number: 4, range: [961, 980], theme: 'BIG WOW: {{ENDING_GOAL}} đạt', payoff: 'achievement đạt' },
      { number: 5, range: [981, 1000], theme: 'ENDING: warm closure', payoff: 'thế hệ 2 lên, MC + spouse retire, ending warm' },
    ],
  },
];
