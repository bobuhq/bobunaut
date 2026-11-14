import {build} from 'esbuild';
import {readFile,writeFile,mkdir,mkdtemp,rm} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {createServer} from 'node:http';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'/private/tmp/bobu-campus-browser/node_modules/playwright/index.mjs');
const root=process.cwd();
const baseline=process.env.CAMPUS_BASELINE||'35dd957ee6f01b1d562b816d3ad68de0b4063a1c';
const bundleDir=await mkdtemp(join(tmpdir(),'bobu-campus-render-'));
const out=root+'/docs/genesis-v11-cinematic';await mkdir(out,{recursive:true});
const entry=`import React,{Suspense} from 'react';import{createRoot}from'react-dom/client';import{Canvas,useThree}from'@react-three/fiber';import*as THREE from'three';
import{LanguageProvider}from'./src/core/language/LanguageProvider';
import{IntegratedResearchCampus}from'./src/core/mars/exploration/genesis-v5/IntegratedResearchCampus';
import{AresCommandHub}from'./src/core/mars/exploration/commandhub/AresCommandHub';
import{prepareIntegratedCampus,integratedReservations,INTEGRATED_LAYOUT,HUB_PLACEMENT}from'./src/core/mars/exploration/genesis-v5/integrated-campus.mjs';
import{loadAresGenesisTerrainData,sampleAresGenesisRenderedSurfaceMeters}from'./src/core/mars/exploration/engine/AresGenesisTerrainData';
const terrain=await loadAresGenesisTerrainData(),sample=(x,z)=>sampleAresGenesisRenderedSurfaceMeters(terrain,x,z);
const site=prepareIntegratedCampus({layout:INTEGRATED_LAYOUT,placement:HUB_PLACEMENT,reservations:integratedReservations(),sample,occupied:[],protectedRoutes:[],reservedCells:[],legalRegions:integratedReservations(),occupancyComplete:true,routesReserved:true,placementReserved:true});
const view=new URLSearchParams(location.search).get('view')||'overview';const views={overview:[[-105,60,5],[-48,0,-65]],approach:[[-44,1.8,-45],[-23,3,-63]],greenhouse:[[-93,8,-48],[-78,2,-72]]};const [eye,aim]=views[view];eye[1]+=sample(eye[0],eye[2]);aim[1]+=sample(aim[0],aim[2]);
function Camera(){const{camera,gl,scene}=useThree();React.useEffect(()=>{camera.position.set(...eye);camera.lookAt(...aim);camera.updateProjectionMatrix();window.scene=scene;window.camera=camera;window.renderer=gl;window.ready=true;},[]);return null;}
const ground=new THREE.PlaneGeometry(250,250,20,20);ground.rotateX(-Math.PI/2);const a=ground.attributes.position;for(let i=0;i<a.count;i++)a.setY(i,sample(a.getX(i)-37.5,a.getZ(i)-50));ground.computeVertexNormals();
createRoot(document.getElementById('root')).render(<LanguageProvider><Canvas camera={{fov:52,near:.1,far:1000}} gl={{preserveDrawingBuffer:true}}><color attach="background" args={['#8b6460']}/><hemisphereLight args={['#c0d9ef','#69483b',2]}/><directionalLight position={[-70,100,-15]} intensity={3}/><mesh geometry={ground} position={[-37.5,0,-50]}><meshStandardMaterial color="#82523e" roughness={1}/></mesh><Suspense fallback={null}><AresCommandHub targetRef={{current:null}} mission={null} onMission={()=>{}}/><IntegratedResearchCampus site={site}/></Suspense><Camera/></Canvas></LanguageProvider>);`;
for(const phase of ['before','after']){
 const result=await build({stdin:{contents:entry,resolveDir:root,loader:'tsx'},bundle:true,write:false,format:'esm',jsx:'automatic',define:{'import.meta.env.VITE_SUPABASE_URL':JSON.stringify('http://127.0.0.1:9'),'import.meta.env.VITE_SUPABASE_ANON_KEY':JSON.stringify('offline-render-no-authority'),'import.meta.env.DEV':'false'},plugins:phase==='before'?[{name:'before',setup(b){b.onLoad({filter:/(IntegratedResearchCampus|V11ResearchCampus|V11VisualComposition)\.tsx$/},args=>({contents:execFileSync('git',['show',baseline+':'+args.path.slice(root.length+1)],{cwd:root,encoding:'utf8'}),loader:'tsx'}));}}]:[]});
 await writeFile(join(bundleDir,phase+'.js'),result.outputFiles[0].contents);
}
const server=createServer(async(req,res)=>{try{const u=new URL(req.url,'http://localhost');if(u.pathname==='/favicon.ico'){res.writeHead(204).end();return;}if(u.pathname==='/'){res.setHeader('Content-Type','text/html');res.end('<style>body{margin:0}#root{height:100vh}</style><div id="root"></div><script type="module" src="/'+(u.searchParams.get('phase')||'after')+'.js"></script>');}else{const file=u.pathname.endsWith('.js')?bundleDir+u.pathname:root+'/public'+u.pathname;res.setHeader('Content-Type',u.pathname.endsWith('.js')?'application/javascript':'application/octet-stream');res.end(await readFile(file));}}catch(e){res.writeHead(404).end(String(e));}});await new Promise(r=>server.listen(0,'127.0.0.1',r));
const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true,args:['--no-sandbox']});const errors=[],consoleErrors=[],results=[];
try{const page=await browser.newPage({viewport:{width:1440,height:1000}});page.on('pageerror',e=>{errors.push(e.message);console.error(e.message);});page.on('console',m=>{if(m.type()==='error')consoleErrors.push(m.text());});
for(const phase of ['before','after'])for(const view of ['overview','approach','greenhouse']){await page.goto('http://127.0.0.1:'+server.address().port+'/?phase='+phase+'&view='+view);await page.waitForFunction(()=>window.ready&&window.scene.getObjectByName('v11-preserved-campus-assets'));await page.waitForTimeout(1800);await page.screenshot({path:out+'/'+phase+'-'+view+'.png'});results.push({phase,view,...await page.evaluate(()=>({drawCalls:window.renderer.info.render.calls,triangles:window.renderer.info.render.triangles,architectureBatches:window.scene.getObjectByName('integrated-campus-architecture')?.children.length||0}))});}
await writeFile(out+'/browser-evidence.json',JSON.stringify({baseline,releaseDigest:JSON.parse(await readFile(root+'/src/core/mars/genesis-release.json','utf8')).sha256,scope:'Offline actual-component render on repository terrain; complete original Hub component; null interaction target; backend disabled; no authenticated gameplay or production certification',errors,consoleErrors,results},null,2)+'\n');if(errors.length)throw Error(errors.join('\n'));}finally{await browser.close();server.close();await rm(bundleDir,{recursive:true,force:true});}
