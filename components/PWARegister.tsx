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
  const [clubMode,setClubMode]=useState(false);
  const [adminMode,setAdminMode]=useState(false);

  useEffect(()=>{
    const path=window.location.pathname;
    const diambars=path.startsWith('/diambars');
    const admin=path.startsWith('/admin');
    setClubMode(diambars);
    setAdminMode(admin);

    const manifest=document.querySelector<HTMLLinkElement>('link[rel="manifest"]');
    if(manifest) manifest.href=diambars?'/diambars.webmanifest':'/manifest.webmanifest';
    if(diambars){
      const theme=document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
      if(theme) theme.content='#D71920';
    }

    if('serviceWorker' in navigator){navigator.serviceWorker.register('/sw.js',{scope:'/'}).catch(()=>undefined)}
    const standalone=window.matchMedia('(display-mode: standalone)').matches||navigator.standalone===true;
    if(standalone)return;

    const isIOS=/iphone|ipad|ipod/i.test(navigator.userAgent);
    if(isIOS&&!admin)setVisible(true);

    const onBeforeInstall=(event:Event)=>{event.preventDefault();setInstallEvent(event as BeforeInstallPromptEvent);if(!admin)setVisible(true)};
    const onInstalled=()=>{setVisible(false);setInstallEvent(null);setShowIOSHelp(false)};
    window.addEventListener('beforeinstallprompt',onBeforeInstall);
    window.addEventListener('appinstalled',onInstalled);
    return()=>{window.removeEventListener('beforeinstallprompt',onBeforeInstall);window.removeEventListener('appinstalled',onInstalled)};
  },[]);

  async function install(){
    if(installEvent){await installEvent.prompt();await installEvent.userChoice.catch(()=>undefined);setInstallEvent(null);setVisible(false);return}
    setShowIOSHelp(true);
  }

  if(adminMode||(!visible&&!showIOSHelp))return null;
  const label=clubMode?'Installer Diambars':'Installer HDY';

  return <>
    {visible&&<button type='button' onClick={install} aria-label={label} style={{position:'fixed',right:16,bottom:18,zIndex:9999,border:'1px solid #3F3F46',borderRadius:999,background:clubMode?'#D71920':'#111113',color:'#fff',padding:'11px 15px',fontWeight:900,boxShadow:'0 10px 30px rgba(0,0,0,.35)',cursor:'pointer'}}>{label}</button>}
    {showIOSHelp&&<div role='dialog' aria-modal='true' style={{position:'fixed',inset:0,zIndex:10000,background:'rgba(0,0,0,.72)',display:'grid',placeItems:'end center',padding:16}} onClick={()=>setShowIOSHelp(false)}>
      <div onClick={e=>e.stopPropagation()} style={{width:'100%',maxWidth:460,background:'#111113',color:'#fff',border:'1px solid #2B2B31',borderRadius:20,padding:20}}>
        <strong style={{display:'block',fontSize:20,marginBottom:8}}>{clubMode?'Installer Diambars FC':'Installer HDY Performance'}</strong>
        <p style={{color:'#A1A1AA',lineHeight:1.5,marginTop:0}}>Dans Safari, appuie sur <b style={{color:'#fff'}}>Partager</b>, puis sur <b style={{color:'#fff'}}>Sur l’écran d’accueil</b> et confirme avec <b style={{color:'#fff'}}>Ajouter</b>.</p>
        <button type='button' onClick={()=>setShowIOSHelp(false)} style={{width:'100%',height:46,border:0,borderRadius:12,background:clubMode?'#D71920':'#18181B',color:'#fff',fontWeight:900}}>Compris</button>
      </div>
    </div>}
  </>
}
