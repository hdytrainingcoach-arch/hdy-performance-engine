'use client';

import { useEffect, useState } from 'react';

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
};

declare global { interface Navigator { standalone?: boolean } }
type Mode='diambars'|'hdy'|'elite'|null;

export default function PWARegister() {
  const [installEvent,setInstallEvent]=useState<BeforeInstallPromptEvent|null>(null);
  const [showIOSHelp,setShowIOSHelp]=useState(false);
  const [visible,setVisible]=useState(false);
  const [mode,setMode]=useState<Mode>(null);

  useEffect(()=>{
    const path=window.location.pathname;
    const nextMode:Mode=path.startsWith('/diambars')?'diambars':path.startsWith('/elite')?'elite':path.startsWith('/hdy')?'hdy':null;
    setMode(nextMode);
    if(!nextMode)return;

    const isIOS=/iphone|ipad|ipod/i.test(navigator.userAgent);

    if(isIOS){
      if('serviceWorker' in navigator){
        navigator.serviceWorker.getRegistrations().then(regs=>Promise.all(regs.map(reg=>reg.unregister()))).catch(()=>undefined);
      }
      if('caches' in window){
        caches.keys().then(keys=>Promise.all(keys.map(key=>caches.delete(key)))).catch(()=>undefined);
      }
    }else if('serviceWorker' in navigator){
      navigator.serviceWorker.register('/sw.js',{scope:'/'}).catch(()=>undefined);
    }

    const standalone=window.matchMedia('(display-mode: standalone)').matches||navigator.standalone===true;
    if(standalone){
      if(nextMode==='diambars'&&path==='/diambars')window.location.replace('/admin/sport?app=diambars');
      if(nextMode==='hdy'&&path==='/hdy')window.location.replace('/admin?app=hdy');
      if(nextMode==='elite'&&path==='/elite')window.location.replace('/?app=elite');
      return;
    }

    const onBeforeInstall=(event:Event)=>{
      event.preventDefault();
      setInstallEvent(event as BeforeInstallPromptEvent);
      if(!isIOS)setVisible(true);
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
  const elite=mode==='elite';
  const label=club?'Installer Diambars':elite?'Installer HDY Elite':'Installer HDY';
  const dialogTitle=club?'Installer Diambars FC':elite?'Installer HDY Elite':'Installer HDY Performance';
  const destination=club?'l’espace Sport & Performance Diambars':elite?'ton espace joueur HDY Elite':'le portail administrateur HDY';

  return <>
    {visible&&<button type='button' onClick={install} aria-label={label} style={{position:'fixed',right:16,bottom:'max(18px,env(safe-area-inset-bottom))',zIndex:9999,border:'1px solid #3F3F46',borderRadius:999,background:club?'#D71920':elite?'#09090B':'#111113',color:'#fff',padding:'11px 15px',fontWeight:900,boxShadow:'0 10px 30px rgba(0,0,0,.35)',cursor:'pointer'}}>{label}</button>}
    {showIOSHelp&&<div role='dialog' aria-modal='true' style={{position:'fixed',inset:0,zIndex:10000,background:'rgba(0,0,0,.72)',display:'grid',placeItems:'end center',padding:16}} onClick={()=>setShowIOSHelp(false)}>
      <div onClick={e=>e.stopPropagation()} style={{width:'100%',maxWidth:460,background:'#111113',color:'#fff',border:'1px solid #2B2B31',borderRadius:20,padding:20}}>
        <strong style={{display:'block',fontSize:20,marginBottom:8}}>{dialogTitle}</strong>
        <p style={{color:'#A1A1AA',lineHeight:1.5,marginTop:0}}>Dans Safari, appuie sur <b style={{color:'#fff'}}>Partager</b>, puis sur <b style={{color:'#fff'}}>Sur l’écran d’accueil</b> et confirme avec <b style={{color:'#fff'}}>Ajouter</b>.</p>
        <p style={{color:'#71717A',lineHeight:1.45,fontSize:12}}>Après installation, l’icône ouvrira directement {destination}.</p>
        <button type='button' onClick={()=>setShowIOSHelp(false)} style={{width:'100%',height:46,border:0,borderRadius:12,background:club?'#D71920':'#F4F4F5',color:club?'#fff':'#09090B',fontWeight:900}}>Compris</button>
      </div>
    </div>}
  </>;
}
