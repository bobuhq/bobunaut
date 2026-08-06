import{r as t,j as a}from"./vendor-react-Db_inLa4.js";import{u as $,c as P}from"./index-BRO6E1Mc.js";import{g as u}from"./GalaxyService-r9OlJZwp.js";import{m as p}from"./vendor-motion-DZA6fOcq.js";import{S as R,D as U,Q as O}from"./vendor-icons-JbKY7JUy.js";import"./vendor-C2bh2AFn.js";import"./vendor-supabase-BRUXfWZX.js";const Q={violet:{name:"violet",glowColor:"#A855F7",ringColor:"rgba(168, 85, 247, 0.42)",lineColor:"rgba(168, 85, 247, 0.55)",textAccent:"#D8B4FE",nodeGradient:"linear-gradient(135deg, rgba(168,85,247,0.95), rgba(91,33,182,0.92))",auraGradient:"radial-gradient(circle, rgba(168,85,247,0.34), rgba(168,85,247,0.04) 70%, transparent 100%)"},blue:{name:"blue",glowColor:"#3B82F6",ringColor:"rgba(59, 130, 246, 0.42)",lineColor:"rgba(59, 130, 246, 0.55)",textAccent:"#BFDBFE",nodeGradient:"linear-gradient(135deg, rgba(59,130,246,0.95), rgba(29,78,216,0.92))",auraGradient:"radial-gradient(circle, rgba(59,130,246,0.30), rgba(59,130,246,0.04) 70%, transparent 100%)"},cyan:{name:"cyan",glowColor:"#22D3EE",ringColor:"rgba(34, 211, 238, 0.42)",lineColor:"rgba(34, 211, 238, 0.55)",textAccent:"#CFFAFE",nodeGradient:"linear-gradient(135deg, rgba(34,211,238,0.95), rgba(8,145,178,0.92))",auraGradient:"radial-gradient(circle, rgba(34,211,238,0.30), rgba(34,211,238,0.04) 70%, transparent 100%)"},green:{name:"green",glowColor:"#22C55E",ringColor:"rgba(34, 197, 94, 0.42)",lineColor:"rgba(34, 197, 94, 0.55)",textAccent:"#BBF7D0",nodeGradient:"linear-gradient(135deg, rgba(34,197,94,0.95), rgba(21,128,61,0.92))",auraGradient:"radial-gradient(circle, rgba(34,197,94,0.30), rgba(34,197,94,0.04) 70%, transparent 100%)"},lime:{name:"lime",glowColor:"#84CC16",ringColor:"rgba(132, 204, 22, 0.42)",lineColor:"rgba(132, 204, 22, 0.55)",textAccent:"#D9F99D",nodeGradient:"linear-gradient(135deg, rgba(132,204,22,0.95), rgba(77,124,15,0.92))",auraGradient:"radial-gradient(circle, rgba(132,204,22,0.30), rgba(132,204,22,0.04) 70%, transparent 100%)"},yellow:{name:"yellow",glowColor:"#FACC15",ringColor:"rgba(250, 204, 21, 0.42)",lineColor:"rgba(250, 204, 21, 0.55)",textAccent:"#FEF08A",nodeGradient:"linear-gradient(135deg, rgba(250,204,21,0.95), rgba(202,138,4,0.92))",auraGradient:"radial-gradient(circle, rgba(250,204,21,0.30), rgba(250,204,21,0.04) 70%, transparent 100%)"},gold:{name:"gold",glowColor:"#F59E0B",ringColor:"rgba(245, 158, 11, 0.42)",lineColor:"rgba(245, 158, 11, 0.55)",textAccent:"#FDE68A",nodeGradient:"linear-gradient(135deg, rgba(245,158,11,0.98), rgba(180,83,9,0.92))",auraGradient:"radial-gradient(circle, rgba(245,158,11,0.34), rgba(245,158,11,0.04) 70%, transparent 100%)"},orange:{name:"orange",glowColor:"#F97316",ringColor:"rgba(249, 115, 22, 0.42)",lineColor:"rgba(249, 115, 22, 0.55)",textAccent:"#FED7AA",nodeGradient:"linear-gradient(135deg, rgba(249,115,22,0.95), rgba(194,65,12,0.92))",auraGradient:"radial-gradient(circle, rgba(249,115,22,0.30), rgba(249,115,22,0.04) 70%, transparent 100%)"},red:{name:"red",glowColor:"#EF4444",ringColor:"rgba(239, 68, 68, 0.42)",lineColor:"rgba(239, 68, 68, 0.55)",textAccent:"#FECACA",nodeGradient:"linear-gradient(135deg, rgba(239,68,68,0.95), rgba(185,28,28,0.92))",auraGradient:"radial-gradient(circle, rgba(239,68,68,0.30), rgba(239,68,68,0.04) 70%, transparent 100%)"},magenta:{name:"magenta",glowColor:"#EC4899",ringColor:"rgba(236, 72, 153, 0.42)",lineColor:"rgba(236, 72, 153, 0.55)",textAccent:"#FBCFE8",nodeGradient:"linear-gradient(135deg, rgba(236,72,153,0.95), rgba(190,24,93,0.92))",auraGradient:"radial-gradient(circle, rgba(236,72,153,0.30), rgba(236,72,153,0.04) 70%, transparent 100%)"}},I=["blue","green","magenta","cyan","orange","violet"],X=l=>{const e=I[l%I.length];return Q[e]};function _(){const{language:l,t:e}=$(),i=P(),[s,f]=t.useState([]),[v,w]=t.useState([]),[d,j]=t.useState(null),[F,C]=t.useState(!0),[k,N]=t.useState(null),[S,G]=t.useState(null),[B,b]=t.useState(!1);t.useEffect(()=>{let r=!0;return(async()=>{C(!0),N(null);try{const[o,y,D]=await Promise.all([u.loadMyGalaxy(),u.loadMyMiningTeam().catch(h=>(console.error("Mining Team status could not be loaded:",h),[])),u.loadMyInviter().catch(h=>(console.error(e("galaxy.error.inviterLoad"),h),null))]);r&&(f(o),w(y),j(D))}catch(o){console.error(e("galaxy.error.dataLoad"),o),r&&(f([]),w([]),j(null),N(e("galaxy.error.dataLoad")))}finally{r&&C(!1)}})(),()=>{r=!1}},[i.id]);const c=i.inviteCode&&i.inviteCode!=="BOBU-GENESIS"?new URL(`join/${encodeURIComponent(i.inviteCode)}`,window.location.origin+"/").toString():null,m=t.useMemo(()=>new Map(v.map(r=>[r.builderId,r.isMiningActive])),[v]),g=s.filter(r=>m.get(r.builderId)===!0).length,E=Math.max(0,s.length-g),z=Math.max(0,10-g),x=t.useMemo(()=>s.map((r,n)=>({builderId:r.builderId,parentBuilderId:r.parentBuilderId,depth:r.depth,name:r.displayName??r.username??`Builder ${r.builderId.slice(0,6)}`,builders:r.referralCount,gp:r.gp,status:m.get(r.builderId)===!0?"active":"pending",theme:X(n)})),[s,m]),A=t.useMemo(()=>{const r=new Map;for(const n of x){const o=r.get(n.parentBuilderId)??[];o.push(n),r.set(n.parentBuilderId,o)}return r},[x]),L=t.useMemo(()=>new Map(x.map((r,n)=>[r.builderId,n])),[x]),M=r=>{const n=A.get(r.builderId)??[],o=L.get(r.builderId)??0;return a.jsxs(p.div,{className:"galaxy-tree-branch",style:{"--branch-color":r.theme.lineColor},initial:{opacity:0,y:14},animate:{opacity:1,y:0},transition:{delay:.05+Math.min(r.depth,8)*.06,duration:.38},children:[a.jsxs("article",{className:`galaxy-member-card ${S===r.builderId?"selected":""}`,style:{"--node-gradient":r.theme.nodeGradient,"--node-glow":r.theme.glowColor,"--node-ring":r.theme.ringColor,"--node-text":r.theme.textAccent,opacity:r.status==="active"?1:.66},onClick:()=>G(r.builderId),children:[a.jsx("div",{className:"galaxy-member-icon",children:a.jsx("img",{className:`bobu-tone-${o%4}`,src:"/images/galaxy/bobu-builder-space.webp",alt:`${r.name} BOBU`})}),a.jsx("strong",{children:r.name}),a.jsxs("div",{className:"galaxy-member-meta",children:[r.gp.toLocaleString(l)," GP"," · ",r.builders," Builders"]}),a.jsx("span",{className:`galaxy-member-status ${r.status==="active"?"":"pending"}`,children:r.status==="active"?e("galaxy.status.active"):e("galaxy.status.pending")})]}),n.length>0&&a.jsx("div",{className:"galaxy-children",children:n.map(y=>M(y))})]},r.builderId)},T=async()=>{if(c)try{await navigator.clipboard.writeText(c),b(!0),window.setTimeout(()=>{b(!1)},1800)}catch{b(!1)}};return a.jsxs(p.div,{className:"my-galaxy-page",initial:{opacity:0,y:16},animate:{opacity:1,y:0},transition:{duration:.55},children:[a.jsx("style",{children:`
        .my-galaxy-page {
          width: min(1520px, calc(100% - 22px));
          margin: 0 auto;
          padding: 112px 0 60px;
          color: white;
        }

        .galaxy-shell {
          display: grid;
          grid-template-columns:
            285px minmax(0, 1fr);
          min-height: 760px;
          overflow: hidden;
          border:
            1px solid rgba(132, 108, 255, 0.24);
          border-radius: 26px;
          background:
            radial-gradient(
              circle at 65% 22%,
              rgba(72, 87, 255, 0.12),
              transparent 32%
            ),
            linear-gradient(
              145deg,
              rgba(12, 14, 39, 0.97),
              rgba(5, 9, 25, 0.98)
            );
          box-shadow:
            0 34px 100px rgba(0, 0, 0, 0.46),
            inset 0 1px
              rgba(255, 255, 255, 0.04);
        }

        .galaxy-sidebar {
          display: flex;
          align-self: start;
          flex-direction: column;
          min-height: 760px;
          padding: 22px 18px;
          border-right:
            1px solid rgba(133, 145, 222, 0.12);
          background:
            linear-gradient(
              180deg,
              rgba(24, 22, 62, 0.7),
              rgba(8, 11, 31, 0.72)
            );
        }

        .galaxy-profile {
          padding-bottom: 22px;
          border-bottom:
            1px solid rgba(133, 145, 222, 0.12);
          text-align: center;
        }

        .galaxy-avatar {
          display: grid;
          overflow: hidden;
          width: 154px;
          height: 154px;
          margin: 0 auto 16px;
          place-items: center;
          border:
            2px solid rgba(191, 108, 255, 0.72);
          border-radius: 50%;
          color: #ffe598;
          background:
            radial-gradient(
              circle at 35% 25%,
              rgba(255, 229, 129, 0.95),
              rgba(150, 84, 250, 0.92) 48%,
              rgba(38, 21, 91, 0.98)
            );
          box-shadow:
            0 0 24px rgba(255, 193, 77, 0.3),
            0 0 44px rgba(128, 91, 255, 0.28);
        }

        .galaxy-avatar img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .galaxy-profile h2 {
          margin: 0;
          overflow: hidden;
          font-size: 1.65rem;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .galaxy-profile p {
          margin: 5px 0 0;
          color: rgba(218, 224, 255, 0.48);
          font-size: 1.05rem;
        }

        .galaxy-rank {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          margin-top: 12px;
          padding: 7px 10px;
          border:
            1px solid rgba(255, 210, 101, 0.18);
          border-radius: 999px;
          color: #ffdf85;
          background: rgba(170, 108, 26, 0.12);
          font-size: 0.64rem;
          font-weight: 800;
        }

        .galaxy-side-stats {
          display: grid;
          gap: 9px;
          margin-top: 20px;
        }

        .galaxy-side-stat {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding: 11px 12px;
          border:
            1px solid rgba(129, 145, 225, 0.1);
          border-radius: 12px;
          background: rgba(255, 255, 255, 0.025);
        }

        .galaxy-side-stat span {
          color: rgba(218, 224, 255, 0.5);
          font-size: 0.64rem;
        }

        .galaxy-side-stat strong {
          max-width: 130px;
          overflow: hidden;
          font-size: 0.76rem;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .galaxy-invite {
          margin-top: auto;
          padding-top: 20px;
        }

        .galaxy-invite h3 {
          margin: 0 0 6px;
          font-size: 0.8rem;
        }

        .galaxy-invite p {
          margin: 0;
          color: rgba(218, 224, 255, 0.48);
          font-size: 0.63rem;
          line-height: 1.45;
        }

        .galaxy-referral-box {
          display: flex;
          align-items: center;
          gap: 7px;
          margin-top: 12px;
          padding: 7px;
          border:
            1px solid rgba(108, 201, 255, 0.16);
          border-radius: 11px;
          background: rgba(0, 0, 0, 0.2);
        }

        .galaxy-referral-box code {
          min-width: 0;
          overflow: hidden;
          flex: 1;
          color: #b9d9ff;
          font-size: 0.57rem;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .galaxy-copy {
          display: grid;
          width: 32px;
          height: 32px;
          flex: 0 0 auto;
          place-items: center;
          border:
            1px solid rgba(97, 213, 255, 0.23);
          border-radius: 9px;
          color: #9be8ff;
          cursor: pointer;
          background: rgba(54, 151, 194, 0.11);
        }

        .galaxy-copy:disabled {
          cursor: not-allowed;
          opacity: 0.4;
        }

        .galaxy-main {
          min-width: 0;
          padding: 18px 22px 22px;
        }

        .galaxy-topbar {
          display: grid;
          grid-template-columns:
            repeat(4, minmax(0, 1fr));
          overflow: hidden;
          border:
            1px solid rgba(135, 145, 220, 0.12);
          border-radius: 17px;
          background: rgba(255, 255, 255, 0.025);
        }

        .galaxy-top-stat {
          min-width: 0;
          padding: 19px 24px;
          border-right:
            1px solid rgba(135, 145, 220, 0.1);
        }

        .galaxy-top-stat:last-child {
          border-right: 0;
        }

        .galaxy-top-stat span {
          display: block;
          color: rgba(217, 223, 255, 0.48);
          font-size: 0.72rem;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }

        .galaxy-top-stat strong {
          display: block;
          margin-top: 7px;
          font-size: 1.55rem;
        }

        .galaxy-network {
          position: relative;
          min-height: 520px;
          margin-top: 14px;
          padding: 18px 22px 20px;
          overflow: auto;
          border:
            1px solid rgba(135, 145, 220, 0.12);
          border-radius: 20px;
          background:
            radial-gradient(
              ellipse at 50% 20%,
              rgba(214, 76, 255, 0.26),
              transparent 27%
            ),
            radial-gradient(
              ellipse at 25% 58%,
              rgba(38, 117, 255, 0.19),
              transparent 31%
            ),
            radial-gradient(
              ellipse at 77% 59%,
              rgba(255, 55, 190, 0.18),
              transparent 31%
            ),
            radial-gradient(
              circle at 50% 50%,
              rgba(92, 55, 205, 0.15),
              transparent 55%
            ),
            linear-gradient(
              180deg,
              rgba(5, 7, 28, 0.54),
              rgba(3, 5, 20, 0.78)
            );
        }

        .galaxy-network-heading {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
        }

        .galaxy-network-heading h1 {
          margin: 0;
          font-size: clamp(1rem, 2vw, 1.35rem);
        }

        .galaxy-network-heading p {
          margin: 5px 0 0;
          color: rgba(217, 223, 255, 0.48);
          font-size: 0.66rem;
        }

        .galaxy-online {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          color: #78ffc0;
          font-size: 0.64rem;
          font-weight: 800;
          white-space: nowrap;
        }

        .galaxy-online::before {
          content: "";
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: currentColor;
          box-shadow: 0 0 10px currentColor;
        }

        .galaxy-tree {
          display: flex;
          min-width: 760px;
          flex-direction: column;
          align-items: center;
          padding: 12px 20px 6px;
        }

        .galaxy-root-card {
          display: grid;
          width: 190px;
          min-height: 205px;
          place-items: center;
          border: 0;
          border-radius: 0;
          text-align: center;
          cursor: pointer;
          background: transparent;
          box-shadow: none;
        }

        .galaxy-root-image {
          width: 150px;
          height: 150px;
          margin: 0 auto 10px;
          border: 3px solid rgba(211, 104, 255, 0.82);
          border-radius: 50%;
          object-fit: cover;
          box-shadow:
            0 0 0 8px rgba(125, 76, 255, 0.1),
            0 0 30px rgba(210, 84, 255, 0.68),
            0 0 62px rgba(111, 81, 255, 0.48);
        }

        .galaxy-root-card strong {
          display: block;
          max-width: 165px;
          margin-top: 5px;
          overflow: hidden;
          font-size: 0.82rem;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .galaxy-root-card span {
          display: block;
          margin-top: 3px;
          color: #e8ddff;
          font-size: 0.66rem;
          letter-spacing: 0.11em;
        }

        .galaxy-tree-trunk {
          width: 1px;
          height: 44px;
          background:
            linear-gradient(
              rgba(255, 198, 77, 0.72),
              rgba(109, 90, 255, 0.62)
            );
          box-shadow:
            0 0 10px rgba(118, 88, 255, 0.58);
        }

        .galaxy-forest {
          position: relative;
          display: flex;
          width: max-content;
          min-width: 100%;
          align-items: flex-start;
          justify-content: center;
          gap: 34px;
          padding: 30px 28px 10px;
        }

        .galaxy-forest::before {
          content: "";
          position: absolute;
          top: 0;
          left: 8%;
          width: 84%;
          height: 2px;
          background:
            linear-gradient(
              90deg,
              transparent,
              rgba(101, 205, 255, 0.62) 12%,
              rgba(138, 101, 255, 0.72) 50%,
              rgba(101, 205, 255, 0.62) 88%,
              transparent
            );
          box-shadow:
            0 0 12px rgba(101, 205, 255, 0.42);
        }

        .galaxy-tree-branch {
          position: relative;
          display: flex;
          flex-direction: column;
          align-items: center;
          flex: 0 0 auto;
        }

        .galaxy-tree-branch::before {
          content: "";
          position: absolute;
          top: -30px;
          left: 50%;
          width: 2px;
          height: 30px;
          background: var(--branch-color);
          box-shadow:
            0 0 10px var(--branch-color);
          transform: translateX(-50%);
        }

        .galaxy-children {
          position: relative;
          display: flex;
          align-items: flex-start;
          justify-content: center;
          gap: 26px;
          margin-top: 18px;
          padding: 38px 14px 0;
        }

        .galaxy-children::before {
          content: "";
          position: absolute;
          top: 0;
          left: 10%;
          width: 80%;
          height: 2px;
          background:
            linear-gradient(
              90deg,
              transparent,
              var(--branch-color),
              transparent
            );
          box-shadow:
            0 0 10px var(--branch-color);
          opacity: 0.68;
        }

        .galaxy-children >
        .galaxy-tree-branch::before {
          top: -38px;
          height: 38px;
        }

        .galaxy-member-card {
          display: grid;
          width: 126px;
          min-height: 150px;
          justify-items: center;
          align-content: start;
          padding: 0;
          border: 0;
          border-radius: 0;
          text-align: center;
          cursor: pointer;
          background: transparent;
          box-shadow: none;
          transition:
            transform 180ms ease,
            filter 180ms ease;
        }

        .galaxy-member-card:hover {
          filter: brightness(1.15);
          transform: translateY(-3px);
        }

        .galaxy-member-card.selected
        .galaxy-member-icon {
          border-color: rgba(255, 255, 255, 0.95);
          box-shadow:
            0 0 0 5px rgba(116, 91, 255, 0.12),
            0 0 28px var(--node-glow);
        }

        .galaxy-member-icon {
          width: 92px;
          height: 92px;
          margin: 0 auto 10px;
          overflow: hidden;
          border: 2px solid var(--node-ring);
          border-radius: 50%;
          background: var(--node-gradient);
          box-shadow:
            0 0 16px var(--node-glow),
            0 0 32px
              color-mix(
                in srgb,
                var(--node-glow) 36%,
                transparent
              );
        }

        .galaxy-member-icon img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          transition: filter 180ms ease;
        }

        .bobu-tone-0 {
          filter:
            hue-rotate(35deg)
            saturate(1.35)
            brightness(1.05);
        }

        .bobu-tone-1 {
          filter:
            hue-rotate(105deg)
            saturate(1.45)
            brightness(1.04);
        }

        .bobu-tone-2 {
          filter:
            hue-rotate(310deg)
            saturate(1.45)
            brightness(1.06);
        }

        .bobu-tone-3 {
          filter:
            hue-rotate(150deg)
            saturate(1.5)
            brightness(1.08);
        }

        .galaxy-member-card strong {
          display: block;
          width: 126px;
          overflow: hidden;
          color: white;
          font-size: 0.76rem;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .galaxy-member-meta {
          margin-top: 6px;
          color: rgba(220, 226, 255, 0.48);
          font-size: 0.55rem;
        }

        .galaxy-member-status {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          margin-top: 6px;
          color: #70ffc0;
          font-size: 0.62rem;
          font-weight: 800;
          text-transform: uppercase;
        }

        .galaxy-member-status::before {
          content: "";
          width: 5px;
          height: 5px;
          border-radius: 50%;
          background: currentColor;
          box-shadow: 0 0 7px currentColor;
        }

        .galaxy-member-status.pending {
          color: #ffc76d;
        }

        .galaxy-empty {
          margin-top: 28px;
          padding: 20px;
          border:
            1px dashed rgba(131, 143, 209, 0.18);
          border-radius: 14px;
          color: rgba(220, 225, 255, 0.5);
          text-align: center;
          font-size: 0.67rem;
        }

        .galaxy-footer-grid {
          display: grid;
          grid-template-columns: 0.9fr 1.6fr;
          gap: 16px;
          margin-top: 12px;
        }

        .galaxy-footer-card {
          padding: 17px;
          border:
            1px solid rgba(135, 145, 220, 0.12);
          border-radius: 17px;
          background: rgba(255, 255, 255, 0.025);
        }

        .galaxy-footer-card h3 {
          margin: 0;
          font-size: 0.76rem;
        }

        .galaxy-legend {
          display: flex;
          flex-wrap: wrap;
          gap: 14px;
          margin-top: 13px;
        }

        .galaxy-legend span {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          color: rgba(220, 226, 255, 0.54);
          font-size: 0.61rem;
        }

        .galaxy-legend i {
          position: relative;
          display: inline-grid;
          width: 22px;
          height: 22px;
          place-items: center;
          border: 1px solid currentColor;
          border-radius: 7px;
          background:
            color-mix(
              in srgb,
              currentColor 14%,
              transparent
            );
          box-shadow: 0 0 12px currentColor;
        }

        .galaxy-legend i::after {
          content: "✦";
          color: currentColor;
          font-size: 0.72rem;
          line-height: 1;
        }

        .galaxy-legend span:nth-child(1) i::after {
          content: "●";
        }

        .galaxy-legend span:nth-child(2) i::after {
          content: "○";
        }

        .galaxy-legend span:nth-child(3) i::after {
          content: "⚡";
        }

        .galaxy-summary {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 10px;
          margin-top: 13px;
        }

        .galaxy-summary div {
          padding: 10px;
          border-radius: 11px;
          background: rgba(255, 255, 255, 0.025);
        }

        .galaxy-summary span {
          display: block;
          color: rgba(220, 226, 255, 0.46);
          font-size: 0.55rem;
        }

        .galaxy-summary strong {
          display: block;
          margin-top: 5px;
          font-size: 0.75rem;
        }

        .galaxy-inviter-card {
          position: relative;
          z-index: 2;
          margin: 0 auto;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 14px;
          text-align: center;
          background: transparent;
          border: none;
          box-shadow: none;
          padding: 0;
        }

        .galaxy-inviter-card img {
          width: 74px;
          height: 74px;
          object-fit: cover;
          border-radius: 50%;
          border: 3px solid rgba(171, 128, 255, 0.72);
          box-shadow:
            0 0 18px rgba(160, 110, 255, 0.55),
            0 0 42px rgba(110, 70, 255, 0.35),
            inset 0 0 18px rgba(255,255,255,0.12);
        }

        .galaxy-inviter-card strong {
          color: #f4f6ff;
          font-size: 0.94rem;
          line-height: 1.25;
        }

        .galaxy-inviter-card small {
          color: rgba(207, 213, 255, 0.68);
          font-size: 0.72rem;
        }

        .galaxy-inviter-label {
          color: rgba(173, 188, 255, 0.86);
          font-size: 0.63rem;
          font-weight: 800;
          letter-spacing: 0.15em;
          text-transform: uppercase;
        }

        .galaxy-inviter-line {
          width: 1px;
          height: 30px;
          margin: 0 auto;
          background:
            linear-gradient(
              to bottom,
              rgba(137, 158, 255, 0.7),
              rgba(137, 158, 255, 0.18)
            );
          box-shadow:
            0 0 10px rgba(105, 130, 255, 0.34);
        }

        

        .galaxy-root-image-compact {
          width: 84px !important;
          height: 84px !important;
        }

@media (max-width: 980px) {
          .galaxy-shell {
            grid-template-columns: 1fr;
          }

          .galaxy-sidebar {
            border-right: 0;
            border-bottom:
              1px solid rgba(133, 145, 222, 0.12);
          }

          .galaxy-side-stats {
            grid-template-columns: repeat(3, 1fr);
          }

          .galaxy-invite {
            margin-top: 18px;
          }
        }

        @media (max-width: 720px) {
          .my-galaxy-page {
            width: min(100% - 16px, 1440px);
            padding-top: 104px;
          }

          .galaxy-main {
            padding: 13px;
          }

          .galaxy-topbar {
            grid-template-columns: repeat(2, 1fr);
          }

          .galaxy-top-stat:nth-child(2) {
            border-right: 0;
          }

          .galaxy-top-stat:nth-child(-n + 2) {
            border-bottom:
              1px solid rgba(135, 145, 220, 0.1);
          }

          .galaxy-network-heading {
            align-items: flex-start;
            flex-direction: column;
          }

          .galaxy-footer-grid {
            grid-template-columns: 1fr;
          }

          .galaxy-summary {
            grid-template-columns: 1fr;
          }

          .galaxy-side-stats {
            grid-template-columns: 1fr;
          }
        }
      `}),a.jsxs("section",{className:"galaxy-shell",children:[a.jsxs("aside",{className:"galaxy-sidebar",children:[a.jsxs("div",{className:"galaxy-profile",children:[a.jsx("div",{className:"galaxy-avatar",children:a.jsx("img",{src:"/images/galaxy/bobu-builder-space.webp",alt:e("galaxy.image.builderAlt")})}),a.jsx("h2",{children:i.username||e("galaxy.profile.genesisBuilder")}),a.jsx("p",{children:e("galaxy.profile.builderLevel",{level:i.level})}),a.jsxs("div",{className:"galaxy-rank",children:[a.jsx(R,{size:13}),e("galaxy.profile.nebulaRank",{level:i.level})]})]}),a.jsxs("div",{className:"galaxy-side-stats",children:[a.jsxs("div",{className:"galaxy-side-stat",children:[a.jsx("span",{children:e("galaxy.sidebar.personalGp")}),a.jsx("strong",{children:i.personalGp.toLocaleString(l)})]}),a.jsxs("div",{className:"galaxy-side-stat",children:[a.jsx("span",{children:e("galaxy.sidebar.pendingNetworkGp")}),a.jsx("strong",{children:i.pendingNetworkGp.toLocaleString(l)})]}),a.jsxs("div",{className:"galaxy-side-stat",children:[a.jsx("span",{children:e("galaxy.sidebar.eligibleNetworkGp")}),a.jsx("strong",{children:i.eligibleNetworkGp.toLocaleString(l)})]}),a.jsxs("div",{className:"galaxy-side-stat",children:[a.jsx("span",{children:e("galaxy.sidebar.totalGp")}),a.jsx("strong",{children:i.gp.toLocaleString(l)})]}),a.jsxs("div",{className:"galaxy-side-stat",children:[a.jsx("span",{children:e("galaxy.sidebar.inviteCode")}),a.jsx("strong",{children:i.inviteCode||"—"})]}),a.jsxs("div",{className:"galaxy-side-stat",children:[a.jsx("span",{children:e("galaxy.sidebar.activeCircle")}),a.jsx("strong",{children:g})]})]}),a.jsxs("div",{className:"galaxy-invite",children:[a.jsx("h3",{children:e("galaxy.invite.title")}),a.jsx("p",{children:e("galaxy.invite.description")}),a.jsxs("div",{className:"galaxy-referral-box",children:[a.jsx("code",{children:c||e("galaxy.invite.unavailable")}),a.jsx("button",{type:"button",className:"galaxy-copy",onClick:T,disabled:!c,"aria-label":e(B?"galaxy.invite.copiedAria":"galaxy.invite.copyAria"),children:B?a.jsx(U,{size:15}):a.jsx(O,{size:15})})]})]})]}),a.jsxs("main",{className:"galaxy-main",children:[a.jsxs("section",{className:"galaxy-topbar",children:[a.jsxs("div",{className:"galaxy-top-stat",children:[a.jsx("span",{children:e("galaxy.top.totalBuilders")}),a.jsx("strong",{children:s.length})]}),a.jsxs("div",{className:"galaxy-top-stat",children:[a.jsx("span",{children:e("galaxy.top.activeNow")}),a.jsx("strong",{children:g})]}),a.jsxs("div",{className:"galaxy-top-stat",children:[a.jsx("span",{children:e("galaxy.top.totalGp")}),a.jsx("strong",{children:i.gp.toLocaleString(l)})]}),a.jsxs("div",{className:"galaxy-top-stat",children:[a.jsx("span",{children:e("galaxy.top.rank")}),a.jsxs("strong",{children:["#",i.level]})]})]}),a.jsxs("section",{className:"galaxy-network",children:[a.jsxs("div",{className:"galaxy-network-heading",children:[a.jsxs("div",{children:[a.jsx("h1",{children:e("galaxy.network.title")}),a.jsx("p",{children:e("galaxy.network.description")})]}),a.jsx("span",{className:"galaxy-online",children:e("galaxy.network.online")})]}),a.jsxs("div",{className:"galaxy-tree",children:[d?a.jsxs(a.Fragment,{children:[a.jsxs(p.div,{className:"galaxy-inviter-card",initial:{opacity:0,y:-12},animate:{opacity:1,y:0},transition:{duration:.4},children:[a.jsx("span",{className:"galaxy-inviter-label",children:e("galaxy.network.invitedBy")}),a.jsx("img",{src:"/images/galaxy/bobu-builder-space.webp",alt:e("galaxy.image.inviterAlt")}),a.jsx("strong",{children:d.displayName??d.username??e("galaxy.network.builderFallback",{id:d.builderId.slice(0,6)})}),a.jsx("small",{children:e("galaxy.network.inviterMeta",{level:d.level,gp:d.gp.toLocaleString(l)})})]}),a.jsx("div",{className:"galaxy-inviter-line"})]}):null,a.jsx(p.div,{className:"galaxy-root-card",animate:{y:[0,-3,0]},transition:{duration:3,repeat:1/0},onClick:()=>G(null),children:a.jsxs("div",{children:[a.jsx("img",{className:"galaxy-root-image galaxy-root-image-compact",src:"/images/galaxy/bobu-builder-space.webp",alt:e("galaxy.image.kingAlt")}),a.jsx("strong",{children:i.username||e("galaxy.profile.kingBobu")}),a.jsx("span",{children:e("galaxy.profile.nebulaCore")})]})}),a.jsx("div",{className:"galaxy-tree-trunk"}),F?a.jsx("div",{className:"galaxy-empty",children:e("galaxy.network.loading")}):k?a.jsx("div",{className:"galaxy-empty",children:k}):x.length>0?a.jsx("div",{className:"galaxy-forest",children:(A.get(i.id)??[]).map(r=>M(r))}):a.jsx("div",{className:"galaxy-empty",children:e("galaxy.network.empty")})]})]}),a.jsxs("section",{className:"galaxy-footer-grid",children:[a.jsxs("article",{className:"galaxy-footer-card",children:[a.jsx("h3",{children:e("galaxy.footer.statusTitle")}),a.jsxs("div",{className:"galaxy-legend",children:[a.jsxs("span",{style:{color:"#70ffc0"},children:[a.jsx("i",{}),e("galaxy.footer.activeBuilder")]}),a.jsxs("span",{style:{color:"#ffc76d"},children:[a.jsx("i",{}),e("galaxy.footer.pendingActivation")]}),a.jsxs("span",{style:{color:"#8f7cff"},children:[a.jsx("i",{}),e("galaxy.footer.referralBranch")]})]})]}),a.jsxs("article",{className:"galaxy-footer-card",children:[a.jsx("h3",{children:e("galaxy.footer.summaryTitle")}),a.jsxs("div",{className:"galaxy-summary",children:[a.jsxs("div",{children:[a.jsx("span",{children:e("galaxy.footer.totalNetwork")}),a.jsx("strong",{children:e("galaxy.footer.builderCount",{count:s.length})})]}),a.jsxs("div",{children:[a.jsx("span",{children:e("galaxy.footer.verifiedConnections")}),a.jsx("strong",{children:g})]}),a.jsxs("div",{children:[a.jsx("span",{children:e("galaxy.footer.pendingBuilders")}),a.jsx("strong",{children:E})]}),a.jsxs("div",{children:[a.jsx("span",{children:e("galaxy.footer.nextLevel")}),a.jsx("strong",{children:z===0?e("galaxy.footer.ready"):e("galaxy.footer.remaining",{count:z})})]})]})]})]})]})]})]})}export{_ as Galaxy};
