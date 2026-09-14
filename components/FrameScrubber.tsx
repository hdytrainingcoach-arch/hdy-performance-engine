'use client';

import { useRef } from 'react';

export function fmtMs(t:number){return `${(t*1000).toFixed(1)} ms`}

export default function FrameScrubber({videoUrl,fps,cur,duration,playing,onTime,onDuration,onPlaying}:{
 videoUrl:string;fps:number;cur:number;duration:number;playing:boolean;
 onTime:(t:number)=>void;onDuration:(d:number)=>void;onPlaying:(p:boolean)=>void;
}){
 const videoRef=useRef<HTMLVideoElement|null>(null);
 const frameDur=1/fps;

 function seekTo(t:number){const v=videoRef.current;if(!v)return;const clamped=Math.min(Math.max(t,0),duration||v.duration||0);v.currentTime=clamped;onTime(clamped)}
 function step(n:number){const v=videoRef.current;if(v){v.pause();onPlaying(false)}seekTo(cur+n*frameDur)}
 function togglePlay(){const v=videoRef.current;if(!v)return;if(v.paused){v.play();onPlaying(true)}else{v.pause();onPlaying(false)}}

 return <>
  <video ref={videoRef} src={videoUrl} style={S.video} playsInline
   onLoadedMetadata={e=>onDuration(e.currentTarget.duration)}
   onTimeUpdate={e=>onTime(e.currentTarget.currentTime)}
   onPlay={()=>onPlaying(true)} onPause={()=>onPlaying(false)}/>
  <input type='range' min={0} max={duration||0} step={frameDur} value={cur} onChange={e=>seekTo(Number(e.target.value))} style={{width:'100%'}}/>
  <div style={S.row}>
   <button onClick={()=>step(-10)} style={S.small}>◀◀ 10</button>
   <button onClick={()=>step(-1)} style={S.small}>◀ 1</button>
   <button onClick={togglePlay} style={S.small}>{playing?'Pause':'Lecture'}</button>
   <button onClick={()=>step(1)} style={S.small}>1 ▶</button>
   <button onClick={()=>step(10)} style={S.small}>10 ▶▶</button>
  </div>
  <div style={S.time}>{fmtMs(cur)} / {fmtMs(duration)}</div>
 </>
}

const S:Record<string,React.CSSProperties>={
 video:{width:'100%',borderRadius:12,background:'#000'},
 row:{display:'flex',gap:8,flexWrap:'wrap'},
 small:{flex:1,minWidth:60,height:38,borderRadius:8,border:'1px solid #2B2B31',background:'#1B1B1F',color:'#fff',cursor:'pointer'},
 time:{fontVariantNumeric:'tabular-nums',color:'#A1A1AA',fontSize:13},
};
