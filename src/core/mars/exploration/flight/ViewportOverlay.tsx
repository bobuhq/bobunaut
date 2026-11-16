import {useEffect,useRef,type ReactNode} from 'react';
import {createRoot,type Root} from 'react-dom/client';
/** React Three Fiber uses a different reconciler. Mount a real DOM root instead
 * of returning DOM portals into its scene tree. No transformed canvas ancestor. */
export function ViewportOverlay({children}:{children:ReactNode}){
 const domRoot=useRef<Root|null>(null);
 useEffect(()=>{
  const node=document.createElement('div');node.id='ares-flight-viewport';document.body.appendChild(node);
  const root=createRoot(node);domRoot.current=root;
  return()=>{domRoot.current=null;queueMicrotask(()=>{root.unmount();node.remove();});};
 },[]);
 useEffect(()=>{domRoot.current?.render(children);},[children]);
 return null;
}
