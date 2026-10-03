-- Rows written before the postgres.js serializer fix hold their JSON as a
-- JSON string ("{\"levels\":...}") instead of an object. Unwrap them.
-- None of these columns ever stores a bare string, so this is safe to rerun.

update public.materials set supports = (supports #>> '{}')::jsonb where jsonb_typeof(supports) = 'string';
update public.materials set pii_report = (pii_report #>> '{}')::jsonb where jsonb_typeof(pii_report) = 'string';
update public.materials set tldr = (tldr #>> '{}')::jsonb where jsonb_typeof(tldr) = 'string';
update public.materials set word_preview = (word_preview #>> '{}')::jsonb where jsonb_typeof(word_preview) = 'string';
update public.materials set assignment_steps = (assignment_steps #>> '{}')::jsonb where jsonb_typeof(assignment_steps) = 'string';
update public.materials set image_descriptions = (image_descriptions #>> '{}')::jsonb where jsonb_typeof(image_descriptions) = 'string';

update public.sections set original = (original #>> '{}')::jsonb where jsonb_typeof(original) = 'string';
update public.sections set levels = (levels #>> '{}')::jsonb where jsonb_typeof(levels) = 'string';
update public.sections set quick_checks = (quick_checks #>> '{}')::jsonb where jsonb_typeof(quick_checks) = 'string';
update public.sections set fact_guard = (fact_guard #>> '{}')::jsonb where jsonb_typeof(fact_guard) = 'string';
update public.sections set readability = (readability #>> '{}')::jsonb where jsonb_typeof(readability) = 'string';
