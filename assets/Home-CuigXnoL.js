import{r as h,j as e,L as j}from"./vendor-react-Db_inLa4.js";import{u as S,s as P}from"./index-BRO6E1Mc.js";import{u as E,a as w,m}from"./vendor-motion-DZA6fOcq.js";import{h as K,i as M,j as k,G as L,R,S as F,k as V,l as v,O as z,m as W,n as _,o as J,p as I,P as q,c as O,W as D,q as Y,N as H,B as Z,r as X,s as U,A as C,t as Q,u as ee,v as ie,w as ae,Z as re,x as se,E as T}from"./vendor-icons-JbKY7JUy.js";import"./vendor-C2bh2AFn.js";import"./vendor-supabase-BRUXfWZX.js";function te({value:i,duration:n=1200,suffix:l="",live:r=!1,liveStep:a=1,liveInterval:d=3e3}){const p=h.useRef(null),o=E(p,{once:!0,amount:.5}),s=w(),[t,c]=h.useState(s?i:0);return h.useEffect(()=>{if(!o)return;if(s){c(i);return}let x=0;const b=performance.now(),f=N=>{const g=Math.min((N-b)/n,1),A=1-Math.pow(1-g,3);c(Math.round(i*A)),g<1&&(x=requestAnimationFrame(f))};return x=requestAnimationFrame(f),()=>cancelAnimationFrame(x)},[n,o,s,i]),h.useEffect(()=>{if(!r||!o||s)return;const x=window.setInterval(()=>{c(b=>b+a)},d);return()=>window.clearInterval(x)},[o,r,d,a,s]),e.jsxs("span",{ref:p,children:[t.toLocaleString("en-US"),l]})}const oe=(i,n,l,r)=>[{id:"status",label:r("home.liveUniverse.metrics.status.label"),value:r("home.liveUniverse.metrics.status.value"),detail:r("home.liveUniverse.metrics.status.detail"),icon:M},{id:"builders",label:r("home.liveUniverse.metrics.builders.label"),value:i,detail:r("home.liveUniverse.metrics.builders.detail",{count:l}),icon:k},{id:"gp",label:r("home.liveUniverse.metrics.gp.label"),value:n,detail:r("home.liveUniverse.metrics.gp.detail"),icon:L},{id:"genesis",label:r("home.liveUniverse.metrics.genesis.label"),value:l,detail:r("home.liveUniverse.metrics.genesis.detail"),icon:R}];function ne({buildersJoined:i,gpGenerated:n,newBuildersThisWeek:l}){const{t:r}=S(),a=w(),d=oe(i,n,l,r);return e.jsxs(m.section,{className:"live-universe",initial:{opacity:0,y:a?0:28},whileInView:{opacity:1,y:0},viewport:{once:!0,amount:.2},transition:{duration:.65},children:[e.jsx("style",{children:`
        .live-universe{
          position:relative;
          display:grid;
          grid-template-columns:1.15fr .85fr;
          gap:16px;
          margin-top:16px;
        }

        .universe-panel,
        .activity-panel{
          position:relative;
          overflow:hidden;
          border:1px solid rgba(196,181,253,.16);
          border-radius:26px;
          background:
            radial-gradient(circle at 12% 0%,rgba(139,92,246,.13),transparent 38%),
            linear-gradient(145deg,rgba(18,20,34,.9),rgba(9,11,21,.82));
          box-shadow:
            0 24px 65px rgba(0,0,0,.25),
            inset 0 1px rgba(255,255,255,.04);
          backdrop-filter:blur(18px);
        }

        .universe-panel{padding:30px;}
        .activity-panel{padding:28px;}

        .live-heading{
          display:flex;
          align-items:flex-start;
          justify-content:space-between;
          gap:22px;
          margin-bottom:25px;
        }

        .live-kicker{
          display:flex;
          align-items:center;
          gap:9px;
          margin-bottom:9px;
          color:#67e8f9;
          font-size:10px;
          font-weight:900;
          letter-spacing:.18em;
        }

        .live-kicker-dot{
          width:7px;
          height:7px;
          border-radius:50%;
          background:#4ade80;
          box-shadow:0 0 16px #4ade80;
          animation:universeBlink 1.8s ease-in-out infinite;
        }

        .live-heading h2,
        .activity-header h3{
          margin:0;
          color:#f8f5ff;
        }

        .live-heading h2{
          font-size:clamp(30px,4vw,47px);
          line-height:1;
          letter-spacing:-.045em;
        }

        .era-badge{
          flex:none;
          padding:9px 12px;
          border:1px solid rgba(103,232,249,.16);
          border-radius:999px;
          color:#67e8f9;
          background:rgba(34,211,238,.055);
          font-size:9px;
          font-weight:900;
          letter-spacing:.14em;
        }

        .universe-metrics{
          display:grid;
          grid-template-columns:repeat(2,1fr);
          gap:12px;
        }

        .universe-metric{
          min-height:147px;
          padding:19px;
          border:1px solid rgba(255,255,255,.055);
          border-radius:19px;
          background:rgba(255,255,255,.025);
        }

        .metric-icon{
          display:grid;
          width:37px;
          height:37px;
          place-items:center;
          margin-bottom:17px;
          border-radius:12px;
          color:#c4b5fd;
          background:rgba(139,92,246,.1);
        }

        .universe-metric strong{
          display:block;
          margin-bottom:5px;
          color:#fff;
          font-size:25px;
        }

        .universe-metric span{
          display:block;
          color:#c6bdd5;
          font-size:12px;
          font-weight:800;
        }

        .universe-metric small{
          display:block;
          margin-top:7px;
          color:#7f778d;
          font-size:10px;
          line-height:1.45;
        }

        .genesis-progress{margin-top:18px;}

        .progress-copy{
          display:flex;
          justify-content:space-between;
          margin-bottom:9px;
          color:#aaa0bb;
          font-size:10px;
          font-weight:800;
          letter-spacing:.1em;
        }

        .progress-track{
          height:7px;
          overflow:hidden;
          border-radius:999px;
          background:rgba(255,255,255,.06);
        }

        .progress-fill{
          width:18%;
          height:100%;
          border-radius:inherit;
          background:linear-gradient(90deg,#8b5cf6,#67e8f9);
          box-shadow:0 0 20px rgba(103,232,249,.22);
        }

        .activity-header{
          display:flex;
          align-items:center;
          justify-content:space-between;
          margin-bottom:17px;
        }

        .activity-header h3{font-size:21px;}
        .activity-icon{color:#67e8f9;}
        .activity-list{display:grid;gap:9px;}

        .activity-item{
          display:grid;
          grid-template-columns:38px 1fr auto;
          gap:12px;
          align-items:center;
          padding:13px;
          border:1px solid rgba(255,255,255,.05);
          border-radius:16px;
          background:rgba(255,255,255,.022);
        }

        .activity-item-icon{
          display:grid;
          width:38px;
          height:38px;
          place-items:center;
          border-radius:12px;
          color:#67e8f9;
          background:rgba(34,211,238,.07);
        }

        .activity-item strong{
          display:block;
          color:#eeeaf7;
          font-size:11px;
        }

        .activity-item p{
          margin:4px 0 0;
          color:#837b91;
          font-size:9px;
        }

        .activity-time{
          color:#4ade80;
          font-size:8px;
          font-weight:900;
          letter-spacing:.1em;
        }

        .system-message{
          display:flex;
          align-items:center;
          gap:8px;
          margin-top:15px;
          color:#777082;
          font-size:9px;
          font-weight:800;
          letter-spacing:.08em;
        }

        @keyframes universeBlink{
          0%,100%{opacity:.55;transform:scale(.9)}
          50%{opacity:1;transform:scale(1.15)}
        }

        @media(max-width:900px){
          .live-universe{grid-template-columns:1fr;}
        }

        @media(max-width:600px){
          .universe-panel,
          .activity-panel{padding:21px;}
          .live-heading{flex-direction:column;}
          .universe-metrics{grid-template-columns:1fr;}
        }
      `}),e.jsxs("article",{className:"universe-panel",children:[e.jsxs("header",{className:"live-heading",children:[e.jsxs("div",{children:[e.jsxs("div",{className:"live-kicker",children:[e.jsx("span",{className:"live-kicker-dot"}),r("home.liveUniverse.kicker")]}),e.jsx("h2",{children:r("home.liveUniverse.title")})]}),e.jsx("span",{className:"era-badge",children:r("home.liveUniverse.era")})]}),e.jsx("div",{className:"universe-metrics",children:d.map(({id:p,label:o,value:s,detail:t,icon:c})=>e.jsxs("div",{className:"universe-metric",children:[e.jsx("div",{className:"metric-icon",children:e.jsx(c,{size:18})}),e.jsx("strong",{children:typeof s=="number"?e.jsx(te,{value:s,suffix:p==="genesis"?"%":"",live:p==="builders"||p==="gp",liveStep:p==="gp"?3:1,liveInterval:p==="gp"?2200:7e3}):s}),e.jsx("span",{children:o}),e.jsx("small",{children:t})]},p))}),e.jsxs("div",{className:"genesis-progress",children:[e.jsxs("div",{className:"progress-copy",children:[e.jsx("span",{children:r("home.liveUniverse.expansion")}),e.jsx("span",{children:"18%"})]}),e.jsx("div",{className:"progress-track",children:e.jsx(m.div,{className:"progress-fill",initial:{width:a?"18%":0},whileInView:{width:"18%"},viewport:{once:!0},transition:{duration:1.4,ease:"easeOut"}})})]})]}),e.jsxs("aside",{className:"activity-panel",children:[e.jsxs("header",{className:"activity-header",children:[e.jsxs("div",{children:[e.jsxs("div",{className:"live-kicker",children:[e.jsx("span",{className:"live-kicker-dot"}),r("home.liveUniverse.activity.kicker")]}),e.jsx("h3",{children:r("home.liveUniverse.activity.title")})]}),e.jsx(K,{className:"activity-icon",size:20})]}),e.jsx("div",{className:"activity-list",children:e.jsxs(m.div,{className:"activity-item",initial:{opacity:0,x:a?0:18,scale:.98},animate:{opacity:1,x:0,scale:1},transition:{duration:.4},children:[e.jsx("div",{className:"activity-item-icon",children:e.jsx(M,{size:17})}),e.jsxs("div",{children:[e.jsx("strong",{children:r("home.liveUniverse.activity.awaiting")}),e.jsx("p",{children:r("home.liveUniverse.activity.description")})]}),e.jsx("span",{className:"activity-time",children:r("home.liveUniverse.activity.live")})]})}),e.jsxs("div",{className:"system-message",children:[e.jsx(M,{size:13}),r("home.liveUniverse.activity.systemListening")]})]})]})}const le=i=>[{value:"1",label:i("home.journey.milestone.one.label"),text:i("home.journey.milestone.one.text"),icon:v},{value:"100",label:i("home.journey.milestone.hundred.label"),text:i("home.journey.milestone.hundred.text"),icon:F},{value:"1,000",label:i("home.journey.milestone.thousand.label"),text:i("home.journey.milestone.thousand.text"),icon:z},{value:"100,000",label:i("home.journey.milestone.hundredThousand.label"),text:i("home.journey.milestone.hundredThousand.text"),icon:k}];function de(){const{t:i}=S(),n=le(i);return e.jsxs("section",{className:"builder-journey",id:"journey",children:[e.jsx("style",{children:`
        .builder-journey{
          position:relative;
          overflow:hidden;
          margin-top:18px;
          padding:88px 28px;
          border:1px solid rgba(196,181,253,.14);
          border-radius:30px;
          background:
            radial-gradient(circle at 50% 0%,rgba(124,58,237,.18),transparent 38%),
            radial-gradient(circle at 10% 70%,rgba(34,211,238,.08),transparent 28%),
            linear-gradient(180deg,rgba(10,12,24,.96),rgba(5,7,15,.98));
          box-shadow:0 30px 90px rgba(0,0,0,.34);
        }

        .journey-stars,
        .journey-stars::before,
        .journey-stars::after{
          position:absolute;
          inset:0;
          pointer-events:none;
          content:"";
          background-image:
            radial-gradient(circle,rgba(255,255,255,.75) 0 1px,transparent 1.4px);
          background-size:58px 58px;
          opacity:.18;
        }

        .journey-stars::before{
          transform:translate(21px,17px) scale(.72);
          opacity:.14;
        }

        .journey-stars::after{
          transform:translate(-16px,28px) scale(1.18);
          opacity:.08;
        }

        .journey-inner{
          position:relative;
          z-index:2;
          width:min(1120px,100%);
          margin:0 auto;
        }

        .journey-intro{
          max-width:770px;
          margin:0 auto 64px;
          text-align:center;
        }

        .journey-kicker{
          display:inline-flex;
          align-items:center;
          gap:9px;
          margin-bottom:16px;
          color:#67e8f9;
          font-size:10px;
          font-weight:900;
          letter-spacing:.2em;
        }

        .journey-intro h2{
          margin:0;
          color:#fff;
          font-size:clamp(42px,7vw,76px);
          line-height:.95;
          letter-spacing:-.055em;
        }

        .journey-intro p{
          max-width:650px;
          margin:24px auto 0;
          color:#aaa1b8;
          font-size:15px;
          line-height:1.8;
        }

        .journey-intro strong{
          color:#f5f0ff;
        }

        .journey-flow{
          display:grid;
          grid-template-columns:repeat(4,1fr);
          gap:14px;
          margin-top:38px;
        }

        .journey-card{
          position:relative;
          min-height:260px;
          padding:25px;
          border:1px solid rgba(255,255,255,.06);
          border-radius:22px;
          background:rgba(255,255,255,.025);
          backdrop-filter:blur(14px);
        }

        .journey-card::after{
          position:absolute;
          top:50%;
          right:-12px;
          width:24px;
          height:1px;
          content:"";
          background:linear-gradient(90deg,rgba(139,92,246,.65),transparent);
        }

        .journey-card:last-child::after{
          display:none;
        }

        .journey-icon{
          display:grid;
          width:45px;
          height:45px;
          place-items:center;
          margin-bottom:30px;
          border-radius:14px;
          color:#c4b5fd;
          background:rgba(139,92,246,.1);
          box-shadow:inset 0 1px rgba(255,255,255,.04);
        }

        .journey-value{
          margin-bottom:2px;
          color:#fff;
          font-size:37px;
          font-weight:900;
          letter-spacing:-.045em;
        }

        .journey-label{
          color:#67e8f9;
          font-size:10px;
          font-weight:900;
          letter-spacing:.16em;
          text-transform:uppercase;
        }

        .journey-card p{
          margin:18px 0 0;
          color:#8f879c;
          font-size:11px;
          line-height:1.7;
        }

        .journey-manifesto{
          display:flex;
          align-items:center;
          justify-content:space-between;
          gap:28px;
          margin-top:64px;
          padding:31px;
          border:1px solid rgba(103,232,249,.12);
          border-radius:22px;
          background:
            linear-gradient(100deg,rgba(34,211,238,.055),rgba(139,92,246,.07));
        }

        .journey-manifesto h3{
          max-width:690px;
          margin:0;
          color:#f8f5ff;
          font-size:clamp(24px,4vw,40px);
          line-height:1.12;
          letter-spacing:-.035em;
        }

        .journey-manifesto p{
          max-width:690px;
          margin:13px 0 0;
          color:#958ca3;
          font-size:12px;
          line-height:1.7;
        }

        .journey-cta{
          display:inline-flex;
          align-items:center;
          justify-content:center;
          gap:10px;
          flex:none;
          min-height:50px;
          padding:0 20px;
          border:1px solid rgba(103,232,249,.24);
          border-radius:14px;
          color:#071018;
          background:linear-gradient(135deg,#a78bfa,#67e8f9);
          font-size:10px;
          font-weight:950;
          letter-spacing:.12em;
          text-decoration:none;
          box-shadow:0 15px 36px rgba(103,232,249,.12);
        }

        @media(max-width:980px){
          .journey-flow{
            grid-template-columns:repeat(2,1fr);
          }

          .journey-card:nth-child(2)::after{
            display:none;
          }

          .journey-manifesto{
            align-items:flex-start;
            flex-direction:column;
          }
        }

        @media(max-width:600px){
          .builder-journey{
            padding:68px 18px;
          }

          .journey-flow{
            grid-template-columns:1fr;
          }

          .journey-card::after{
            display:none;
          }

          .journey-manifesto{
            padding:23px;
          }

          .journey-cta{
            width:100%;
          }
        }
      `}),e.jsx("div",{className:"journey-stars"}),e.jsxs("div",{className:"journey-inner",children:[e.jsxs(m.header,{className:"journey-intro",initial:{opacity:0,y:24},whileInView:{opacity:1,y:0},viewport:{once:!0,amount:.25},transition:{duration:.65},children:[e.jsxs("div",{className:"journey-kicker",children:[e.jsx(F,{size:14}),i("home.journey.kicker")]}),e.jsx("h2",{children:i("home.journey.title")}),e.jsxs("p",{children:[i("home.journey.description.prefix")," ",e.jsx("strong",{children:i("home.journey.description.emphasis")}),i("home.journey.description.suffix")]})]}),e.jsx("div",{className:"journey-flow",children:n.map(({value:l,label:r,text:a,icon:d},p)=>e.jsxs(m.article,{className:"journey-card",initial:{opacity:0,y:28},whileInView:{opacity:1,y:0},viewport:{once:!0,amount:.2},transition:{delay:p*.1,duration:.55},children:[e.jsx("div",{className:"journey-icon",children:e.jsx(d,{size:21})}),e.jsx("div",{className:"journey-value",children:l}),e.jsx("div",{className:"journey-label",children:r}),e.jsx("p",{children:a})]},l))}),e.jsxs(m.div,{className:"journey-manifesto",initial:{opacity:0,y:24},whileInView:{opacity:1,y:0},viewport:{once:!0,amount:.3},transition:{duration:.65},children:[e.jsxs("div",{children:[e.jsx("h3",{children:i("home.journey.manifesto.title")}),e.jsx("p",{children:i("home.journey.manifesto.description")})]}),e.jsxs("a",{className:"journey-cta",href:"#community",children:[i("home.journey.cta"),e.jsx(V,{size:15})]})]})]})]})}function u(i){const n=Math.sin(i*999.91)*43758.5453;return n-Math.floor(n)}const B=["Nova","Atlas","Luna","Orion","Aurora","Sol","Astra","Vega","Lyra","Zenith","Cosmo","Aria"],$=["Cadet","Explorer","Commander","Architect","Founder"],G=["Genesis","Aurora","Orion","Solana","Nebula","Atlas"];function ce(i){return Array.from({length:i},(n,l)=>{const r=l+1,a=Math.floor(u(r*2.51)*B.length),d=Math.floor(u(r*4.71)*$.length),p=Math.floor(u(r*8.13)*G.length);return{id:r,x:4+u(r*2.17)*92,y:7+u(r*5.83)*86,size:2+u(r*9.41)*4,delay:u(r*7.19)*2.5,opacity:.35+u(r*3.73)*.65,name:B[a],rank:$[d],joinedDays:1+Math.floor(u(r*6.39)*29),gp:450+Math.floor(u(r*11.17)*48e3),stars:1+Math.floor(u(r*12.71)*42),sector:G[p]}})}function pe({builderCount:i=0,galaxiesCreated:n=0,newBuildersThisWeek:l=0}){const{language:r,t:a}=S(),d=w(),p=ce(i),[o,s]=h.useState(null);return e.jsxs("section",{className:"galactic-sky-section",id:"living-galaxy",children:[e.jsx("style",{children:`
        .galactic-sky-section{
          position:relative;
          overflow:hidden;
          margin-top:18px;
          padding:30px;
          border:1px solid rgba(196,181,253,.15);
          border-radius:28px;
          background:
            radial-gradient(circle at 50% 50%,rgba(124,58,237,.18),transparent 30%),
            radial-gradient(circle at 15% 20%,rgba(34,211,238,.08),transparent 30%),
            linear-gradient(145deg,rgba(11,13,27,.97),rgba(5,8,18,.98));
          box-shadow:0 30px 80px rgba(0,0,0,.3);
        }

        .galactic-sky-header{
          position:relative;
          z-index:3;
          display:flex;
          align-items:flex-start;
          justify-content:space-between;
          gap:24px;
          margin-bottom:24px;
        }

        .galactic-sky-kicker{
          display:flex;
          align-items:center;
          gap:9px;
          margin-bottom:9px;
          color:#67e8f9;
          font-size:10px;
          font-weight:900;
          letter-spacing:.18em;
        }

        .galactic-sky-header h2{
          max-width:720px;
          margin:0;
          color:#fff;
          font-size:clamp(32px,5vw,55px);
          line-height:1;
          letter-spacing:-.05em;
        }

        .galactic-sky-header p{
          max-width:640px;
          margin:15px 0 0;
          color:#9d95aa;
          font-size:12px;
          line-height:1.75;
        }

        .galactic-sky-count{
          flex:none;
          min-width:130px;
          padding:15px 18px;
          border:1px solid rgba(103,232,249,.15);
          border-radius:17px;
          background:rgba(34,211,238,.045);
          text-align:right;
        }

        .galactic-sky-count strong{
          display:block;
          color:#fff;
          font-size:25px;
        }

        .galactic-sky-count span{
          color:#67e8f9;
          font-size:9px;
          font-weight:900;
          letter-spacing:.12em;
        }

        .galactic-map-layout{
          display:grid;
          grid-template-columns:minmax(0,1fr);
          gap:14px;
          transition:grid-template-columns .35s ease;
        }

        .galactic-map-layout.has-selection{
          grid-template-columns:minmax(0,1fr) 280px;
        }

        .galactic-sky{
          position:relative;
        }

        .galactic-canvas{
          position:relative;
          min-height:530px;
          overflow:hidden;
          border:1px solid rgba(255,255,255,.055);
          border-radius:23px;
          background:
            radial-gradient(circle at center,rgba(109,40,217,.14),transparent 32%),
            radial-gradient(circle at center,rgba(34,211,238,.04),transparent 55%),
            rgba(3,5,14,.82);
        }

        .galactic-orbit{
          position:absolute;
          top:50%;
          left:50%;
          border:1px solid rgba(139,92,246,.14);
          border-radius:50%;
          transform:translate(-50%,-50%);
          pointer-events:none;
        }

        .galactic-orbit-one{
          width:230px;
          height:230px;
        }

        .galactic-orbit-two{
          width:390px;
          height:390px;
        }

        .galactic-orbit-three{
          width:570px;
          height:570px;
        }

        .builder-star{
          position:absolute;
          z-index:2;
          padding:0;
          border:0;
          border-radius:50%;
          background:#d8d0ff;
          box-shadow:
            0 0 7px rgba(216,208,255,.9),
            0 0 18px rgba(139,92,246,.65);
          cursor:pointer;
        }

        .builder-star:nth-of-type(5n){
          background:#67e8f9;
          box-shadow:
            0 0 8px rgba(103,232,249,.9),
            0 0 20px rgba(34,211,238,.55);
        }

        .builder-star-tooltip{
          position:absolute;
          bottom:calc(100% + 10px);
          left:50%;
          z-index:20;
          width:154px;
          padding:11px;
          border:1px solid rgba(196,181,253,.16);
          border-radius:12px;
          color:#fff;
          background:rgba(7,9,20,.96);
          box-shadow:0 14px 35px rgba(0,0,0,.4);
          opacity:0;
          pointer-events:none;
          transform:translate(-50%,7px);
          transition:.2s ease;
        }

        .builder-star:hover .builder-star-tooltip{
          opacity:1;
          transform:translate(-50%,0);
        }

        .builder-star-tooltip strong{
          display:block;
          color:#fff;
          font-size:12px;
        }

        .builder-id{
          display:block;
          margin-top:3px;
          color:#67e8f9;
          font-size:8px;
          font-weight:900;
          letter-spacing:.08em;
        }

        .builder-detail{
          display:block;
          margin-top:8px;
          color:#aaa1b8;
          font-size:8px;
          line-height:1.6;
        }

        .galaxy-core{
          position:absolute;
          top:50%;
          left:50%;
          z-index:5;
          display:grid;
          width:112px;
          height:112px;
          place-items:center;
          border:1px solid rgba(196,181,253,.3);
          border-radius:50%;
          color:#fff;
          background:
            radial-gradient(circle at 38% 30%,#a78bfa,#6d28d9 48%,#15102c 72%);
          box-shadow:
            0 0 30px rgba(139,92,246,.48),
            0 0 90px rgba(109,40,217,.35);
          transform:translate(-50%,-50%);
          text-align:center;
        }

        .galaxy-core strong{
          display:block;
          margin-top:5px;
          font-size:12px;
        }

        .galaxy-core span{
          display:block;
          margin-top:3px;
          color:#ddd6fe;
          font-size:7px;
          font-weight:900;
          letter-spacing:.13em;
        }

        .builder-star.is-selected{
          z-index:8;
          background:#fff;
          box-shadow:
            0 0 10px #fff,
            0 0 28px rgba(103,232,249,.95),
            0 0 55px rgba(139,92,246,.8);
          transform:scale(2.2);
        }

        .selected-builder-panel{
          position:relative;
          overflow:hidden;
          padding:22px;
          border:1px solid rgba(196,181,253,.16);
          border-radius:22px;
          background:
            radial-gradient(circle at 100% 0%,rgba(139,92,246,.14),transparent 38%),
            rgba(8,10,22,.95);
          box-shadow:0 24px 55px rgba(0,0,0,.3);
        }

        .selected-builder-close{
          position:absolute;
          top:14px;
          right:14px;
          display:grid;
          width:30px;
          height:30px;
          place-items:center;
          border:1px solid rgba(255,255,255,.08);
          border-radius:9px;
          color:#aaa1b8;
          background:rgba(255,255,255,.035);
          cursor:pointer;
        }

        .selected-builder-star{
          display:grid;
          width:54px;
          height:54px;
          place-items:center;
          margin-bottom:21px;
          border:1px solid rgba(196,181,253,.24);
          border-radius:17px;
          color:#fff;
          background:linear-gradient(145deg,#8b5cf6,#312e81);
          box-shadow:0 0 30px rgba(139,92,246,.28);
        }

        .selected-builder-kicker{
          margin-bottom:7px;
          color:#67e8f9;
          font-size:8px;
          font-weight:900;
          letter-spacing:.16em;
        }

        .selected-builder-panel h3{
          margin:0;
          color:#fff;
          font-size:27px;
          letter-spacing:-.04em;
        }

        .selected-builder-number{
          display:block;
          margin-top:6px;
          color:#8f879b;
          font-size:9px;
          font-weight:800;
        }

        .selected-builder-rank{
          display:inline-flex;
          margin-top:17px;
          padding:8px 10px;
          border:1px solid rgba(250,204,21,.13);
          border-radius:10px;
          color:#facc15;
          background:rgba(250,204,21,.055);
          font-size:9px;
          font-weight:900;
        }

        .selected-builder-stats{
          display:grid;
          grid-template-columns:repeat(2,1fr);
          gap:9px;
          margin-top:21px;
        }

        .selected-builder-stat{
          padding:12px;
          border:1px solid rgba(255,255,255,.055);
          border-radius:13px;
          background:rgba(255,255,255,.025);
        }

        .selected-builder-stat span{
          display:block;
          margin-bottom:5px;
          color:#777082;
          font-size:7px;
          font-weight:900;
          letter-spacing:.11em;
        }

        .selected-builder-stat strong{
          display:block;
          color:#eeeaf7;
          font-size:11px;
        }

        .selected-builder-action{
          width:100%;
          min-height:43px;
          margin-top:18px;
          border:1px solid rgba(103,232,249,.2);
          border-radius:12px;
          color:#071018;
          background:linear-gradient(135deg,#a78bfa,#67e8f9);
          font-size:9px;
          font-weight:950;
          letter-spacing:.1em;
          cursor:pointer;
        }

        .builder-star{
          cursor:pointer;
        }

        .builder-star.is-selected{
          z-index:12;
          background:#ffffff;
          box-shadow:
            0 0 10px rgba(255,255,255,1),
            0 0 28px rgba(103,232,249,.95),
            0 0 58px rgba(139,92,246,.85);
          transform:scale(2.25);
        }

        .builder-profile-panel{
          position:absolute;
          z-index:30;
          top:126px;
          right:28px;
          width:min(300px,calc(100% - 40px));
          overflow:hidden;
          padding:24px;
          border:1px solid rgba(196,181,253,.18);
          border-radius:22px;
          background:
            radial-gradient(
              circle at 100% 0%,
              rgba(139,92,246,.18),
              transparent 42%
            ),
            rgba(7,9,20,.96);
          box-shadow:
            0 28px 70px rgba(0,0,0,.48),
            inset 0 1px 0 rgba(255,255,255,.04);
          backdrop-filter:blur(18px);
        }

        .builder-profile-close{
          position:absolute;
          top:14px;
          right:14px;
          display:grid;
          width:31px;
          height:31px;
          place-items:center;
          border:1px solid rgba(255,255,255,.08);
          border-radius:9px;
          color:#aaa4b8;
          background:rgba(255,255,255,.035);
          font-size:18px;
          cursor:pointer;
        }

        .builder-profile-icon{
          display:grid;
          width:56px;
          height:56px;
          place-items:center;
          margin-bottom:20px;
          border:1px solid rgba(196,181,253,.24);
          border-radius:17px;
          color:#ffffff;
          background:linear-gradient(145deg,#8b5cf6,#312e81);
          box-shadow:0 0 32px rgba(139,92,246,.3);
        }

        .builder-profile-label{
          margin-bottom:7px;
          color:#67e8f9;
          font-size:8px;
          font-weight:900;
          letter-spacing:.18em;
        }

        .builder-profile-panel h3{
          margin:0;
          color:#ffffff;
          font-size:27px;
          letter-spacing:-.04em;
        }

        .builder-profile-id{
          display:block;
          margin-top:6px;
          color:#8f879b;
          font-size:9px;
          font-weight:800;
        }

        .builder-profile-rank{
          display:inline-flex;
          margin-top:17px;
          padding:8px 11px;
          border:1px solid rgba(250,204,21,.14);
          border-radius:10px;
          color:#facc15;
          background:rgba(250,204,21,.055);
          font-size:9px;
          font-weight:900;
        }

        .builder-profile-status{
          display:flex;
          align-items:center;
          gap:7px;
          margin-top:13px;
          color:#86efac;
          font-size:8px;
          font-weight:900;
          letter-spacing:.12em;
        }

        .builder-profile-status::before{
          width:6px;
          height:6px;
          border-radius:50%;
          background:#4ade80;
          box-shadow:0 0 12px rgba(74,222,128,.9);
          content:"";
        }

        .builder-profile-stats{
          display:grid;
          grid-template-columns:repeat(2,minmax(0,1fr));
          gap:9px;
          margin-top:21px;
        }

        .builder-profile-stat{
          min-width:0;
          padding:12px;
          border:1px solid rgba(255,255,255,.055);
          border-radius:13px;
          background:rgba(255,255,255,.025);
        }

        .builder-profile-stat span{
          display:block;
          margin-bottom:5px;
          color:#777082;
          font-size:7px;
          font-weight:900;
          letter-spacing:.11em;
        }

        .builder-profile-stat strong{
          display:block;
          overflow:hidden;
          color:#eeeaf7;
          font-size:11px;
          text-overflow:ellipsis;
          white-space:nowrap;
        }

        .builder-profile-actions{
          display:grid;
          gap:8px;
          margin-top:18px;
        }

        .builder-profile-primary,
        .builder-profile-secondary{
          width:100%;
          min-height:42px;
          border-radius:12px;
          font-size:8px;
          font-weight:950;
          letter-spacing:.1em;
          cursor:pointer;
        }

        .builder-profile-primary{
          border:1px solid rgba(103,232,249,.2);
          color:#071018;
          background:linear-gradient(135deg,#a78bfa,#67e8f9);
        }

        .builder-profile-secondary{
          border:1px solid rgba(196,181,253,.13);
          color:#c4b5fd;
          background:rgba(139,92,246,.065);
        }

        @media(max-width:900px){
          .builder-profile-panel{
            top:auto;
            right:18px;
            bottom:126px;
            left:18px;
            width:auto;
          }
        }

        @media(max-width:560px){
          .builder-profile-panel{
            position:relative;
            top:auto;
            right:auto;
            bottom:auto;
            left:auto;
            width:auto;
            margin:16px 14px 0;
          }
        }

        .galactic-footer{
          display:grid;
          grid-template-columns:repeat(3,1fr);
          gap:12px;
          margin-top:14px;
        }

        .galactic-stat{
          display:flex;
          align-items:center;
          gap:12px;
          padding:15px;
          border:1px solid rgba(255,255,255,.05);
          border-radius:15px;
          color:#9d95aa;
          background:rgba(255,255,255,.022);
          font-size:9px;
          font-weight:800;
          letter-spacing:.07em;
        }

        .galactic-stat svg{
          color:#67e8f9;
        }

        @media(max-width:720px){
          .galactic-sky-section{
            padding:20px;
          }

          .galactic-sky-header{
            flex-direction:column;
          }

          .galactic-sky-count{
            width:100%;
            text-align:left;
          }

          .galactic-map-layout.has-selection{
            grid-template-columns:1fr;
          }

          .galactic-canvas{
            min-height:440px;
          }

          .galactic-orbit-three{
            width:470px;
            height:470px;
          }

          .galactic-footer{
            grid-template-columns:1fr;
          }
        }
      `}),e.jsxs("header",{className:"galactic-sky-header",children:[e.jsxs("div",{children:[e.jsxs("div",{className:"galactic-sky-kicker",children:[e.jsx(F,{size:14}),a("home.galacticSky.kicker")]}),e.jsx("h2",{children:a("home.galacticSky.title")}),e.jsx("p",{children:a("home.galacticSky.description")})]}),e.jsxs("div",{className:"galactic-sky-count",children:[e.jsx("strong",{children:i.toLocaleString(r)}),e.jsx("span",{children:a("home.galacticSky.visibleStars")})]})]}),e.jsxs("div",{className:`galactic-map-layout ${o?"has-selection":""}`,children:[e.jsxs("div",{className:"galactic-canvas",children:[e.jsx("div",{className:"galactic-orbit galactic-orbit-one"}),e.jsx("div",{className:"galactic-orbit galactic-orbit-two"}),e.jsx("div",{className:"galactic-orbit galactic-orbit-three"}),p.map(t=>e.jsx(m.button,{type:"button",className:`builder-star ${(o==null?void 0:o.id)===t.id?"is-selected":""}`,"aria-label":a("home.galacticSky.starAria",{id:t.id}),onClick:()=>s(t),style:{left:`${t.x}%`,top:`${t.y}%`,width:t.size,height:t.size,opacity:t.opacity},initial:{opacity:0,scale:0},whileInView:{opacity:t.opacity,scale:[0,1.7,1]},viewport:{once:!0},animate:d?void 0:{filter:["brightness(0.8)","brightness(1.8)","brightness(0.8)"]},transition:{opacity:{delay:t.delay*.18,duration:.4},scale:{delay:t.delay*.18,duration:.55},filter:{delay:t.delay,duration:2.4+t.delay,repeat:1/0}},children:e.jsxs("span",{className:"builder-star-tooltip",children:[e.jsx("strong",{children:t.name}),e.jsx("span",{className:"builder-id",children:a("home.galacticSky.builderNumber",{id:String(t.id).padStart(4,"0")})}),e.jsxs("span",{className:"builder-detail",children:[a("home.galacticSky.tooltip.rank"),":"," ",t.rank,e.jsx("br",{}),a("home.galacticSky.tooltip.joined"),":"," ",a("home.galacticSky.daysAgo",{count:t.joinedDays}),e.jsx("br",{}),a("home.galacticSky.stats.gp"),":"," ",t.gp.toLocaleString(r),e.jsx("br",{}),a("home.galacticSky.stats.stars"),":"," ",t.stars.toLocaleString(r),e.jsx("br",{}),a("home.galacticSky.stats.sector"),":"," ",t.sector]})]})},t.id)),e.jsx(m.div,{className:"galaxy-core",animate:d?void 0:{scale:[1,1.06,1],rotate:[0,2,0,-2,0]},transition:{duration:5,repeat:1/0,ease:"easeInOut"},children:e.jsxs("div",{children:[e.jsx(v,{size:22}),e.jsx("strong",{children:a("home.galacticSky.core.you")}),e.jsx("span",{children:a("home.galacticSky.core.label")})]})})]}),o&&e.jsxs(m.aside,{className:"selected-builder-panel",initial:{opacity:0,x:24},animate:{opacity:1,x:0},exit:{opacity:0,x:24},children:[e.jsx("button",{type:"button",className:"selected-builder-close",onClick:()=>s(null),"aria-label":a("home.galacticSky.profile.closeAria"),children:"×"}),e.jsx("div",{className:"selected-builder-star",children:e.jsx(v,{size:24})}),e.jsx("div",{className:"selected-builder-kicker",children:a("home.galacticSky.profile.selectedBuilder")}),e.jsx("h3",{children:o.name}),e.jsx("span",{className:"selected-builder-number",children:a("home.galacticSky.builderNumber",{id:String(o.id).padStart(4,"0")})}),e.jsx("div",{className:"selected-builder-rank",children:o.rank}),e.jsxs("div",{className:"selected-builder-stats",children:[e.jsxs("div",{className:"selected-builder-stat",children:[e.jsx("span",{children:a("home.galacticSky.stats.gp")}),e.jsx("strong",{children:o.gp.toLocaleString(r)})]}),e.jsxs("div",{className:"selected-builder-stat",children:[e.jsx("span",{children:a("home.galacticSky.stats.stars")}),e.jsx("strong",{children:o.stars.toLocaleString(r)})]}),e.jsxs("div",{className:"selected-builder-stat",children:[e.jsx("span",{children:a("home.galacticSky.stats.sector")}),e.jsx("strong",{children:o.sector})]}),e.jsxs("div",{className:"selected-builder-stat",children:[e.jsx("span",{children:a("home.galacticSky.stats.joined")}),e.jsx("strong",{children:a("home.galacticSky.daysAgo",{count:o.joinedDays})})]})]}),e.jsx("button",{type:"button",className:"selected-builder-action",children:a("home.galacticSky.actions.openBuilderGalaxy")})]})]}),o&&e.jsxs(m.aside,{className:"builder-profile-panel",initial:{opacity:0,scale:.96,y:12},animate:{opacity:1,scale:1,y:0},transition:{duration:.25},"aria-label":a("home.galacticSky.profile.aria"),children:[e.jsx("button",{type:"button",className:"builder-profile-close",onClick:()=>s(null),"aria-label":a("home.galacticSky.profile.closeAria"),children:"×"}),e.jsx("div",{className:"builder-profile-icon",children:e.jsx(v,{size:25})}),e.jsx("div",{className:"builder-profile-label",children:a("home.galacticSky.profile.label")}),e.jsx("h3",{children:o.name}),e.jsx("span",{className:"builder-profile-id",children:a("home.galacticSky.builderNumber",{id:String(o.id).padStart(4,"0")})}),e.jsx("div",{className:"builder-profile-rank",children:o.rank}),e.jsx("div",{className:"builder-profile-status",children:a("home.galacticSky.profile.online")}),e.jsxs("div",{className:"builder-profile-stats",children:[e.jsxs("div",{className:"builder-profile-stat",children:[e.jsx("span",{children:a("home.galacticSky.stats.gp")}),e.jsx("strong",{children:o.gp.toLocaleString(r)})]}),e.jsxs("div",{className:"builder-profile-stat",children:[e.jsx("span",{children:a("home.galacticSky.stats.stars")}),e.jsx("strong",{children:o.stars.toLocaleString(r)})]}),e.jsxs("div",{className:"builder-profile-stat",children:[e.jsx("span",{children:a("home.galacticSky.stats.sector")}),e.jsx("strong",{children:o.sector})]}),e.jsxs("div",{className:"builder-profile-stat",children:[e.jsx("span",{children:a("home.galacticSky.stats.joined")}),e.jsx("strong",{children:a("home.galacticSky.daysAgo",{count:o.joinedDays})})]})]}),e.jsxs("div",{className:"builder-profile-actions",children:[e.jsx("button",{type:"button",className:"builder-profile-primary",children:a("home.galacticSky.actions.viewGalaxy")}),e.jsx("button",{type:"button",className:"builder-profile-secondary",children:a("home.galacticSky.actions.sendAllianceRequest")})]})]}),e.jsxs("footer",{className:"galactic-footer",children:[e.jsxs("div",{className:"galactic-stat",children:[e.jsx(k,{size:15}),a("home.galacticSky.footer.buildersConnected",{count:i.toLocaleString(r)})]}),e.jsxs("div",{className:"galactic-stat",children:[e.jsx(z,{size:15}),a("home.galacticSky.footer.galaxiesCreated",{count:n.toLocaleString(r)})]}),e.jsxs("div",{className:"galactic-stat",children:[e.jsx(v,{size:15}),a("home.galacticSky.footer.newStarsThisWeek",{count:l.toLocaleString(r)})]})]})]})}function me(){const i=h.useRef(null),n=w();return h.useEffect(()=>{const l=i.current;if(!l)return;const r=l.getContext("2d");if(!r)return;const a=l,d=r;let p=0,o=[],s=window.innerWidth,t=window.innerHeight,c=Math.min(window.devicePixelRatio||1,2);function x(){const N=Math.min(320,Math.max(120,Math.floor(s*t/6500)));o=Array.from({length:N},()=>({x:Math.random()*s,y:Math.random()*t,radius:Math.random()*1.25+.2,speed:Math.random()*.12+.025,opacity:Math.random()*.65+.2,pulse:Math.random()*Math.PI*2}))}function b(){s=window.innerWidth,t=window.innerHeight,c=Math.min(window.devicePixelRatio||1,2),a.width=Math.floor(s*c),a.height=Math.floor(t*c),a.style.width=`${s}px`,a.style.height=`${t}px`,d.setTransform(c,0,0,c,0,0),x()}function f(N){d.clearRect(0,0,s,t);for(const g of o){const A=n?1:.72+Math.sin(N*.0012+g.pulse)*.28;d.beginPath(),d.arc(g.x,g.y,g.radius,0,Math.PI*2),d.fillStyle=`rgba(220, 230, 255, ${g.opacity*A})`,d.fill(),n||(g.y+=g.speed,g.y>t+4&&(g.y=-4,g.x=Math.random()*s))}p=requestAnimationFrame(f)}return b(),window.addEventListener("resize",b),p=requestAnimationFrame(f),()=>{window.removeEventListener("resize",b),cancelAnimationFrame(p)}},[n]),e.jsxs("div",{className:"cinematic-background","aria-hidden":"true",children:[e.jsx("div",{className:"cinematic-nebula cinematic-nebula-one"}),e.jsx("div",{className:"cinematic-nebula cinematic-nebula-two"}),e.jsx("div",{className:"cinematic-nebula cinematic-nebula-three"}),e.jsx("canvas",{ref:i,className:"cinematic-starfield"}),e.jsx("div",{className:"cinematic-vignette"}),e.jsx("div",{className:"cinematic-noise"})]})}function xe(){return e.jsxs("div",{className:"shooting-stars","aria-hidden":"true",children:[e.jsx("span",{className:"shooting-star s1"}),e.jsx("span",{className:"shooting-star s2"}),e.jsx("span",{className:"shooting-star s3"}),e.jsx("span",{className:"shooting-star s4"})]})}const ge={buildersJoined:0,galaxiesCreated:0,alliancesFormed:0,gpGenerated:0,newBuildersThisWeek:0},he={async load(){const{data:i,error:n}=await P.rpc("get_public_universe_stats");if(n)throw n;const l=Array.isArray(i)?i[0]:void 0;return l?{buildersJoined:Number(l.builders_joined),galaxiesCreated:Number(l.galaxies_created),alliancesFormed:Number(l.alliances_formed),gpGenerated:Number(l.gp_generated),newBuildersThisWeek:Number(l.new_builders_this_week)}:ge}},be=i=>[{labelKey:"home.stats.buildersJoined",value:i.buildersJoined,suffix:"",icon:k},{labelKey:"home.stats.galaxiesCreated",value:i.galaxiesCreated,suffix:"",icon:z},{labelKey:"home.stats.alliancesFormed",value:i.alliancesFormed,suffix:"",icon:T},{labelKey:"home.stats.gpGenerated",value:i.gpGenerated,suffix:"",icon:L}],ue=[{code:"M-001",titleKey:"home.missions.restoreSignal.title",descriptionKey:"home.missions.restoreSignal.description",rewardKey:"home.missions.restoreSignal.reward",icon:M,soon:!1},{code:"M-002",titleKey:"home.missions.joinChannels.title",descriptionKey:"home.missions.joinChannels.description",rewardKey:"home.missions.joinChannels.reward",icon:k,soon:!1},{code:"M-004",titleKey:"home.missions.arcade.title",descriptionKey:"home.missions.arcade.description",rewardKey:"home.missions.arcade.reward",icon:Q,soon:!0}],fe=[["home.roadmap.phase1.code","home.roadmap.phase1.title","home.roadmap.phase1.description",!0],["home.roadmap.phase2.code","home.roadmap.phase2.title","home.roadmap.phase2.description",!0],["home.roadmap.phase3.code","home.roadmap.phase3.title","home.roadmap.phase3.description",!1],["home.roadmap.phase4.code","home.roadmap.phase4.title","home.roadmap.phase4.description",!1]],ye=[["home.community.missions.title","home.community.missions.description",U],["home.community.recognition.title","home.community.recognition.description",se],["home.community.discovery.title","home.community.discovery.description",T]],y={hidden:{opacity:0,y:24},show:{opacity:1,y:0}};function je({value:i,suffix:n="",decimals:l=0}){const{language:r}=S(),[a,d]=h.useState(0),p=w();h.useEffect(()=>{if(p){d(i);return}let s=0;const t=performance.now(),c=x=>{const b=Math.min((x-t)/1400,1);d(i*(1-Math.pow(1-b,3))),b<1&&(s=requestAnimationFrame(c))};return s=requestAnimationFrame(c),()=>cancelAnimationFrame(s)},[p,i]);const o=h.useMemo(()=>l?a.toFixed(l):Math.round(a).toLocaleString(r),[a,l,r]);return e.jsxs(e.Fragment,{children:[o,n]})}const ve=[["home.network.features.mining",q],["home.network.features.passport",O],["home.network.features.wallet",D],["home.network.features.missions",Y],["home.network.features.galaxy",H],["home.network.features.ai",Z]];function Ae(){const{t:i}=S(),[n,l]=h.useState({buildersJoined:0,galaxiesCreated:0,alliancesFormed:0,gpGenerated:0,newBuildersThisWeek:0});h.useEffect(()=>{let s=!0;return(async()=>{try{const c=await he.load();s&&l(c)}catch(c){console.error("Universe stats could not be loaded",c)}})(),()=>{s=!1}},[]);const r=be(n),a=w(),[d,p]=h.useState({x:0,y:0});function o(s){if(a)return;const t=s.currentTarget.getBoundingClientRect();p({x:(s.clientX-t.left)/t.width-.5,y:(s.clientY-t.top)/t.height-.5})}return e.jsxs(e.Fragment,{children:[e.jsx(me,{}),e.jsx(xe,{}),e.jsxs(m.main,{className:"home-v2",initial:"hidden",animate:"show",transition:{staggerChildren:.1},children:[e.jsx("style",{children:`
        .home-v2{
          --text:#f8f5ff;--muted:#aaa0bb;--purple:#8b5cf6;
          --purple-light:#c4b5fd;--cyan:#67e8f9;--green:#4ade80;
          --gold:#f6d365;--border:rgba(196,181,253,.16);
          width:min(1180px,calc(100% - 32px));margin:auto;padding:30px 0 94px;color:var(--text)
        }
        .home-v2 *{box-sizing:border-box}
        .glass{border:1px solid var(--border);background:linear-gradient(145deg,rgba(18,20,34,.88),rgba(10,12,22,.76));box-shadow:0 22px 60px rgba(0,0,0,.25),inset 0 1px rgba(255,255,255,.04);backdrop-filter:blur(18px)}
        .eyebrow{display:inline-flex;align-items:center;gap:9px;margin-bottom:18px;color:var(--cyan);font-size:11px;font-weight:900;letter-spacing:.18em}
        .dot{width:7px;height:7px;border-radius:50%;background:var(--green);box-shadow:0 0 16px var(--green)}
        .hero{position:relative;display:grid;grid-template-columns:1.08fr .92fr;gap:58px;align-items:center;min-height:600px;overflow:hidden;border-radius:34px;isolation:isolate}
        .hero:before{content:"";position:absolute;inset:0;z-index:-2;background:radial-gradient(circle at 16% 28%,rgba(124,58,237,.22),transparent 34%),radial-gradient(circle at 84% 34%,rgba(14,165,233,.14),transparent 31%)}
        .pointer{position:absolute;z-index:-1;width:360px;height:360px;border-radius:50%;pointer-events:none;background:radial-gradient(circle,rgba(129,92,246,.16),transparent 68%);filter:blur(12px);transition:left .14s,top .14s}
        .hero-copy{padding:60px 0 60px 38px}
        .hero h1{max-width:690px;margin:0;font-size:clamp(64px,8vw,112px);line-height:.86;letter-spacing:-.065em;font-weight:500}
        .hero h1 strong{display:block;margin-top:12px;font-weight:800;background:linear-gradient(100deg,#c4b5fd,#7c5cff,#4f46e5);background-clip:text;color:transparent}
        .hero-copy>p{max-width:650px;margin:28px 0 0;color:var(--muted);font-size:18px;line-height:1.72}
        .actions{display:flex;flex-wrap:wrap;gap:13px;margin-top:30px}
        .primary,.secondary,.text-link{display:inline-flex;align-items:center;justify-content:center;gap:9px;min-height:50px;border-radius:15px;font-size:14px;font-weight:800;text-decoration:none;transition:.18s}
        .primary{padding:0 21px;color:#090711;background:linear-gradient(115deg,#a78bfa,#818cf8,#38bdf8);box-shadow:0 15px 38px rgba(99,102,241,.3)}
        .secondary{padding:0 20px;border:1px solid var(--border);color:var(--text);background:rgba(255,255,255,.035)}
        .primary:hover,.secondary:hover,.text-link:hover{transform:translateY(-2px)}
        .signal{display:flex;align-items:center;gap:9px;margin-top:22px;color:#aca0c1;font:700 10px Georgia;letter-spacing:.18em}
        .planet-zone{display:grid;min-height:500px;place-items:center;perspective:1200px}
        .planet-system{position:relative;display:grid;width:min(410px,84vw);aspect-ratio:1;place-items:center;transform-style:preserve-3d;transition:transform .18s}
        .halo{position:absolute;width:88%;height:88%;border-radius:50%;background:radial-gradient(circle,rgba(111,76,255,.22),transparent 66%);filter:blur(22px)}
        .orbit{position:absolute;border:1px solid rgba(155,139,255,.2);border-radius:50%}
        .orbit-a{width:94%;height:42%;animation:orbitA 20s linear infinite}
        .orbit-b{width:80%;height:80%;border-style:dashed;opacity:.5;animation:orbitB 28s linear infinite}
        .orbit-c{width:109%;height:62%;opacity:.42;animation:orbitC 34s linear infinite}
        .particle{position:absolute;width:8px;height:8px;top:50%;right:2%;border-radius:50%;background:#b8f4ff;box-shadow:0 0 20px #67e8f9}
        .genesis-world{position:relative;z-index:3;display:grid;width:82%;min-height:470px;place-items:center;transform-style:preserve-3d}
        .planet-atmosphere{position:absolute;width:82%;aspect-ratio:1;border-radius:50%;background:radial-gradient(circle,rgba(139,92,246,.34) 0%,rgba(56,189,248,.14) 36%,transparent 70%);filter:blur(30px);animation:planetPulse 5s ease-in-out infinite}
        .planet-core{position:relative;z-index:2;display:grid;width:58%;aspect-ratio:1;place-items:center;overflow:hidden;border:1px solid rgba(196,181,253,.2);border-radius:50%;background:radial-gradient(circle at 30% 22%,rgba(255,255,255,.34),transparent 7%),radial-gradient(circle at 66% 72%,rgba(17,24,73,.8),transparent 44%),linear-gradient(145deg,#4936a4,#1d2058 48%,#070b1c);box-shadow:-30px 14px 80px rgba(83,54,210,.34),32px 22px 90px rgba(0,0,0,.68),inset -30px -22px 58px rgba(0,0,0,.58);animation:planetFloat 7s ease-in-out infinite}
        .planet-core:before{content:"";position:absolute;width:132%;height:38%;border:1px solid rgba(103,232,249,.26);border-radius:50%;transform:rotate(-17deg);box-shadow:0 0 34px rgba(103,232,249,.12),inset 0 0 20px rgba(139,92,246,.12)}
        .planet-core:after{content:"";position:absolute;inset:10%;border:1px dashed rgba(196,181,253,.13);border-radius:50%;animation:innerOrbit 18s linear infinite}
        .planet-light{position:absolute;top:17%;left:22%;width:22%;height:22%;border-radius:50%;background:radial-gradient(circle,rgba(255,255,255,.26),transparent 70%);filter:blur(7px)}
        .planet-shadow{position:absolute;right:-12%;bottom:-8%;width:82%;height:82%;border-radius:50%;background:radial-gradient(circle,rgba(0,0,0,.12),rgba(0,0,0,.72));filter:blur(5px)}
        .planet-label{position:relative;z-index:3;color:rgba(232,226,255,.66);font:700 11px Georgia;letter-spacing:.34em}
        .bubo-transmission{position:absolute;z-index:7;right:-30px;bottom:-10px;display:grid;grid-template-columns:86px 1fr;gap:15px;align-items:center;width:min(352px,88%);padding:13px;border-radius:20px;transform:translateZ(50px);box-shadow:0 20px 55px rgba(0,0,0,.34),0 0 32px rgba(103,92,255,.11)}
        .transmission-image{position:relative;width:86px;height:86px;overflow:hidden;border:1px solid rgba(103,232,249,.35);border-radius:18px;background:radial-gradient(circle at 50% 35%,rgba(115,79,255,.24),rgba(7,9,20,.92) 72%);box-shadow:0 0 0 3px rgba(122,92,255,.07),0 0 24px rgba(74,178,255,.2)}
        .transmission-image img{display:block;width:100%;height:100%;object-fit:cover;object-position:center;opacity:1;transform:scale(1.03);filter:saturate(1.12) contrast(1.08) brightness(1.05);animation:transmissionBobuPulse 4.6s ease-in-out infinite}
        .transmission-copy span{display:block;margin-bottom:5px;color:var(--cyan);font-size:8px;font-weight:900;letter-spacing:.15em}
        .transmission-copy strong{display:block;color:#fff;font-size:10px;line-height:1.4;letter-spacing:.04em}
        .transmission-copy p{margin:6px 0 0;color:#c9c1d9;font-size:10px;line-height:1.5}
        .chip{position:absolute;display:flex;align-items:center;gap:9px;padding:11px 14px;border:1px solid var(--border);border-radius:14px;color:#c8c1dc;background:rgba(12,13,25,.7);font-size:11px;font-weight:800}
        .chip-a{top:14%;left:0}.chip-b{right:-1%;bottom:24%}
        .sector{position:absolute;bottom:7%;display:flex;align-items:center;gap:9px;color:rgba(187,180,219,.53);font:700 10px Georgia;letter-spacing:.16em}
        .network-showcase{position:relative;display:grid;grid-template-columns:.92fr 1.08fr;gap:44px;align-items:center;margin-top:78px;padding:42px;border-radius:32px;overflow:hidden}
        .network-showcase:before{content:"";position:absolute;inset:0;pointer-events:none;background:radial-gradient(circle at 78% 35%,rgba(58,189,248,.14),transparent 35%),radial-gradient(circle at 18% 75%,rgba(139,92,246,.17),transparent 38%)}
        .network-copy,.network-visual{position:relative;z-index:1}
        .network-copy h2{max-width:610px;margin:8px 0 16px;font-size:clamp(42px,6vw,74px);line-height:.94;letter-spacing:-.055em}
        .network-copy>p{max-width:620px;margin:0;color:var(--muted);font-size:16px;line-height:1.75}
        .network-features{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin-top:26px}
        .network-feature{display:flex;align-items:center;gap:11px;min-height:49px;padding:11px 13px;border:1px solid rgba(196,181,253,.13);border-radius:14px;color:#ddd7ec;background:rgba(255,255,255,.025);font-size:12px;font-weight:800}
        .network-feature svg{flex:0 0 auto;color:var(--cyan)}
        .store-actions{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;margin-top:25px}
        .store-card{display:flex;min-height:68px;align-items:center;gap:12px;padding:12px 15px;border:1px solid rgba(196,181,253,.18);border-radius:16px;color:#fff;text-decoration:none;background:rgba(7,9,20,.66)}
        .store-card.is-active{transition:transform .18s,border-color .18s}
        .store-card.is-active:hover{transform:translateY(-2px);border-color:rgba(103,232,249,.5)}
        .store-card.is-disabled{cursor:not-allowed;opacity:.72}
        .store-card span{display:grid;gap:3px}
        .store-card small{color:#9d94ad;font-size:9px;font-weight:800;letter-spacing:.09em;text-transform:uppercase}
        .store-card strong{font-size:14px}
        .network-release{margin-top:17px;color:#a99fba;font-size:11px;line-height:1.6}
        .network-visual{display:grid;place-items:center}
        .network-image-shell{position:relative;width:100%;overflow:hidden;border:1px solid rgba(103,232,249,.18);border-radius:26px;background:#070914;box-shadow:0 28px 75px rgba(0,0,0,.42),0 0 70px rgba(90,67,220,.13)}
        .network-image-shell:after{content:"";position:absolute;inset:0;pointer-events:none;box-shadow:inset 0 0 60px rgba(0,0,0,.32)}
        .network-image-shell img{display:block;width:100%;height:auto;object-fit:cover}
        .network-badge{position:absolute;right:18px;bottom:18px;display:flex;align-items:center;gap:8px;padding:10px 13px;border:1px solid rgba(103,232,249,.24);border-radius:13px;color:#dffaff;background:rgba(4,8,22,.82);font-size:10px;font-weight:900;letter-spacing:.1em;backdrop-filter:blur(14px)}
        .stats{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-top:-10px;position:relative;z-index:3}
        .stat{min-height:145px;padding:23px;border-radius:23px}
        .stat-icon{display:grid;width:39px;height:39px;place-items:center;margin-bottom:15px;border-radius:13px;color:var(--purple-light);background:rgba(139,92,246,.1)}
        .stat strong{display:block;margin-bottom:7px;font-size:32px}.stat span{color:var(--muted)}
        .transmission{display:flex;align-items:flex-end;justify-content:space-between;gap:30px;margin-top:15px;padding:34px;border-radius:24px}
        .transmission h2{margin:0;font-size:clamp(28px,4vw,44px)}.transmission p{color:var(--muted)}
        .section{margin-top:78px}.section-header{display:flex;align-items:flex-end;justify-content:space-between;gap:30px;margin-bottom:22px}
        .section-header h2{margin:0;font-size:clamp(35px,5vw,58px);line-height:.98;letter-spacing:-.05em}
        .section-header p{max-width:570px;color:var(--muted);line-height:1.7}.text-link{color:var(--purple-light)}
        .mission-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:14px}
        .mission-card{position:relative;min-height:310px;padding:24px;border-radius:24px}.mission-card.soon{opacity:.68}
        .mission-top{display:flex;justify-content:space-between}.mission-icon{display:grid;width:46px;height:46px;place-items:center;border-radius:15px;color:var(--cyan);background:rgba(34,211,238,.08)}
        .status{padding:7px 10px;border-radius:999px;color:var(--green);background:rgba(74,222,128,.08);font-size:9px;font-weight:900;letter-spacing:.1em}
        .mission-card small{display:block;margin-top:28px;color:var(--purple-light);font-weight:900;letter-spacing:.16em}
        .mission-card h3{margin:10px 0;font-size:21px}.mission-card p{color:var(--muted);line-height:1.65}
        .mission-footer{position:absolute;right:24px;bottom:23px;left:24px;display:flex;justify-content:space-between;color:var(--gold);font-weight:800}
        .roadmap{display:grid;grid-template-columns:.74fr 1.26fr;gap:16px}
        .roadmap-intro{position:relative;min-height:500px;padding:40px;border-radius:26px}.roadmap-intro h3{font-size:48px;line-height:1;margin:28px 0 14px}.roadmap-intro p{color:var(--muted);line-height:1.75}
        .progress{position:absolute;right:35px;bottom:35px;left:35px}.track{height:8px;border-radius:99px;background:rgba(255,255,255,.06)}.fill{width:50%;height:100%;border-radius:inherit;background:linear-gradient(90deg,var(--purple),var(--cyan))}
        .timeline{display:grid;gap:12px}.timeline-card{display:grid;grid-template-columns:auto 1fr auto;gap:18px;align-items:center;min-height:113px;padding:20px;border-radius:21px}
        .marker{display:grid;width:40px;height:40px;place-items:center;border-radius:13px;background:rgba(255,255,255,.04)}.marker.done{color:var(--green);background:rgba(74,222,128,.08)}
        .timeline-card small{color:var(--purple-light);font-weight:900;letter-spacing:.15em}.timeline-card h4{margin:5px 0}.timeline-card p{margin:0;color:var(--muted);font-size:12px}
        .community{padding:50px;border-radius:30px}.community-grid{display:grid;grid-template-columns:.9fr 1.1fr;gap:36px;align-items:center}
        .community h2{font-size:clamp(38px,6vw,67px);line-height:.98;margin:0}.community p{color:var(--muted);line-height:1.75}
        .benefits{display:grid;gap:12px}.benefit{display:flex;gap:15px;padding:18px;border:1px solid rgba(255,255,255,.06);border-radius:18px;background:rgba(255,255,255,.026)}
        .benefit-icon{display:grid;width:42px;height:42px;place-items:center;border-radius:13px;color:var(--purple-light);background:rgba(139,92,246,.09)}
        .benefit h4{margin:0 0 5px}.benefit p{margin:0;font-size:12px}
        .final{margin-top:78px;padding:70px 24px;border:1px solid rgba(137,114,255,.2);border-radius:32px;text-align:center;background:radial-gradient(circle at 50% 120%,rgba(98,77,230,.24),transparent 54%),rgba(12,12,24,.85)}
        .final h2{max-width:790px;margin:16px auto 13px;font-size:clamp(39px,7vw,76px);line-height:.94}.final p{max-width:650px;margin:auto;color:var(--muted)}
        .final-actions{display:flex;justify-content:center;gap:12px;margin-top:28px}
        @keyframes transmissionBobuPulse{
          0%,100%{
            transform:scale(1.03);
            filter:saturate(1.12) contrast(1.08) brightness(1.05)
              drop-shadow(0 0 7px rgba(71,190,255,.22))
          }
          50%{
            transform:scale(1.075);
            filter:saturate(1.18) contrast(1.1) brightness(1.1)
              drop-shadow(0 0 13px rgba(133,83,255,.4))
          }
        }
        @keyframes orbitA{to{transform:rotate(360deg)}}@keyframes orbitB{to{transform:rotate(-360deg)}}@keyframes orbitC{to{transform:rotate(360deg)}}@keyframes planetFloat{0%,100%{transform:translateY(0) rotate(-1deg)}50%{transform:translateY(-14px) rotate(1deg)}}@keyframes planetPulse{0%,100%{opacity:.62;transform:scale(.95)}50%{opacity:1;transform:scale(1.08)}}@keyframes innerOrbit{to{transform:rotate(360deg)}}
        @media(max-width:980px){.hero,.roadmap,.community-grid,.network-showcase{grid-template-columns:1fr}.stats{grid-template-columns:repeat(2,1fr)}.mission-grid{grid-template-columns:1fr 1fr}.mission-card:last-child{grid-column:1/-1}.network-visual{order:-1}.network-image-shell{max-width:760px}}
        @media(max-width:720px){.home-v2{width:calc(100% - 20px)}.stats,.mission-grid,.network-features,.store-actions{grid-template-columns:1fr}.mission-card:last-child{grid-column:auto}.section-header,.transmission{align-items:flex-start;flex-direction:column}.chip{display:none}.network-showcase{padding:24px 18px;border-radius:24px}}
        @media(prefers-reduced-motion:reduce){
          .transmission-image img{animation:none}
        }
        @media(max-width:520px){.hero-copy{padding:30px 14px}.actions,.final-actions{flex-direction:column}.primary,.secondary{width:100%}.planet-zone{min-height:390px}.genesis-world{width:94%;min-height:390px}.planet-core{width:62%}.bubo-transmission{right:0;bottom:0;width:96%;grid-template-columns:74px 1fr}.transmission-image{width:74px;height:74px}.community{padding:30px 20px}}
      `}),e.jsxs(m.section,{className:"hero",variants:y,transition:{duration:.7},onMouseMove:o,onMouseLeave:()=>p({x:0,y:0}),children:[e.jsx("div",{className:"pointer",style:{left:`calc(${50+d.x*75}% - 180px)`,top:`calc(${50+d.y*75}% - 180px)`}}),e.jsxs("div",{className:"hero-copy",children:[e.jsxs("div",{className:"eyebrow",children:[e.jsx("span",{className:"dot"}),i("home.hero.eyebrow")]}),e.jsxs("h1",{children:[i("home.hero.titlePrefix"),e.jsx("strong",{children:i("home.hero.titleHighlight")})]}),e.jsx("p",{children:i("home.hero.description")}),e.jsxs("div",{className:"actions",children:[e.jsxs(j,{className:"primary",to:"/missions",children:[i("home.hero.primaryAction")," ",e.jsx(W,{size:18})]}),e.jsxs(j,{className:"secondary",to:"/galaxy",children:[i("home.hero.secondaryAction")," ",e.jsx(z,{size:17})]})]}),e.jsxs("div",{className:"signal",children:[e.jsx("span",{className:"dot"}),i("home.hero.liveSignal")]})]}),e.jsx("div",{className:"planet-zone",children:e.jsxs("div",{className:"planet-system",style:{transform:a?void 0:`rotateX(${d.y*-8}deg) rotateY(${d.x*10}deg) translate3d(${d.x*12}px,${d.y*9}px,0)`},children:[e.jsx("div",{className:"halo"}),e.jsx("div",{className:"orbit orbit-a",children:e.jsx("span",{className:"particle"})}),e.jsx("div",{className:"orbit orbit-b"}),e.jsx("div",{className:"orbit orbit-c"}),e.jsxs("div",{className:"genesis-world",children:[e.jsx("div",{className:"planet-atmosphere"}),e.jsxs("div",{className:"planet-core",children:[e.jsx("span",{className:"planet-light"}),e.jsx("span",{className:"planet-shadow"}),e.jsx("span",{className:"planet-label",children:i("home.hero.planetLabel")})]}),e.jsxs("div",{className:"glass bubo-transmission",children:[e.jsx("div",{className:"transmission-image",children:e.jsx("img",{src:"/images/bobu/avatar.png",alt:i("home.hero.transmissionAlt")})}),e.jsxs("div",{className:"transmission-copy",children:[e.jsx("span",{children:i("home.hero.transmissionLabel")}),e.jsx("strong",{children:i("home.hero.transmissionTitle")}),e.jsxs("p",{children:["“",i("home.hero.transmissionText"),"”"]})]})]})]}),e.jsxs("div",{className:"chip chip-a",children:[e.jsx(_,{size:15}),i("home.hero.signalStable")]}),e.jsxs("div",{className:"chip chip-b",children:[e.jsx(J,{size:15}),i("home.hero.sectorOnline")]}),e.jsxs("div",{className:"sector",children:[e.jsx(z,{size:14}),i("home.hero.sectorStatus")]})]})})]}),e.jsx(ne,{buildersJoined:n.buildersJoined,gpGenerated:n.gpGenerated,newBuildersThisWeek:n.newBuildersThisWeek}),e.jsxs(m.section,{className:"glass network-showcase",variants:y,children:[e.jsxs("div",{className:"network-copy",children:[e.jsxs("div",{className:"eyebrow",children:[e.jsx(I,{size:15}),i("home.network.eyebrow")]}),e.jsx("h2",{children:i("home.network.title")}),e.jsx("p",{children:i("home.network.description")}),e.jsx("div",{className:"network-features",children:ve.map(([s,t])=>e.jsxs("div",{className:"network-feature",children:[e.jsx(t,{size:17}),e.jsx("span",{children:i(s)})]},s))}),e.jsxs("div",{className:"store-actions",children:[e.jsxs("div",{className:"store-card is-disabled","aria-disabled":"true",children:[e.jsx(I,{size:24}),e.jsxs("span",{children:[e.jsx("small",{children:i("home.network.comingSoon")}),e.jsx("strong",{children:i("home.network.appStore")})]})]}),e.jsxs("div",{className:"store-card is-disabled","aria-disabled":"true",children:[e.jsx(X,{size:24}),e.jsxs("span",{children:[e.jsx("small",{children:i("home.network.comingSoon")}),e.jsx("strong",{children:i("home.network.googlePlay")})]})]})]}),e.jsx("p",{className:"network-release",children:i("home.network.release")})]}),e.jsx("div",{className:"network-visual",children:e.jsxs("div",{className:"network-image-shell",children:[e.jsx("img",{src:"/images/bobu-network/bobu-network-official-brand-board.png",alt:i("home.network.imageAlt")}),e.jsxs("div",{className:"network-badge",children:[e.jsx("span",{className:"dot"}),i("home.network.officialApp")]})]})})]}),e.jsx(de,{}),e.jsx(pe,{builderCount:n.buildersJoined,galaxiesCreated:n.galaxiesCreated,newBuildersThisWeek:n.newBuildersThisWeek}),e.jsx(m.section,{className:"stats",variants:y,children:r.map(s=>{const t=s.icon,c="decimals"in s&&typeof s.decimals=="number"?s.decimals:0;return e.jsxs("article",{className:"glass stat",children:[e.jsx("div",{className:"stat-icon",children:e.jsx(t,{size:20})}),e.jsx("strong",{children:e.jsx(je,{value:s.value,suffix:s.suffix,decimals:c})}),e.jsx("span",{children:i(s.labelKey)})]},s.labelKey)})}),e.jsxs(m.section,{className:"glass transmission",variants:y,children:[e.jsxs("div",{children:[e.jsx("div",{className:"eyebrow",children:i("home.transmission.eyebrow")}),e.jsxs("h2",{children:["“",i("home.transmission.quote"),"”"]}),e.jsxs("p",{children:["“",i("home.transmission.reply"),"”"]})]}),e.jsx("em",{children:i("home.transmission.author")})]}),e.jsxs(m.section,{className:"section",variants:y,children:[e.jsxs("header",{className:"section-header",children:[e.jsxs("div",{children:[e.jsxs("div",{className:"eyebrow",children:[e.jsx(U,{size:15}),i("home.missions.eyebrow")]}),e.jsx("h2",{children:i("home.missions.title")}),e.jsx("p",{children:i("home.missions.description")})]}),e.jsxs(j,{className:"text-link",to:"/missions",children:[i("home.missions.viewAll")," ",e.jsx(C,{size:17})]})]}),e.jsx("div",{className:"mission-grid",children:ue.map(({code:s,titleKey:t,descriptionKey:c,rewardKey:x,icon:b,soon:f})=>e.jsxs("article",{className:`glass mission-card ${f?"soon":""}`,children:[e.jsxs("div",{className:"mission-top",children:[e.jsx("div",{className:"mission-icon",children:e.jsx(b,{size:22})}),e.jsx("span",{className:"status",children:i(f?"home.missions.status.comingSoon":"home.missions.status.active")})]}),e.jsx("small",{children:s}),e.jsx("h3",{children:i(t)}),e.jsx("p",{children:i(c)}),e.jsxs("footer",{className:"mission-footer",children:[e.jsxs("span",{children:[e.jsx(v,{size:15})," ",i(x)]}),e.jsx(C,{size:17})]})]},s))})]}),e.jsxs(m.section,{className:"section",variants:y,children:[e.jsxs("header",{className:"section-header",children:[e.jsxs("div",{children:[e.jsxs("div",{className:"eyebrow",children:[e.jsx(ee,{size:15}),i("home.roadmap.eyebrow")]}),e.jsx("h2",{children:i("home.roadmap.title")}),e.jsx("p",{children:i("home.roadmap.description")})]}),e.jsxs(j,{className:"text-link",to:"/galaxy",children:[i("home.roadmap.openMap")," ",e.jsx(C,{size:17})]})]}),e.jsxs("div",{className:"roadmap",children:[e.jsxs("article",{className:"glass roadmap-intro",children:[e.jsx(R,{size:30}),e.jsx("h3",{children:i("home.roadmap.introTitle")}),e.jsx("p",{children:i("home.roadmap.introDescription")}),e.jsxs("div",{className:"progress",children:[e.jsx("div",{className:"eyebrow",children:i("home.roadmap.progress")}),e.jsx("div",{className:"track",children:e.jsx("div",{className:"fill"})})]})]}),e.jsx("div",{className:"timeline",children:fe.map(([s,t,c,x])=>e.jsxs("article",{className:"glass timeline-card",children:[e.jsx("div",{className:`marker ${x?"done":""}`,children:x?e.jsx(ie,{size:19}):e.jsx(ae,{size:15})}),e.jsxs("div",{children:[e.jsx("small",{children:i(s)}),e.jsx("h4",{children:i(t)}),e.jsx("p",{children:i(c)})]}),e.jsx("strong",{children:i(x?"home.roadmap.status.online":"home.roadmap.status.planned")})]},s))})]})]}),e.jsx(m.section,{className:"section glass community",variants:y,children:e.jsxs("div",{className:"community-grid",children:[e.jsxs("div",{children:[e.jsxs("div",{className:"eyebrow",children:[e.jsx(k,{size:15}),i("home.community.eyebrow")]}),e.jsx("h2",{children:i("home.community.title")}),e.jsx("p",{children:i("home.community.description")}),e.jsx("div",{className:"actions",children:e.jsxs(j,{className:"primary",to:"/missions",children:[i("home.community.beginJourney")," ",e.jsx(re,{size:17})]})})]}),e.jsx("div",{className:"benefits",children:ye.map(([s,t,c])=>e.jsxs("article",{className:"benefit",children:[e.jsx("div",{className:"benefit-icon",children:e.jsx(c,{size:20})}),e.jsxs("div",{children:[e.jsx("h4",{children:i(s)}),e.jsx("p",{children:i(t)})]})]},s))})]})}),e.jsxs(m.section,{className:"final",variants:y,children:[e.jsx("div",{className:"eyebrow",children:i("home.final.eyebrow")}),e.jsx("h2",{children:i("home.final.title")}),e.jsx("p",{children:i("home.final.description")}),e.jsxs("div",{className:"final-actions",children:[e.jsxs(j,{className:"primary",to:"/missions",children:[i("home.final.primaryAction")," ",e.jsx(U,{size:17})]}),e.jsxs(j,{className:"secondary",to:"/genesis",children:[i("home.final.secondaryAction")," ",e.jsx(L,{size:17})]})]})]})]})]})}export{Ae as Home};
