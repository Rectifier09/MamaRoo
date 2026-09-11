-- ============================================================================
-- PLACEHOLDER CONTENT. NOT MEDICAL CONTENT. NEVER SHIP THIS FILE.
-- Exists only so tests and local development have rows to read. Every row is
-- replaced by the product owner's reviewed corpus in Session 19 and Session 29.
-- ============================================================================

insert into public.content_items (slug, locale, kind, title, summary, body_md, week_min, week_max, is_published)
values
  ('placeholder-rest', 'en', 'article', 'Placeholder: resting well',
   'Placeholder summary. Not medical content.',
   '## Placeholder\n\nThis text is a placeholder and carries no medical meaning.', 1, 42, true),
  ('placeholder-food', 'en', 'article', 'Placeholder: eating well',
   'Placeholder summary. Not medical content.',
   '## Placeholder\n\nThis text is a placeholder and carries no medical meaning.', 1, 42, true);

insert into public.content_passages (content_item_id, locale, heading, body)
select id, 'en', 'Placeholder heading',
       'Placeholder passage body used only to exercise retrieval in tests.'
from public.content_items where slug like 'placeholder-%';

insert into public.symptom_rules (locale, match_terms, severity, guidance_title, guidance_body, priority)
values
  ('en', array['placeholder-general-term'], 'general',
   'Placeholder general guidance', 'Placeholder body. Not medical content.', 10),
  ('en', array['placeholder-clinic-term'], 'contact_clinic',
   'Placeholder clinic guidance', 'Placeholder body. Not medical content.', 50),
  ('en', array['placeholder-urgent-term'], 'urgent',
   'Placeholder urgent guidance', 'Placeholder body. Not medical content.', 90);

insert into public.suggested_questions (locale, week_min, week_max, body)
values ('en', 1, 42, 'Placeholder question. Not medical content.');

insert into public.checklist_items (locale, category, body, sort_order)
values
  ('en', 'hospital_bag', 'Placeholder item one', 1),
  ('en', 'documents', 'Placeholder item two', 2);
