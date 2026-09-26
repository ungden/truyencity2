'use client';

import { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

type Job = {
  id: string;
  status: string;
  stage: string;
  current_chapter: number;
  daily_target: number;
  chapters_today: number;
  consecutive_replans: number;
  last_error: string | null;
  last10Usd: number;
  openingChapters: Array<{ chapter_number: number; title: string; content: string; publication_state: string }>;
  openingAudit: { passed?: boolean; summary?: string; findings?: unknown[] } | null;
  serial_novels: { approved_at: string | null; opening_reviewed_at: string | null; route_version: string } | Array<{ approved_at: string | null; opening_reviewed_at: string | null; route_version: string }>;
  novels: { title: string; slug: string; hidden: boolean; chapter_count: number } | Array<{ title: string; slug: string; hidden: boolean; chapter_count: number }>;
};

type CatalogEntry = {
  id: string;
  priority: number;
  sourcePath: string;
  premise: {
    title: string;
    lane: string;
    hook: string;
    blurb: string;
    readerFantasy: string;
    presentation: {
      coverPath: string;
      tagline: string;
      shortDescription: string;
      tags: string[];
      sellingPoints: string[];
    };
    payoffStance: string;
    oppositionEngine: string;
    hiddenThread: string;
    goldenFinger: { name: string; rule: string; evolution: Array<{ id: string; name: string; changesUse: string }> };
    conflictLadder: { survival: string; rules: string; ideology: string; self: string };
    voiceSheet: { reactionRule: string };
    castSeed: Array<{
      id: string; name: string; role: string; startLocationId: string;
      startingProgressions: Array<{ systemId: string; trackId: string | null; rankId: string; minorStageId: string | null }>;
      milestones: Array<{ name: string; socialResult: string }>;
    }>;
    worldKernel: {
      worlds: Array<{ id: string; name: string; civilizationState: string; locations: Array<{ id: string; name: string; note: string }>; factions: Array<{ id: string; name: string; agenda: string }> }>;
      progressionSystems: Array<{ id: string; name: string; kind: string; tracks: Array<{ id: string; name: string }>; ranks: Array<{ id: string; name: string }>; minorStages: Array<{ id: string; name: string }> }>;
      gradeSystems: Array<{ id: string; name: string; categories: string[]; tiers: Array<{ id: string; name: string }>; qualities: Array<{ id: string; name: string }>; note: string }>;
      economyLoops: Array<{ id: string; name: string; goods: string[]; buyer: string; settlement: string; reinvestment: string }>;
      launchProducts: Array<{ id: string; name: string; category: string; tierId: string | null; qualityId: string | null; effect: string; targetBuyer: string }>;
      openingContract: Array<{ chapterNumber: number; proves: string; namedLevelOrGrade: string; visibleResult: string; witnessReaction: string; commercialAction: string }>;
    };
  };
};

const one = <T,>(value: T | T[]): T | undefined => (Array.isArray(value) ? value[0] : value);

/**
 * The health signal here is how the last ten chapters read, not how many jobs are
 * blocked — the engine has no blocked status. A paused story is the only thing that
 * needs a person, and what it needs is a read.
 */
export default function SerialPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [catalog, setCatalog] = useState<CatalogEntry[]>([]);
  const [enabled, setEnabled] = useState(false);
  const [routeVersion, setRouteVersion] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const response = await fetch('/api/admin/serial', { cache: 'no-store' });
    const payload = await response.json();
    if (response.ok) {
      setJobs(payload.jobs ?? []);
      setCatalog(payload.catalog ?? []);
      setEnabled(Boolean(payload.enabled));
      setRouteVersion(payload.routeVersion ?? '');
    } else {
      setError(payload.error ?? 'Không tải được danh sách.');
    }
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  const act = async (action: 'approve' | 'restart_opening' | 'release' | 'pause' | 'resume', jobId: string) => {
    if (action === 'restart_opening' && !window.confirm('Xóa bốn bản nháp và lập lại opening từ chương 1?')) return;
    if (action === 'release' && !window.confirm('Công khai bộ truyện và chu kỳ đầu cho độc giả?')) return;
    setError(null);
    const response = await fetch('/api/admin/serial', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, jobId }),
    });
    if (!response.ok) setError((await response.json()).error ?? 'Thao tác thất bại.');
    await load();
  };

  const awaiting = jobs.filter(job => job.status === 'awaiting_approval');
  const openingReview = jobs.filter(job => job.status === 'opening_review');
  const paused = jobs.filter(job => job.status === 'paused');

  return <div className="space-y-6 p-6">
    <div>
      <h1 className="text-3xl font-bold">Truyện dài</h1>
      <p className="text-sm text-muted-foreground">
        Cron {enabled ? 'đang bật' : 'đang tắt'} · route {routeVersion || '—'}
      </p>
    </div>

    <Card>
      <CardContent className="grid gap-2 pt-6 text-sm md:grid-cols-5">
        <p>Bộ đang chạy: {jobs.filter(job => job.status === 'ready' || job.status === 'running').length}</p>
        <p>Chờ duyệt premise: {awaiting.length}</p>
        <p>Chờ duyệt 4 chương: {openingReview.length}</p>
        <p>Đang dừng để đọc lại: {paused.length}</p>
        <p>Độc giả chỉ thấy chương sau khi cả cụm được duyệt.</p>
      </CardContent>
    </Card>

    <Card>
      <CardHeader>
        <CardTitle>Danh mục Song Xuyên chờ duyệt</CardTitle>
        <p className="text-sm text-muted-foreground">
          {catalog.length} package production nằm trong source, chưa seed database và chưa gọi model. Mỗi package gồm premise và World Kernel để duyệt một lần.
        </p>
      </CardHeader>
      <CardContent>
        <Accordion type="single" collapsible className="w-full">
          {catalog.map(item => (
            <AccordionItem key={item.id} value={item.id}>
              <AccordionTrigger>
                <span>
                  <span className="mr-2 text-xs text-muted-foreground">#{item.priority}</span>
                  {item.premise.title}
                  {item.priority <= 3 && <span className="ml-2 text-xs font-normal text-amber-700">pilot</span>}
                </span>
              </AccordionTrigger>
              <AccordionContent className="space-y-4">
                <div className="grid gap-5 md:grid-cols-[240px_1fr]">
                  {/* eslint-disable-next-line @next/next/no-img-element -- local review asset with a dynamic catalog path */}
                  <img
                    src={item.premise.presentation.coverPath}
                    alt={`Bìa ${item.premise.title}`}
                    className="aspect-[2/3] w-full rounded-lg border object-cover shadow-sm"
                  />
                  <div className="space-y-3">
                    <p className="text-lg font-semibold">{item.premise.presentation.tagline}</p>
                    <p>{item.premise.presentation.shortDescription}</p>
                    <div className="flex flex-wrap gap-2">
                      {item.premise.presentation.tags.map(tag => (
                        <span key={tag} className="rounded-full bg-muted px-2.5 py-1 text-xs">{tag}</span>
                      ))}
                    </div>
                    <ul className="list-disc space-y-1 pl-5 text-sm">
                      {item.premise.presentation.sellingPoints.map(point => <li key={point}>{point}</li>)}
                    </ul>
                  </div>
                </div>
                <div className="grid gap-2 md:grid-cols-3">
                  <p><strong>Lane:</strong> {item.premise.lane}</p>
                  <p><strong>Payoff:</strong> {item.premise.payoffStance}</p>
                  <p><strong>Schema:</strong> World Kernel v2</p>
                </div>
                <div className="space-y-2">
                  <p><strong>Hook:</strong> {item.premise.hook}</p>
                  <p><strong>Fantasy:</strong> {item.premise.readerFantasy}</p>
                  <p>{item.premise.blurb}</p>
                </div>
                <div>
                  <p className="font-medium">{item.premise.goldenFinger.name}</p>
                  <p>{item.premise.goldenFinger.rule}</p>
                  <ol className="mt-2 list-decimal space-y-1 pl-5">
                    {item.premise.goldenFinger.evolution.map(rung => (
                      <li key={rung.id}><strong>{rung.name}:</strong> {rung.changesUse}</li>
                    ))}
                  </ol>
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <div><p className="font-medium">Sinh tồn</p><p>{item.premise.conflictLadder.survival}</p></div>
                  <div><p className="font-medium">Quy tắc</p><p>{item.premise.conflictLadder.rules}</p></div>
                  <div><p className="font-medium">Lý niệm</p><p>{item.premise.conflictLadder.ideology}</p></div>
                  <div><p className="font-medium">Tự thân</p><p>{item.premise.conflictLadder.self}</p></div>
                </div>
                <div className="space-y-2">
                  <p><strong>Nguồn đối kháng:</strong> {item.premise.oppositionEngine}</p>
                  <p><strong>Đường ngầm:</strong> {item.premise.hiddenThread}</p>
                  <p><strong>Luật phản ứng:</strong> {item.premise.voiceSheet.reactionRule}</p>
                </div>
                <div className="space-y-3">
                  <p className="text-base font-semibold">Hai thế giới</p>
                  {item.premise.worldKernel.worlds.map(world => (
                    <div key={world.id} className="rounded-md border p-3">
                      <p className="font-medium">{world.name}</p><p>{world.civilizationState}</p>
                      <p className="mt-2 text-xs text-muted-foreground">Địa điểm: {world.locations.map(location => `${location.name} (${location.id})`).join(' · ')}</p>
                      <p className="text-xs text-muted-foreground">Phe phái: {world.factions.map(faction => faction.name).join(' · ')}</p>
                    </div>
                  ))}
                </div>
                <div className="space-y-2">
                  <p className="text-base font-semibold">Cảnh giới, nghề và địa vị</p>
                  <div className="overflow-x-auto"><table className="w-full border-collapse text-left text-xs"><tbody>
                    {item.premise.worldKernel.progressionSystems.map(system => (
                      <tr key={system.id} className="border-t align-top"><th className="p-2">{system.name}</th><td className="p-2">{system.tracks.length ? `${system.tracks.map(track => track.name).join(', ')} · ` : ''}{system.ranks.map(rank => rank.name).join(' → ')}{system.minorStages.length ? ` · ${system.minorStages.map(stage => stage.name).join(' / ')}` : ''}</td></tr>
                    ))}
                  </tbody></table></div>
                </div>
                <div className="space-y-2">
                  <p className="text-base font-semibold">Phẩm cấp</p>
                  {item.premise.worldKernel.gradeSystems.map(system => (
                    <div key={system.id} className="rounded-md bg-muted p-3"><p className="font-medium">{system.name}</p><p>{system.categories.join(', ')}</p><p className="text-xs">{system.tiers.map(tier => tier.name).join(' → ')}{system.qualities.length ? ` · ${system.qualities.map(quality => quality.name).join(' / ')}` : ''}</p><p className="text-xs text-muted-foreground">{system.note}</p></div>
                  ))}
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  {item.premise.worldKernel.economyLoops.map(loop => (
                    <div key={loop.id} className="rounded-md border p-3"><p className="font-medium">{loop.name}</p><p><strong>Hàng:</strong> {loop.goods.join(', ')}</p><p><strong>Người mua:</strong> {loop.buyer}</p><p><strong>Thanh toán:</strong> {loop.settlement}</p><p><strong>Tái đầu tư:</strong> {loop.reinvestment}</p></div>
                  ))}
                </div>
                <div className="space-y-2">
                  <p className="text-base font-semibold">Thương phẩm mở màn</p>
                  {item.premise.worldKernel.launchProducts.map(product => <p key={product.id}><strong>{product.name}</strong> · {[product.tierId, product.qualityId].filter(Boolean).join(' / ') || product.category} — {product.effect} Người mua: {product.targetBuyer}</p>)}
                </div>
                <div className="space-y-2">
                  <p className="text-base font-semibold">Cast progression</p>
                  {item.premise.castSeed.map(member => (
                    <div key={member.id} className="rounded-md border p-3"><p className="font-medium">{member.name} · {member.role} · {member.startLocationId}</p><ol className="list-decimal pl-5">{member.milestones.map(milestone => <li key={milestone.name}><strong>{milestone.name}:</strong> {milestone.socialResult}</li>)}</ol></div>
                  ))}
                </div>
                <div className="space-y-2">
                  <p className="text-base font-semibold">Opening contract</p>
                  {item.premise.worldKernel.openingContract.map(contract => (
                    <div key={contract.chapterNumber} className="rounded-md border p-3"><p className="font-medium">Chương {contract.chapterNumber} · {contract.namedLevelOrGrade}</p><p>{contract.proves}</p><p><strong>Kết quả:</strong> {contract.visibleResult}</p><p><strong>Phản ứng:</strong> {contract.witnessReaction}</p><p><strong>Hành động thương mại:</strong> {contract.commercialAction}</p></div>
                  ))}
                </div>
                <div className="rounded-md bg-muted p-3 font-mono text-xs">
                  npm run serial:operator -- seed --premise={item.sourcePath}
                </div>
                <p className="text-xs text-muted-foreground">
                  Lệnh trên chỉ dry-run. Thêm <code>--apply</code> khi đã chọn premise để tạo bản ghi chờ duyệt;
                  seed không tự gọi model.
                </p>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </CardContent>
    </Card>

    {error && <Card><CardContent className="pt-6"><p className="text-sm text-red-600">{error}</p></CardContent></Card>}
    {loading && <p className="text-sm text-muted-foreground">Đang tải…</p>}
    {!loading && jobs.length === 0 && (
      <Card><CardContent className="pt-6"><p className="text-sm">Chưa có bộ nào. Tạo bằng <code>npm run serial:operator -- seed</code>.</p></CardContent></Card>
    )}

    <div className="grid gap-4">
      {jobs.map(job => {
        const novel = one(job.novels);
        const serial = one(job.serial_novels);
        const premiseApproved = Boolean(serial?.approved_at);
        const openingApproved = Boolean(serial?.opening_reviewed_at);
        return <Card key={job.id}>
          <CardHeader>
            <CardTitle className="text-base">
              {novel?.title ?? job.id}
              {novel?.hidden && <span className="ml-2 text-xs font-normal text-muted-foreground">(đang ẩn)</span>}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="grid gap-1 md:grid-cols-4">
              <p>Trạng thái: {job.status}</p>
              <p>Giai đoạn: {job.stage}</p>
              <p>Chương: {job.current_chapter} (công khai {novel?.chapter_count ?? 0})</p>
              <p>Hôm nay: {job.chapters_today}/{job.daily_target}</p>
              <p>Chi phí 10 chương: ${job.last10Usd}</p>
              <p>Lần lập lại kế hoạch liên tiếp: {job.consecutive_replans}</p>
              <p>Premise: {premiseApproved ? 'đã duyệt' : 'chưa duyệt'}</p>
              <p>Mở đầu: {openingApproved ? 'đã duyệt' : job.status === 'opening_review' ? 'đang chờ đọc' : 'chưa tới cổng'}</p>
            </div>
            {job.last_error && <p className="text-red-600">{job.last_error}</p>}
            {job.status === 'opening_review' && (
              <div className="rounded-md border p-3">
                <p className="mb-2 font-medium">Bốn chương vàng — bản nháp, chưa công khai</p>
                <p className="mb-2 text-emerald-700">
                  Kiểm tra xuyên 4 chương: {job.openingAudit?.passed ? `đạt — ${job.openingAudit.summary ?? ''}` : 'chưa có kết quả đạt'}
                </p>
                <Accordion type="single" collapsible>
                  {job.openingChapters.map(chapter => (
                    <AccordionItem key={chapter.chapter_number} value={`chapter-${chapter.chapter_number}`}>
                      <AccordionTrigger>
                        Chương {chapter.chapter_number}: {chapter.title}
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="whitespace-pre-wrap leading-7">{chapter.content}</div>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
                {job.openingChapters.length !== 4 && (
                  <p className="mt-2 text-red-600">Thiếu bản nháp: đang có {job.openingChapters.length}/4 chương.</p>
                )}
              </div>
            )}
            <div className="flex gap-2">
              {job.status === 'awaiting_approval' && (
                <Button size="sm" onClick={() => act('approve', job.id)}>Duyệt premise để viết</Button>
              )}
              {job.status === 'opening_review' && job.openingChapters.length === 4 && (
                <>
                  <Button size="sm" onClick={() => act('approve', job.id)}>Duyệt 4 chương để chạy tiếp</Button>
                  <Button size="sm" variant="destructive" onClick={() => act('restart_opening', job.id)}>Bác và viết lại opening</Button>
                </>
              )}
              {novel?.hidden && openingApproved && (novel.chapter_count ?? 0) > 0 && (
                <Button size="sm" variant="secondary" onClick={() => act('release', job.id)}>Công khai truyện</Button>
              )}
              {job.status === 'paused'
                ? <Button size="sm" variant="outline" onClick={() => act('resume', job.id)}>Chạy tiếp</Button>
                : !['awaiting_approval', 'opening_review'].includes(job.status)
                  && <Button size="sm" variant="outline" onClick={() => act('pause', job.id)}>Tạm dừng</Button>}
            </div>
          </CardContent>
        </Card>;
      })}
    </div>
  </div>;
}
