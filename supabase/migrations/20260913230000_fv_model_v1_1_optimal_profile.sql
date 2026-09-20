-- HDY LAB — activation du profil Force-Vitesse optimal (Sfv_opt) validé.
--
-- v1 ne calculait que F0/V0/Sfv/Pmax (régression sur essais chargés) ; le
-- profil optimal et le %FVimbalance étaient explicitement en attente de
-- validation (lib/performance/fv/optimalProfile.ts renvoyait
-- 'pending_model_validation'). La formule de Sfv_opt (annexe [A12]-[A13]
-- de Samozino et al. 2012) a depuis été transcrite depuis le PDF de
-- l'article + annexe fourni, puis vérifiée numériquement contre l'exemple
-- chiffré des auteurs eux-mêmes (Fig. 4 : Pmax=25 W/kg, hPO=0.4 m →
-- Sfv_opt=-14.0 N·s·kg⁻¹·m⁻¹ ; notre calcul donne -14.02).
--
-- On n'écrase PAS le modèle v1 : les tests déjà enregistrés avec
-- model_version='Samozino_Morin_FV_v1' gardent leur valeur historique
-- (fv_imbalance_percent=null, deficit_type='unavailable' à l'époque), ce
-- qui est la donnée réelle de ce qui a été calculé pour eux. Seuls les
-- nouveaux tests utiliseront v1.1.
insert into public.fv_model_versions (model_name, model_version, formula_reference, active)
select 'Samozino-Morin Force-Velocity Profile (saut vertical, sauts chargés)', 'Samozino_Morin_FV_v1.1',
 'F0/V0/Sfv/Pmax inchangés par rapport à v1 (régression F=a·V+b, F=m·g·(1+h/d)). Ajout : Sfv_opt calculé selon Samozino P, Rejc E, Di Prampero PE, Belli A, Morin JB (2012), "Optimal Force-Velocity Profile in Ballistic Movements — Altius: Citius or Fortius?", Med Sci Sports Exerc 44(2):313-22, DOI 10.1249/MSS.0b013e31822d757a — annexe supplémentaire (Supplemental Digital Content 1b, équations [A12]-[A13]). Portée : push-off vertical (angle=90°, sin(angle)=1) uniquement — une généralisation au profil sprint (angle horizontal) demanderait de revérifier si g doit être remplacé par g·sin(angle) dans [A12]-[A13] (non fait, non supposé). Vérifié numériquement contre l''exemple chiffré des auteurs (Pmax=25 W/kg, hPO=0.4 m -> Sfv_opt=-14.0 N.s.kg-1.m-1 publié ; -14.02 calculé). FVimbalance = |1-Sfv_reel/Sfv_opt|x100, orientation Force/Balanced/Velocity selon les seuils configurables (par défaut 90-110%).',
 true
where not exists (select 1 from public.fv_model_versions where model_version='Samozino_Morin_FV_v1.1');
