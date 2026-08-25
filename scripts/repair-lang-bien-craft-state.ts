/**
 * One-time production reconciliation for the audited Làng Biển novel.
 *
 * Dry-run by default. --apply requires the exact cancelled chapter-37 job so
 * no worker can race the canonical patch.
 */
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import {
  ArcPlanSchema,
  StoryKernelSchema,
  StoryStateSchema,
  validateArcAgainstKernel,
  validateArcResourceReachability,
  validateKernelState,
} from '../src/services/story-factory';

dotenv.config({ path: '.env.runtime', quiet: true });
dotenv.config({ path: '.env.local', quiet: true });

const JOB_ID = '0c81ad5c-8c43-4dc5-8d35-61fcccfa4a65';
const PROJECT_ID = '0888ab7b-664d-4149-82b7-a7eeb267bace';
const apply = process.argv.includes('--apply');

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error('Supabase server environment is missing.');
const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

const nextDirective = `Áp dụng từ Chương 38. Khoản nợ gốc với Ba Cẩn đã kết thúc; chín đồng phí bến ông ta tự ghi chỉ là khoản tranh chấp cũ, không được tính lãi, thu nợ hoặc biến lại thành reward loop. Ba Cẩn chỉ còn là đối thủ địa phương: nếu quay lại phải dùng một hành động mới gây hậu quả thật, không được tới nhìn Phan thắng rồi lại nhận ra mình bất lực. Hệ hiện tại có bảy mồi giả; tuyệt đối không lùi về bốn. Không lặp Chương 31 theo nhịp giải thích bảy mồi → ra rạn → bắt mực, và không lặp Chương 34/37 theo nhịp kiểm hàng → khen chuẩn → ký bao tiêu. Từ đây chuyển sang hậu quả có giá của việc tổ chức đội xuồng: chất lượng không đều, quyền loại hàng, chia thiệt hại, lòng trung thành, dầu/đá và quyền định giá. Mỗi cửa sổ ba chương cần một lựa chọn gây mất mát hoặc chia rẽ hữu hình, một người có quyền phản ứng trực tiếp và một kết quả khác loại; kỹ thuật chỉ là đòn bẩy, không phải bài thuyết minh.`;

