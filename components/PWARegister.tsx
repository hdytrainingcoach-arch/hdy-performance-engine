'use client';

import { useEffect, useState } from 'react';

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
};

declare global { interface Navigator { standalone?: boolean } }

export default function PWARegister() {
  const [installEvent,setInstallEvent]=useState<BeforeInstallPromptEvent|null>(null);
  const [showIOSHelp,setShowIOSHelp]=useState(false);
  const [visible,setVisible]=useState(false);
  const [mode,setMode]=useState<'diambars'|'hdy'|null>(null);

  useEffect(()=>{
    const path=window.location.pathname;
    const nextMode=path.startsWith('/diambars')?'diambars':path.startsWith('/hdy')?'hdy':null;
    setMode(nextMode);

    // Installation is deliberately exposed only from the two branded entry pages.
    if(!nextMode)return;

    if('serviceWorker' in navigator){navigator.serviceWorker.register('/sw.js',{scope:'/'}).catch(()=>undefined)}

    const standalone=window.matchMedia('(display-mode: standalone)').matches||navigator.standalone===true;
    if(standalone){
      // If iOS kept the entry URL when the shortcut was created, jump to the real app workspace.
      if(nextMode==='diambars' && path==='/diambars') window.location.replace('/admin/sport?app=diambars');
      if(nextMode==='hdy' && path==='/hdy') window.location.replace('/admin?app=hdy');
      return;
    }

    const isIOS=/iphone|ipad|ipod/i.test(navigator.userAgent);
    if(isIOS)setVisible(true);

    const onBeforeInstall=(event:Event)=>{
      event.preventDefault();
      setInstallEvent(event as BeforeInstallPromptEvent);
      setVisible(true);
    };
    const onInstalled=()=>{setVisible(false);setInstallEvent(null);setShowIOSHelp(false)};
    window.addEventListener('beforeinstallprompt',onBeforeInstall);
    window.addEventListener('appinstalled',onInstalled);
    return()=>{
      window.removeEventListener('beforeinstallprompt',onBeforeInstall);
      window.removeEventListener('appinstalled',onInstalled);
    };
  },[]);

  async function install(){
    if(installEvent){
      await installEvent.prompt();
      await installEvent.userChoice.catch(()=>undefined);
      setInstallEvent(null);
      setVisible(false);
      return;
    }
    setShowIOSHelp(true);
  }

  if(!mode||(!visible&&!showIOSHelp))return null;
  const club=mode==='diambars';
  const label=club?'Installer Diambars':'Installer HDY';

  return <>
    {visible&&<button type='button' onClick={install} aria-label={label} style={{position:'fixed',right:16,bottom:18,zIndex:9999,border:'1px solid #3F3F46',borderRadius:999,background:club?'#D71920':'#111113',color:'#fff',padding:'11px 15px',fontWeight:900,boxShadow:'0 10px 30px rgba(0,0,0,.35)',cursor:'pointer'}}>{label}</button>}
    {showIOSHelp&&<div role='dialog' aria-modal='true' style={{position:'fixed',inset:0,zIndex:10000,background:'rgba(0,0,0,.72)',display:'grid',placeItems:'end center',padding:16}} onClick={()=>setShowIOSHelp(false)}>
      <div onClick={e=>e.stopPropagation()} style={{width:'100%',maxWidth:460,background:'#111113',color:'#fff',border:'1px solid #2B2B31',borderRadius:20,padding:20}}>
        <strong style={{display:'block',fontSize:20,marginBottom:8}}>{club?'Installer Diambars FC':'Installer HDY Performance'}</strong>
        <p style={{color:'#A1A1AA',lineHeight:1.5,marginTop:0}}>Dans Safari, appuie sur <b style={{color:'#fff'}}>Partager</b>, puis sur <b style={{color:'#fff'}}>Sur l’écran d’accueil</b> et confirme avec <b style={{color:'#fff'}}>Ajouter</b>.</p>
        <p style={{color:'#71717A',lineHeight:1.45,fontSize:12}}>Après installation, l’icône ouvrira directement {club?'l’espace Sport & Performance Diambars':'le portail administrateur HDY'}.</p>
        <button type='button' onClick={()=>setShowIOSHelp(false)} style={{width:'100%',height:46,border:0,borderRadius:12,background:club?'#D71920':'#18181B',color:'#fff',fontWeight:900}}>Compris</button>
      </div>
    </div>}
  </>;
}
