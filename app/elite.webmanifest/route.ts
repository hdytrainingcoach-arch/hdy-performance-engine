export const dynamic='force-dynamic';

export async function GET(){
  return Response.json({
    id:'/elite',
    name:'HDY Elite',
    short_name:'HDY Elite',
    description:'Espace joueur HDY Elite pour accompagnement individuel.',
    start_url:'/elite',
    scope:'/',
    display:'standalone',
    background_color:'#F5F5F7',
    theme_color:'#F5F5F7',
    orientation:'portrait-primary',
    icons:[
      {src:'/pwa/hdy-icon-192.png?v=20260907-elite1',sizes:'192x192',type:'image/png',purpose:'any maskable'},
      {src:'/pwa/hdy-icon-512.png?v=20260907-elite1',sizes:'512x512',type:'image/png',purpose:'any maskable'}
    ]
  },{headers:{'Content-Type':'application/manifest+json','Cache-Control':'no-store'}});
}