async function main() {
  const [jobResult, projectResult] = await Promise.all([
    db.from('story_factory_jobs').select('*').eq('id', JOB_ID).single(),
    db.from('ai_story_projects').select('*').eq('id', PROJECT_ID).single(),
  ]);
  if (jobResult.error) throw jobResult.error;
  if (projectResult.error) throw projectResult.error;
  const job = jobResult.data;
  const project = projectResult.data;

  if (job.project_id !== PROJECT_ID || job.current_chapter !== 37) {
    throw new Error(`Expected exact chapter-37 job; got project=${job.project_id} chapter=${job.current_chapter}.`);
  }
  if (apply && (job.status !== 'cancelled' || job.lease_token !== null)) {
    throw new Error(`--apply requires cancelled/unleased job; got status=${job.status} lease=${String(job.lease_token)}.`);
  }

  const kernel = StoryKernelSchema.parse(project.story_kernel);
  const state = StoryStateSchema.parse(project.story_state);
  const arc = ArcPlanSchema.parse(project.arc_plan);

  const repairedKernel = StoryKernelSchema.parse({
    ...kernel,
    resources: kernel.resources.map(resource => resource.id === 'res_phan_no_ba_can'
      ? { ...resource, name: 'Phí bến Ba Cẩn tự ghi (đang tranh chấp)' }
      : resource),
    characters: kernel.characters.map(character => {
      if (character.id === 'character_protagonist_01') return {
        ...character,
        agenda: 'Đã trả sạch nợ gia đình; tổ chức đội xuồng thành một liên minh có kỷ luật, giữ quyền chọn đầu ra và tích lũy vốn cho động cơ 15 mã lực.',
      };
      if (character.id === 'character_supporting_01') return {
        ...character,
        constraint: 'Nóng nảy, còn mặc cảm vì từng làm chìm tàu và thường đặt tình nghĩa trước kỷ luật kinh tế của cả đội.',
      };
      return character;
    }),
    worldMechanics: kernel.worldMechanics.map(mechanic => {
      if (mechanic.id === 'conv_qua_dem' && mechanic.kind === 'conversion') return {
        ...mechanic,
        description: 'Tiêu thụ chu kỳ ban đêm để chuyển sang ban ngày, đồng thời hồi phục sức lực và làm mới sức mua nền của thương lái.',
        outputsPerBatch: mechanic.outputsPerBatch.filter(output => (
          output.resourceId !== 'res_phan_no_ba_can'
          && output.resourceId !== 'res_bacan_diesel'
        )),
      };
      if (mechanic.id === 'cap_qua_dem' && mechanic.kind === 'capability') return {
        ...mechanic,
        description: 'Thực hiện quá trình chuyển đổi thời gian qua đêm và hồi phục tài nguyên tuần hoàn; không tự tạo nợ, phí hoặc tài sản cho đối thủ.',
        effectResources: mechanic.effectResources.filter(effect => (
          effect.resourceId !== 'res_phan_no_ba_can'
          && effect.resourceId !== 'res_bacan_diesel'
        )),
      };
      return mechanic;
    }),
    seriesSpine: {
      ...kernel.seriesSpine,
      stages: kernel.seriesSpine.stages.map(stage => stage.id === 'stage_01_coastal_survival'
        ? {
          ...stage,
          conflictSource: 'Khoản nợ đã khép; xung đột còn lại đến từ chất lượng không đều trong đội xuồng, dầu/đá hạn chế, quyền định giá và những đòn mua chuộc địa phương của Ba Cẩn.',
          protagonistGoal: 'Giữ liên minh đội xuồng không vỡ khi phải áp kỷ luật chất lượng và chia thiệt hại, đồng thời tích lũy đủ vốn cho động cơ 15 mã lực.',
          rewardLoopVariant: 'Đọc luồng và điều phối đội xuồng -> phân loại hàng có người chịu trách nhiệm -> bán theo chuẩn công khai -> tái đầu tư vào dầu, đá và động cơ.',
          irreversibleChange: 'Phan đã sạch nợ và có đầu ra độc lập; phần còn lại của stage phải biến nhóm xuồng rời rạc thành một liên minh chịu được thất bại và kỷ luật chung.',
        }
        : stage),
    },
  });

  const repairedState = StoryStateSchema.parse({
    ...state,
    facts: state.facts.map(fact => fact.id === 'fact_den_han_tra_no'
      ? { ...fact, value: 'false' }
      : fact),
  });

  const repairedArc = ArcPlanSchema.parse({
    ...arc,
    objective: 'Phan giữ liên minh đội xuồng không tan vỡ khi tiêu chuẩn hàng bắt đầu tạo người thắng, người chịu thiệt; biến quyền đọc luồng thành kỷ luật chia lợi ích và tích lũy vốn cho động cơ 15 mã lực.',
    progression: [
      'Chương 26-30: Phan mở đầu ra Hải Đông Lạnh, lập đội xuồng và trả sạch nợ gốc; đây là lịch sử đã hoàn tất, không diễn lại.',
      'Chương 31-37: Đội xuồng thử bảy mồi, hầm đá và chuẩn hàng; hợp đồng bao tiêu đã ký, các cảnh giải thích mồi và ký hợp đồng đã hoàn tất.',
      'Chương 38-40: Hậu quả đầu tiên của chuẩn chung xuất hiện khi chất lượng giữa các xuồng không đều. Phan phải chọn ai chịu mất hàng hoặc dùng tiền mình bù, khiến Minh/Hải phản ứng theo lợi ích riêng.',
      'Chương 41-45: Ba Cẩn chỉ được tác động bằng một phương thức mới như mua chuộc hoặc kéo một chủ xuồng rời đội; trọng tâm là lòng trung thành, sổ chia lợi ích và quyền quyết định trong liên minh, không phải thu nợ.',
      'Chương 46-50: Dầu, đá và sức chở trở thành giới hạn thật. Phan chấp nhận một thất bại hoặc đơn hàng nhỏ hơn để giữ chữ tín, rồi khóa quỹ mua động cơ 15 mã lực và bước sang stage hầm đá/tàu lớn.',
    ],
    activeConflicts: [
      'Tiêu chuẩn hàng chung tạo xung đột giữa chất lượng, miếng cơm từng chủ xuồng và uy tín của cả liên minh.',
      'Hải Đông Lạnh bảo vệ tiền và đầu ra của mình, không còn là người chỉ khen/giải thích; quyết định nhận hay loại hàng của anh phải buộc Phan trả giá.',
      'Ba Cẩn chỉ còn khả năng mua chuộc, chia rẽ hoặc giữ một mắt xích địa phương; ông không được tái diễn thu nợ hay đứng nhìn một thất bại bến bãi nữa.',
      'Dầu, đá, sức chở và vốn cho động cơ 15 mã lực giới hạn tốc độ mở rộng thực tế.',
    ],
    terminalChanges: [
      'Liên minh có quy tắc phân loại, chia thiệt hại và quyền quyết định được thử bằng ít nhất một lô hàng thất bại thật.',
      'Quan hệ Phan-Minh và Phan-Hải đổi vì một lựa chọn gây thiệt hại, không chỉ vì một hợp đồng mới.',
      'Ba Cẩn mất vai trò chủ nợ nhưng còn là tác nhân địa phương có thể chia rẽ người trong đội bằng lợi ích.',
      'Phan khóa được quỹ hoặc nguồn lực cụ thể để chuyển sang động cơ 15 mã lực và stage hầm đá/tàu lớn.',
    ],
    activeResourceIds: arc.activeResourceIds.filter(id => (
      id !== 'res_phan_no_ba_can'
      && id !== 'res_bacan_vnd'
      && id !== 'res_bacan_diesel'
    )),
  });

  validateKernelState(repairedKernel, repairedState);
  validateArcAgainstKernel(repairedKernel, repairedArc);
  validateArcResourceReachability({ kernel: repairedKernel, arc: repairedArc, state: repairedState });

  const summary = {
    dryRun: !apply,
    job: { id: job.id, status: job.status, stage: job.stage, chapter: job.current_chapter },
    changes: {
      debtDueFact: [state.facts.find(fact => fact.id === 'fact_den_han_tra_no')?.value, 'false'],
      disputedFeeBalancePreserved: repairedState.resources.find(resource => resource.resourceId === 'res_phan_no_ba_can'),
      overnightOutputs: (repairedKernel.worldMechanics.find(mechanic => mechanic.id === 'conv_qua_dem') as { outputsPerBatch?: unknown }).outputsPerBatch,
      arcObjective: repairedArc.objective,
      activeResourceIds: repairedArc.activeResourceIds,
      authorDirective: nextDirective,
    },
  };
  console.log(JSON.stringify(summary, null, 2));
  if (!apply) return;

  const now = new Date().toISOString();
  const projectUpdate = await db.from('ai_story_projects').update({
    story_kernel: repairedKernel,
    story_state: repairedState,
    arc_plan: repairedArc,
    author_directive: nextDirective,
    updated_at: now,
  }).eq('id', PROJECT_ID);
  if (projectUpdate.error) throw projectUpdate.error;
  const jobUpdate = await db.from('story_factory_jobs').update({
    rolling_plan: null,
    plan_feedback: null,
    stage: 'plan',
    retry_count: 0,
    last_error: null,
    updated_at: now,
  }).eq('id', JOB_ID).eq('status', 'cancelled').is('lease_token', null);
  if (jobUpdate.error) throw jobUpdate.error;

  const readback = await db.from('ai_story_projects')
    .select('story_kernel,story_state,arc_plan,author_directive')
    .eq('id', PROJECT_ID).single();
  if (readback.error) throw readback.error;
  const readKernel = StoryKernelSchema.parse(readback.data.story_kernel);
  const readState = StoryStateSchema.parse(readback.data.story_state);
  const readArc = ArcPlanSchema.parse(readback.data.arc_plan);
  validateKernelState(readKernel, readState);
  validateArcAgainstKernel(readKernel, readArc);
  if (readback.data.author_directive !== nextDirective) throw new Error('Author directive readback mismatch.');
  console.log(JSON.stringify({ applied: true, readback: {
    chapter: readState.chapterNumber,
    debtDueFact: readState.facts.find(fact => fact.id === 'fact_den_han_tra_no')?.value,
    activeDebtResource: readArc.activeResourceIds.includes('res_phan_no_ba_can'),
    directiveMatches: true,
  } }, null, 2));
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
