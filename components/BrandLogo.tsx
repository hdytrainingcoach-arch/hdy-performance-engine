'use client';

import { useState } from 'react';

export type BrandKind='diambars'|'hdy'|'elite';
type LogoVariant='header'|'page'|'hero'|'player';

const CONFIG:Record<BrandKind,{src192:string;src512:string;label:string;fallback:string;shape:'round'|'square'}>={
  diambars:{src192:'/pwa/diambars-icon-192.png?v=logo-system-v2',src512:'/pwa/diambars-icon-512.png?v=logo-system-v2',label:'Diambars FC',fallback:'DFC',shape:'round'},
  hdy:{src192:'/pwa/hdy-icon-192.png?v=logo-system-v2',src512:'/pwa/hdy-icon-512.png?v=logo-system-v2',label:'HDY Performance Engine',fallback:'HDY',shape:'square'},
  elite:{src192:'/pwa/elite-icon-192.png?v=logo-system-v2',src512:'/pwa/elite-icon-512.png?v=logo-system-v2',label:'HDY Elite',fallback:'HDY',shape:'round'},
};

export default function BrandLogo({brand,variant='header',decorative=false,className=''}:{brand:BrandKind;variant?:LogoVariant;decorative?:boolean;className?:string}){
  const [failed,setFailed]=useState(false);
  const c=CONFIG[brand];
  const src=variant==='header'||variant==='player'?c.src192:c.src512;
  return <span className={`brandLogo brandLogo-${brand} brandLogo-${variant} brandLogo-${c.shape} ${className}`.trim()}>
    <span className='brandLogoFallback' aria-hidden='true'>{c.fallback}</span>
    {!failed&&<img src={src} alt={decorative?'':`Logo ${c.label}`} aria-hidden={decorative?true:undefined} onError={()=>setFailed(true)}/>} 
  </span>;
}
