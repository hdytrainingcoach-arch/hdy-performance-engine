DROP POLICY IF EXISTS hrv_records_insert_staff ON public.hrv_records;
CREATE POLICY hrv_records_insert_staff ON public.hrv_records
FOR INSERT
WITH CHECK (
  private.is_org_member(organization_id)
  AND EXISTS (
    SELECT 1 FROM public.players p
    WHERE p.id = hrv_records.player_id
      AND p.organization_id = hrv_records.organization_id
  )
);
