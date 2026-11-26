"use strict";

const syncCollections = new Map([
 ["accounts","id"], ["transfers","id"], ["recurring","id"], ["goals","id"],
 ["assets","id"], ["snapshots","date"]
]);

function sameSyncValue(a, b) {
 if (Object.is(a,b)) return true;
 if (!a || !b || typeof a !== "object" || typeof b !== "object" || Array.isArray(a)!==Array.isArray(b)) return false;
 const keys=Object.keys(a);
 return keys.length===Object.keys(b).length && keys.every(key=>Object.hasOwn(b,key)&&sameSyncValue(a[key],b[key]));
}

function mergeCloudPayload(base, local, remote, preferLocal) {
 function merge(before, left, right, key) {
  if (sameSyncValue(left,right)) return left;
  if (sameSyncValue(before,left)) return right;
  if (sameSyncValue(before,right)) return left;
  if (left===undefined || right===undefined) return undefined;
  const id=syncCollections.get(key);
  if (id && [left,right,before??[]].every(list=>Array.isArray(list)&&list.every(item=>item?.[id]))) {
   const maps=[before??[],left,right].map(list=>new Map(list.map(item=>[item[id],item])));
   return [...new Set([...maps[2].keys(),...maps[1].keys()])]
    .map(value=>merge(...maps.map(map=>map.get(value))))
    .filter(value=>value!==undefined);
  }
  const record=value=>value && typeof value==="object" && !Array.isArray(value);
  if (record(left) && record(right) && (before===undefined || record(before))) {
   const keys=new Set([...Object.keys(left),...Object.keys(right)]);
   const get=(value, field)=>value&&Object.hasOwn(value,field)?value[field]:undefined;
   return Object.fromEntries([...keys]
    .map(field=>[field,merge(get(before,field),get(left,field),get(right,field),field)])
    .filter(([,value])=>value!==undefined));
  }
  return preferLocal ? left : right;
 }
 return merge(base,local,remote);
}

if (typeof module !== "undefined") module.exports = {sameSyncValue,mergeCloudPayload};
