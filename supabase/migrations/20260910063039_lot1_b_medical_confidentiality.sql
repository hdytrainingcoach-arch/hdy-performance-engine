-- LOT 1 · B — Confidentialité médicale (audit S1, cahier des charges §4, CA-06)
--
-- player_documents.access_scope : 'staff' (défaut) | 'player' | 'medical'
--   staff   → tout le staff de l'org (lecture) / éditeurs (écriture)
--   player  → staff + le joueur concerné (lecture) / éditeurs (écriture)
--   medical → personnel médical uniquement (lecture ET écriture)

alter policy player_documents_read on public.player_documents
using (
  case coalesce(access_scope, 'staff')
    when 'player'  then (private.is_org_staff(organization_id) or private.can_access_player(player_id))
    when 'medical' then private.is_org_medical(organization_id)
    else private.is_org_staff(organization_id)
  end
);

alter policy player_documents_staff_write on public.player_documents
using (
  case when coalesce(access_scope, 'staff') = 'medical'
    then private.is_org_medical(organization_id)
    else private.is_org_editor(organization_id)
  end
)
with check (
  case when coalesce(access_scope, 'staff') = 'medical'
    then private.is_org_medical(organization_id)
    else private.is_org_editor(organization_id)
  end
);

-- ROLLBACK
-- alter policy player_documents_read on public.player_documents
--   using (private.is_org_staff(organization_id)
--          or (access_scope = 'player' and private.can_access_player(player_id)));
-- alter policy player_documents_staff_write on public.player_documents
--   using (private.is_org_staff(organization_id)) with check (private.is_org_staff(organization_id));
