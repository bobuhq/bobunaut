import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {buildSync} from 'esbuild';
import {selectCampusBuildings} from '../../src/core/mars/exploration/separate-v11/connected-campus-layout.mjs';
import {INTEGRATED_ASSETS} from '../../src/imported-v11/core/mars/exploration/genesis-v5/integrated-campus.mjs';
export function loadTs(relative){
 const code=buildSync({entryPoints:[fileURLToPath(new URL('../../'+relative,import.meta.url))],bundle:true,write:false,format:'cjs',platform:'node',packages:'external',jsx:'automatic',define:{'import.meta.url':JSON.stringify(new URL('../../src/core/mars/exploration/genesis-v5/3d/exploration-score.mjs',import.meta.url).href)},logLevel:'silent'}).outputFiles[0].text;
 const module={exports:{}};new Function('require','module','exports',code)(createRequire(import.meta.url),module,module.exports);return module.exports;
}
export const sampler=loadTs('src/core/mars/exploration/engine/AresGenesisTerrainData.ts');
const buffer=readFileSync(new URL('../../public/mars/ares-genesis/ares-genesis-height-16.bin',import.meta.url));
const values=new Float32Array(256*256);for(let i=0;i<values.length;i++)values[i]=-3836+buffer.readUInt16LE(i*2)/65535*381;
export const terrain={width:256,height:256,elevations:values};
export const terrainAt=(x,z)=>sampler.sampleAresGenesisRenderedSurfaceMeters(terrain,x,z);
export const buildings=selectCampusBuildings(INTEGRATED_ASSETS,terrainAt);
export const hubFloor=terrainAt(-44,-68)+.06;
export const hubBase=sampler.sampleAresGenesisGameplaySurfaceMeters(terrain,-44,-68)+.05;
