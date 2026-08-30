import {
  deliverStoryFactoryOperatorAlerts,
  enqueueStoryFactoryOperatorAlert,
  notifyStoryFactoryOperator,
} from '@/services/story-factory/alerts';

const alert = {
  kind: 'terminal_block' as const,
  idempotencyKey: 'story-factory-terminal-run_1-plan_blocked',
  title: 'job bị chặn',
  message: 'Chapter 51 repeats the previous payoff.',
  jobId: 'job_1',
  runId: 'run_1',
  stage: 'plan',
  chapterNumber: 50,
  errorCode: 'plan_blocked',
};

describe('Story Factory operator alerts', () => {
  test('does not attempt delivery until all server-side email settings exist', async () => {
    let called = false;
    const warn = jest.spyOn(console, 'warn').mockImplementation();
    try {
      const result = await notifyStoryFactoryOperator(alert, {
        env: {} as NodeJS.ProcessEnv,
        fetchImpl: (async () => {
          called = true;
          return new Response(null, { status: 202 });
        }) as typeof fetch,
      });
      expect(result).toEqual({ status: 'disabled' });
      expect(called).toBe(false);
      expect(warn).toHaveBeenCalledWith(expect.stringContaining('operator alert disabled'));
    } finally {
      warn.mockRestore();
    }
  });

  test('sends one bounded, idempotent alert without exposing the API key in the payload', async () => {
    let capturedUrl = '';
    let capturedInit: RequestInit | undefined;
    const result = await notifyStoryFactoryOperator(alert, {
      env: {
        RESEND_API_KEY: 're_test_key',
        STORY_FACTORY_ALERT_FROM: 'TruyenCity <alerts@example.com>',
        STORY_FACTORY_ALERT_EMAIL: 'owner@example.com, second@example.com',
        NEXT_PUBLIC_SITE_URL: 'https://truyencity.example/',
      } as unknown as NodeJS.ProcessEnv,
      fetchImpl: (async (url, init) => {
        capturedUrl = String(url);
        capturedInit = init;
        return new Response(JSON.stringify({ id: 'email_1' }), { status: 202 });
      }) as typeof fetch,
    });
    expect(result).toEqual({ status: 'sent' });
    expect(capturedUrl).toBe('https://api.resend.com/emails');
    expect(capturedInit?.method).toBe('POST');
    expect(capturedInit?.headers).toMatchObject({
      Authorization: 'Bearer re_test_key',
      'Idempotency-Key': alert.idempotencyKey,
    });
    const body = JSON.parse(String(capturedInit?.body));
    expect(body).toMatchObject({
      from: 'TruyenCity <alerts@example.com>',
      to: ['owner@example.com', 'second@example.com'],
      subject: '[TruyenCity] Cần can thiệp: job bị chặn · Ch50',
    });
    expect(body.text).toContain('https://truyencity.example/admin');
    expect(JSON.stringify(body)).not.toContain('re_test_key');
  });

  test('delivers a queued alert once and marks the outbox row sent', async () => {
    const row = {
      id: 'alert_1',
      dedupe_key: alert.idempotencyKey,
      event_kind: alert.kind,
      title: alert.title,
      message: alert.message,
      job_id: alert.jobId,
      run_id: alert.runId,
      stage: alert.stage,
      chapter_number: alert.chapterNumber,
      error_code: alert.errorCode,
      attempt_count: 0,
    };
    const pendingQuery = {
      select: jest.fn(), eq: jest.fn(), lte: jest.fn(), lt: jest.fn(), order: jest.fn(), limit: jest.fn(),
    };
    pendingQuery.select.mockReturnValue(pendingQuery);
    pendingQuery.eq.mockReturnValue(pendingQuery);
    pendingQuery.lte.mockReturnValue(pendingQuery);
    pendingQuery.lt.mockReturnValue(pendingQuery);
    pendingQuery.order.mockReturnValue(pendingQuery);
    pendingQuery.limit.mockResolvedValue({ data: [row], error: null });
    const secondEq = jest.fn().mockResolvedValue({ error: null });
    const firstEq = jest.fn().mockReturnValue({ eq: secondEq });
    const update = jest.fn().mockReturnValue({ eq: firstEq });
    const db = {
      from: jest.fn()
        .mockReturnValueOnce(pendingQuery)
        .mockReturnValueOnce({ update }),
    };

    const result = await deliverStoryFactoryOperatorAlerts(db as never, {
      now: new Date('2026-08-30T01:00:00.000Z'),
      env: {
        RESEND_API_KEY: 're_test_key',
        STORY_FACTORY_ALERT_FROM: 'TruyenCity <alerts@example.com>',
        STORY_FACTORY_ALERT_EMAIL: 'owner@example.com',
      } as unknown as NodeJS.ProcessEnv,
      fetchImpl: (async () => new Response(null, { status: 202 })) as typeof fetch,
    });

    expect(result).toEqual({ delivered: 1, pending: 0, disabled: false });
    expect(update).toHaveBeenCalledWith(expect.objectContaining({
      status: 'sent', attempt_count: 1, sent_at: '2026-08-30T01:00:00.000Z',
    }));
    expect(firstEq).toHaveBeenCalledWith('id', 'alert_1');
    expect(secondEq).toHaveBeenCalledWith('status', 'pending');
  });

  test('never lets a broken alert outbox alter the writing verdict', async () => {
    const error = jest.spyOn(console, 'error').mockImplementation();
    try {
      await expect(enqueueStoryFactoryOperatorAlert({
        from: () => {
          throw new Error('database unavailable');
        },
      } as never, alert)).resolves.toBeUndefined();
      expect(error).toHaveBeenCalledWith(
        '[story-factory] could not queue operator alert:',
        'database unavailable',
      );
    } finally {
      error.mockRestore();
    }
  });
});
