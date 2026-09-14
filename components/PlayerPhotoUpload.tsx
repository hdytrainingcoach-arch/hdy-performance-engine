'use client';

import { useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';

const MAX_BYTES = 5 * 1024 * 1024;
const TEN_YEARS_S = 60 * 60 * 24 * 365 * 10;

/**
 * Upload de la photo d'un joueur — stockage privé (mineurs dans l'effectif :
 * jamais de bucket public). L'URL enregistrée dans players.photo_url est une
 * URL signée longue durée ; personne d'autre que le staff habilité à voir ce
 * joueur ne peut générer une URL équivalente (policy storage.objects).
 */
export default function PlayerPhotoUpload({
  organizationId,
  playerId,
  currentUrl,
  onUploaded,
}: {
  organizationId: string;
  playerId: string;
  currentUrl?: string | null;
  onUploaded: (url: string) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [preview, setPreview] = useState<string | null>(currentUrl ?? null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    setMsg('');
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setMsg('Formats acceptés : JPEG, PNG, WEBP.');
      return;
    }
    if (file.size > MAX_BYTES) {
      setMsg('Fichier trop lourd (5 Mo max).');
      return;
    }
    setBusy(true);
    const ext = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg';
    const path = `${organizationId}/${playerId}/photo.${ext}`;
    const { error: upErr } = await supabase.storage.from('player-photos').upload(path, file, { upsert: true, contentType: file.type });
    if (upErr) {
      setBusy(false);
      setMsg(`Envoi échoué : ${upErr.message}`);
      return;
    }
    const { data: signed, error: signErr } = await supabase.storage.from('player-photos').createSignedUrl(path, TEN_YEARS_S);
    setBusy(false);
    if (signErr || !signed?.signedUrl) {
      setMsg(`Photo envoyée mais lien indisponible : ${signErr?.message || ''}`);
      return;
    }
    setPreview(signed.signedUrl);
    onUploaded(signed.signedUrl);
    setMsg('Photo enregistrée ✓');
  }

  return (
    <div style={S.wrap}>
      <div style={S.avatar} onClick={() => inputRef.current?.click()}>
        {preview ? <img src={preview} alt="" style={S.img} /> : <span style={S.placeholder}>Photo</span>}
        <span style={S.overlay}>{busy ? '…' : 'Changer'}</span>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        style={{ display: 'none' }}
        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
      />
      {msg && <small style={S.msg}>{msg}</small>}
    </div>
  );
}

const S: Record<string, React.CSSProperties> = {
  wrap: { display: 'grid', gap: 6, justifyItems: 'center' },
  avatar: { position: 'relative', width: 96, height: 96, borderRadius: 16, overflow: 'hidden', background: '#1B1B1F', border: '1px solid #34343A', cursor: 'pointer', display: 'grid', placeItems: 'center' },
  img: { width: '100%', height: '100%', objectFit: 'cover', display: 'block' },
  placeholder: { color: '#71717A', fontSize: 12, fontWeight: 800 },
  overlay: { position: 'absolute', inset: 'auto 0 0 0', background: 'rgba(0,0,0,.72)', color: '#fff', fontSize: 10, fontWeight: 800, textAlign: 'center', padding: '4px 0' },
  msg: { fontSize: 11, color: '#A1A1AA', textAlign: 'center', maxWidth: 160 },
};
