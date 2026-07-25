CREATE INDEX IF NOT EXISTS story_factory_jobs_benchmark_run_idx
  ON public.story_factory_jobs(benchmark_run_id)
  WHERE benchmark_run_id IS NOT NULL;
