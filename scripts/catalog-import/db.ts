import type { DbService } from '../../shared/catalog/verify.ts'

/** Reads every imported catalog service (with its add-ons and published form) for verification. */
export async function fetchDbServices(run: (text: string) => Promise<Record<string, unknown>[]>): Promise<DbService[]> {
  const rows = await run(`
    select s.id, s.slug, s.source_ref, s.status, s.title, s.short_description, s.delivery_estimate,
           s.base_price_minor::float8 as base_price_minor, s.launch_price_minor::float8 as launch_price_minor,
           s.launch_eligible, s.translation_status, s.published_form_version_id,
           c.slug as category_slug, p.slug as parent_slug,
           (select jsonb_build_object('id', v.id, 'status', v.status, 'fields', v.fields)
              from public.service_form_versions v where v.id = s.published_form_version_id) as published_form,
           coalesce((select jsonb_agg(jsonb_build_object('kind', a.kind, 'price_minor', a.price_minor, 'launch_price_minor', a.launch_price_minor, 'is_active', a.is_active, 'title', a.title))
                       from public.service_addons a where a.service_id = s.id), '[]'::jsonb) as addons,
           coalesce((select jsonb_agg(sec.key) from public.service_sections sec where sec.service_id = s.id), '[]'::jsonb) as section_keys
    from public.services s
    join public.service_categories c on c.id = s.primary_category_id
    left join public.service_categories p on p.id = c.parent_id
    where s.source_ref is not null
    order by s.source_ref`)
  return rows.map(r => ({
    ...(r as unknown as DbService),
    base_price_minor: Number(r.base_price_minor),
    launch_price_minor: r.launch_price_minor === null ? null : Number(r.launch_price_minor),
  }))
}
