import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
const keys=['relink','relinkHelp','relinkConfirm','alternativeRequired','failed','done','verifying','opening','signIn'].map(key=>`identity.x.${key}`);
for(const language of ['ar','de','en','es','fi','fr','ja','ko','pt','ru','sv','tr','zh']) {
 test(`X reverification translations: ${language}`,()=>{
  const path=`src/core/language/locales/${language}.ts`;
  const source=ts.createSourceFile(path,readFileSync(path,'utf8'),ts.ScriptTarget.Latest,true);
  const values=new Map();
  const visit=node=>{
   if(ts.isPropertyAssignment(node)&&ts.isStringLiteral(node.name)&&keys.includes(node.name.text)){
    assert(!values.has(node.name.text),`duplicate ${node.name.text}`);
    assert(ts.isStringLiteral(node.initializer));
    values.set(node.name.text,node.initializer.text);
   }
   ts.forEachChild(node,visit);
  };
  visit(source);
  for(const key of keys) assert(values.get(key)?.trim(),`missing ${key}`);
 });
}
