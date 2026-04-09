-- Atomic submission insert: wraps submission + answers + proctoring + snapshots
-- in a single transaction so partial writes are impossible.
--
-- Call via: supabase.rpc('create_submission_atomic', { p_candidate_id, p_submission, p_answers, p_proctoring, p_snapshots })
-- Returns: the new submission UUID as JSON { id: "..." }

CREATE OR REPLACE FUNCTION create_submission_atomic(
  p_candidate_id  UUID,
  p_submission    JSONB,   -- submission row (all scalar columns, no id / candidate_id)
  p_answers       JSONB,   -- array of answer rows (no submission_id)
  p_proctoring    JSONB,   -- proctoring row (no submission_id)
  p_snapshots     JSONB    -- array of snapshot rows (no submission_id)
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_submission_id UUID;
  v_answer        JSONB;
  v_snapshot      JSONB;
BEGIN

  -- ── 1. Insert submission ──────────────────────────────────────────────────
  INSERT INTO submissions (
    candidate_id,
    config_id,
    clerk_user_id,
    status,
    completed_at,
    video_storage_path,
    video_mime_type,
    video_recorded,
    roleplay_completed,
    roleplay_video_path,
    roleplay_transcript,
    enabled_sections,
    challenge_weights,
    math_score_raw,
    math_score_total,
    math_score_pct,
    math_time_secs,
    caso_answered_count,
    caso_score_pct,
    overall_score_pct
  )
  VALUES (
    p_candidate_id,
    (p_submission->>'config_id')::UUID,
    p_submission->>'clerk_user_id',
    COALESCE(p_submission->>'status', 'completed'),
    COALESCE((p_submission->>'completed_at')::TIMESTAMPTZ, NOW()),
    p_submission->>'video_storage_path',
    p_submission->>'video_mime_type',
    COALESCE((p_submission->>'video_recorded')::BOOLEAN, FALSE),
    COALESCE((p_submission->>'roleplay_completed')::BOOLEAN, FALSE),
    p_submission->>'roleplay_video_path',
    p_submission->>'roleplay_transcript',
    CASE
      WHEN p_submission->'enabled_sections' IS NOT NULL
      THEN ARRAY(SELECT jsonb_array_elements_text(p_submission->'enabled_sections'))
      ELSE ARRAY['sharktank','caso','math']
    END,
    p_submission->'challenge_weights',
    COALESCE((p_submission->>'math_score_raw')::NUMERIC, 0),
    COALESCE((p_submission->>'math_score_total')::NUMERIC, 0),
    COALESCE((p_submission->>'math_score_pct')::NUMERIC, 0),
    (p_submission->>'math_time_secs')::NUMERIC,
    COALESCE((p_submission->>'caso_answered_count')::INT, 0),
    COALESCE((p_submission->>'caso_score_pct')::NUMERIC, 0),
    COALESCE((p_submission->>'overall_score_pct')::NUMERIC, 0)
  )
  RETURNING id INTO v_submission_id;

  -- ── 2. Insert answers ─────────────────────────────────────────────────────
  FOR v_answer IN SELECT * FROM jsonb_array_elements(COALESCE(p_answers, '[]'::JSONB))
  LOOP
    INSERT INTO answers (
      submission_id,
      question_id,
      section,
      answer_text,
      time_spent_s,
      is_correct,
      points_awarded
    ) VALUES (
      v_submission_id,
      (v_answer->>'question_id')::UUID,
      v_answer->>'section',
      COALESCE(v_answer->>'answer_text', ''),
      COALESCE((v_answer->>'time_spent_s')::NUMERIC, 0),
      (v_answer->>'is_correct')::BOOLEAN,
      COALESCE((v_answer->>'points_awarded')::NUMERIC, 0)
    );
  END LOOP;

  -- ── 3. Insert proctoring report ───────────────────────────────────────────
  INSERT INTO proctoring_reports (
    submission_id,
    tab_out_count,
    tab_time_s,
    paste_attempts,
    copy_attempts,
    fs_exit_count,
    rclick_count,
    key_block_count,
    honeypot_fails,
    warning_count,
    fraud_score,
    fraud_level,
    events
  ) VALUES (
    v_submission_id,
    COALESCE((p_proctoring->>'tab_out_count')::INT, 0),
    COALESCE((p_proctoring->>'tab_time_s')::NUMERIC, 0),
    COALESCE((p_proctoring->>'paste_attempts')::INT, 0),
    COALESCE((p_proctoring->>'copy_attempts')::INT, 0),
    COALESCE((p_proctoring->>'fs_exit_count')::INT, 0),
    COALESCE((p_proctoring->>'rclick_count')::INT, 0),
    COALESCE((p_proctoring->>'key_block_count')::INT, 0),
    COALESCE((p_proctoring->>'honeypot_fails')::INT, 0),
    COALESCE((p_proctoring->>'warning_count')::INT, 0),
    COALESCE((p_proctoring->>'fraud_score')::NUMERIC, 0),
    COALESCE(p_proctoring->>'fraud_level', 'Confiable'),
    COALESCE(p_proctoring->'events', '[]'::JSONB)
  );

  -- ── 4. Insert snapshots ───────────────────────────────────────────────────
  FOR v_snapshot IN SELECT * FROM jsonb_array_elements(COALESCE(p_snapshots, '[]'::JSONB))
  LOOP
    INSERT INTO webcam_snapshots (
      submission_id,
      storage_path,
      taken_at,
      snap_index
    ) VALUES (
      v_submission_id,
      v_snapshot->>'storage_path',
      COALESCE((v_snapshot->>'taken_at')::TIMESTAMPTZ, NOW()),
      COALESCE((v_snapshot->>'snap_index')::INT, 0)
    );
  END LOOP;

  RETURN jsonb_build_object('id', v_submission_id);
END;
$$;
