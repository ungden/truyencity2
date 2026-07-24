CREATE OR REPLACE FUNCTION public.promote_story_factory_canary(p_job_id uuid, p_engine_release text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  job public.story_factory_jobs;
  project_release text;
  cover text;
  latest_review_status text;
  latest_review_release text;
BEGIN
  SELECT * INTO job
  FROM public.story_factory_jobs
  WHERE id = p_job_id
  FOR UPDATE;

  IF job.id IS NULL OR job.execution_mode <> 'hidden_canary' OR job.current_chapter < 10 THEN
    RAISE EXCEPTION 'FACTORY_CANARY_NOT_READY';
  END IF;

  SELECT engine_release INTO project_release
  FROM public.ai_story_projects
  WHERE id = job.project_id;

  IF project_release IS DISTINCT FROM p_engine_release THEN
    RAISE EXCEPTION 'FACTORY_RELEASE_MISMATCH';
  END IF;

  SELECT status, engine_release
  INTO latest_review_status, latest_review_release
  FROM public.story_factory_runs
  WHERE job_id = p_job_id
    AND kind = 'window_review'
    AND chapter_number = 10
  ORDER BY finished_at DESC NULLS LAST, started_at DESC
  LIMIT 1;

  IF latest_review_status IS DISTINCT FROM 'passed'
    OR latest_review_release IS DISTINCT FROM p_engine_release
  THEN
    RAISE EXCEPTION 'FACTORY_LATEST_WINDOW_REVIEW_REQUIRED';
  END IF;

  SELECT cover_url INTO cover
  FROM public.novels
  WHERE id = job.novel_id;

  IF cover IS NULL OR length(trim(cover)) = 0 THEN
    RAISE EXCEPTION 'FACTORY_COVER_REQUIRED';
  END IF;

  UPDATE public.novels
  SET hidden = false,
      status = 'Đang ra',
      updated_at = now()
  WHERE id = job.novel_id;

  UPDATE public.story_factory_jobs
  SET execution_mode = 'production',
      updated_at = now()
  WHERE id = p_job_id;

  RETURN jsonb_build_object(
    'jobId', p_job_id,
    'executionMode', 'production',
    'visible', true,
    'reviewRelease', latest_review_release
  );
END $$;

REVOKE ALL ON FUNCTION public.promote_story_factory_canary(uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.promote_story_factory_canary(uuid, text) TO service_role;

DO $$
DECLARE
  target_project_id constant uuid := '07e86a9d-7aab-41d2-8eea-5c20294997b7';
  target_novel_id constant uuid := '207d7e88-1ee5-4943-9172-e64f34447bb6';
  chapter_seven_id uuid;
  chapter_nine_id uuid;
  chapter_seven_before text;
  chapter_seven_after text;
  chapter_nine_before text;
  chapter_nine_after text;
BEGIN
  SELECT id, content
  INTO chapter_seven_id, chapter_seven_before
  FROM public.chapters
  WHERE novel_id = target_novel_id
    AND chapter_number = 7
  FOR UPDATE;

  SELECT id, content
  INTO chapter_nine_id, chapter_nine_before
  FROM public.chapters
  WHERE novel_id = target_novel_id
    AND chapter_number = 9
  FOR UPDATE;

  -- Other environments may not contain this production canary.
  IF chapter_seven_id IS NULL AND chapter_nine_id IS NULL THEN
    RETURN;
  END IF;

  IF chapter_seven_id IS NULL OR chapter_nine_id IS NULL THEN
    RAISE EXCEPTION 'FACTORY_CANARY_CORRECTION_CHAPTER_MISSING';
  END IF;

  chapter_seven_after := replace(
    chapter_seven_before,
    $old$Lực trải tấm nilon mỏng ra nền đất, đặt bao tải dứa lên trên. Anh lấy từ trong sọt ra bịch mùn cưa khô đã được ép chặt mang từ nhà đi. Anh đổ một lớp mùn cưa dày xuống đáy bao tải dứa, nện thật chặt để tạo lớp cách nhiệt thụ động.$old$,
    $new$Lực trải tấm nilon mỏng ra nền đất rồi mở nắp chiếc thùng sọt đôi đã chằng sẵn trên gác-ba-ga. Lớp mùn cưa khô nén kín giữa hai vách tre vẫn nguyên vẹn; anh kiểm tra lỗ thoát nước ở đáy sọt trong, sau đó lót bao tải dứa sạch và lá chuối vào lòng thùng.$new$
  );
  chapter_seven_after := replace(
    chapter_seven_after,
    $old$Anh trải lá chuối tươi vào trong lõi bao, bắt đầu xếp cá. Động tác của người cựu binh chính xác và kỷ luật như đang sắp xếp đạn dược. Một lớp cá thu, anh lại rải một lớp đá vụn lấp đầy mọi khe hở. Hai mươi lăm ký cá đi đôi với hai mươi lăm ký đá, tỷ lệ chuẩn xác tuyệt đối. Khối lượng và thể tích được tận dụng đến mức tối đa.$old$,
    $new$Anh bắt đầu xếp cá vào lòng sọt nhỏ đã lót kín. Động tác của người cựu binh chính xác và kỷ luật như đang sắp xếp đạn dược. Một lớp cá thu, anh lại rải một lớp đá vụn lấp đầy mọi khe hở. Hai mươi lăm ký cá đi đôi với hai mươi lăm ký đá, tỷ lệ chuẩn xác tuyệt đối. Khối lượng và thể tích được tận dụng đến mức tối đa.$new$
  );
  chapter_seven_after := replace(
    chapter_seven_after,
    $old$Lớp trên cùng, anh phủ kín lá chuối rồi túm chặt miệng bao tải dứa lại, dùng dây nilon thít chặt. Cuối cùng, Lực trút toàn bộ số mùn cưa khô còn lại vào sọt tre, chèn kín xung quanh bao tải dứa. Lớp mùn cưa này sẽ tạo thành một bức tường cách nhiệt hoàn hảo, giữ cho cái lạnh của đá không bị rò rỉ ra ngoài và hơi nóng của đêm không thể xâm nhập vào trong.$old$,
    $new$Lớp trên cùng, anh phủ kín lá chuối, gập miệng bao tải dứa rồi đóng nắp sọt đôi và dùng dây nilon thít chặt. Bức tường mùn cưa nằm cố định giữa hai lớp vách tre giữ cho hơi lạnh khó thất thoát và hơi nóng bên ngoài chậm truyền vào trong.$new$
  );

  IF chapter_seven_after = chapter_seven_before THEN
    RAISE EXCEPTION 'FACTORY_CANARY_CHAPTER_7_SOURCE_MISMATCH';
  END IF;

  chapter_nine_after := replace(
    chapter_nine_before,
    $old$Dì Ba ngẩng đầu lên. Ánh mắt sành sỏi của người đàn bà nhiều năm lăn lộn chốn chợ búa lướt nhanh qua chiếc xe đạp cũ kỹ lấm lem bùn đất, cái sọt tre to tướng và bộ quần áo chấn thủ bết mồ hôi của Lực. Bà bĩu môi, xua tay liến thoắng:

"Thôi đi con trai. Cá thồ bằng xe đạp từ bến lên đây mất cả mấy tiếng đồng hồ. Gió máy nó thốc cho thịt bở tơi, bụng vỡ nhũn ra hết rồi. Dì không mua hàng ươn đâu! Chỗ dì mua bán phải giữ chữ tín, cá xáo xẩu khách người ta chửi cho vỡ mặt."$old$,
    $new$Dì Ba vừa ngẩng đầu đã nhận ra chiếc xe đạp cũ và cái thùng sọt đôi từng khiến bà đổi giọng mấy hôm trước. Bà chống tay lên hông, nhìn lớp bùn đất bám kín bánh xe rồi hỏi thẳng:

"Lại là chú em thùng mùn cưa đây mà. Mẻ trước hàng khá lắm, nhưng hôm nay chở nhiều hơn hẳn đấy. Đường xa thế này, cá còn giữ được như lần trước không? Dì mua bán phải giữ chữ tín, hàng xuống một chút là không nhận đâu."$new$
  );
  chapter_nine_after := replace(
    chapter_nine_after,
    $old$"Trời đất!" Dì Ba thốt lên, giọng lanh lảnh không giấu nổi vẻ ngạc nhiên. "Mắt trong vắt thế này. Mang đỏ au. Thịt chắc nịch! Nhìn y như vừa gỡ từ dưới lưới lên vậy. Đi từ biển lên đây mà sao cá giữ được nhiệt hay vậy con?"$old$,
    $new$"Được đấy!" Dì Ba thốt lên, giọng lanh lảnh. "Mẻ này còn tươi hơn lần trước. Mắt trong, mang đỏ, thịt chắc. Cái thùng của chú em chở thêm mười ký mà vẫn giữ nhiệt tử tế."$new$
  );
  chapter_nine_after := replace(
    chapter_nine_after,
    $old$Bà phủi tay, hất cằm về phía chiếc xe đạp: "Giá đó dì ưng. Nhưng nói thật với con, buôn bán nó cần cái đều đặn. Hôm nay hên con làm được cái thùng cách nhiệt này chở lên được mẻ cá ngon, rồi ngày mai, ngày mốt thì sao? Lỡ con ốm, lỡ xe hỏng giữa đường, dì lấy đâu ra cá giao cho mấy mối ruột? Dì không e ngại hàng con, dì e ngại cái phương tiện thô sơ này không duy trì được nguồn cung cho dì thôi."$old$,
    $new$Bà phủi tay, hất cằm về phía chiếc xe đạp: "Giá đó dì ưng. Hai chuyến đều giữ được hàng thì dì không nghi cái thùng nữa. Nhưng buôn bán cần đều đặn: ngày mai, ngày mốt thì sao? Lỡ con ốm, lỡ xe hỏng giữa đường, dì lấy đâu ra cá giao cho mấy mối ruột? Dì chỉ e cái phương tiện thô sơ này không duy trì được nguồn cung thôi."$new$
  );
  chapter_nine_after := replace(
    chapter_nine_after,
    'ở bến anh mua hai ngàn một ký',
    'ở bến anh mua hai ngàn hai một ký'
  );
  chapter_nine_after := replace(
    chapter_nine_after,
    'Công việc đầu tiên đã hoàn thành tốt đẹp.',
    'Mối hàng ổn định đầu tiên đã được chốt.'
  );

  IF chapter_nine_after = chapter_nine_before THEN
    RAISE EXCEPTION 'FACTORY_CANARY_CHAPTER_9_SOURCE_MISMATCH';
  END IF;

  UPDATE public.chapters
  SET content = chapter_seven_after,
      updated_at = now()
  WHERE id = chapter_seven_id
    AND content = chapter_seven_before;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'FACTORY_CANARY_CHAPTER_7_CONCURRENT_EDIT';
  END IF;

  UPDATE public.chapters
  SET content = chapter_nine_after,
      updated_at = now()
  WHERE id = chapter_nine_id
    AND content = chapter_nine_before;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'FACTORY_CANARY_CHAPTER_9_CONCURRENT_EDIT';
  END IF;

  INSERT INTO public.story_state_events(
    project_id, chapter_number, delta_id, kind, entity_id, before_value, after_value, source
  )
  VALUES
    (
      target_project_id,
      7,
      'editorial_correction_20260724_ch7_artifact',
      'editorial_correction',
      chapter_seven_id::text,
      jsonb_build_object('contentMd5', md5(chapter_seven_before)),
      jsonb_build_object('contentMd5', md5(chapter_seven_after), 'canonChanged', false),
      'continuity_audit_20260724'
    ),
    (
      target_project_id,
      9,
      'editorial_correction_20260724_ch9_memory_ledger',
      'editorial_correction',
      chapter_nine_id::text,
      jsonb_build_object('contentMd5', md5(chapter_nine_before)),
      jsonb_build_object('contentMd5', md5(chapter_nine_after), 'canonChanged', false),
      'continuity_audit_20260724'
    )
  ON CONFLICT (project_id, chapter_number, delta_id) DO NOTHING;

  UPDATE public.novels
  SET updated_at = now()
  WHERE id = target_novel_id;
END $$;
