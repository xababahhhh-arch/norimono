/* Compatibility IDs only. The art and public names come from the generic product catalog. */
(function(root){
 const aliases={patocar:'police',shobosha:'fire',kyukyusha:'ambulance',gomi:'garbage',keikyu:'train',yamanote:'train',hayabusa:'shinkansen',ferry:'boat',airplane:'plane',shovel:'excavator',sl:'locomotive'};
 const group={rail:'train',rescue:'emergency',road:'car',work:'work',air:'sky',water:'sea'};
 root.VEHICLES=root.NoriVehicles.list().map(v=>({...v,group:v.id==='shinkansen'?'shinkansen':group[v.category]}));
 Object.entries(aliases).forEach(([id,target])=>{const v=root.NoriVehicles.get(target);root.VEHICLES.push({...v,id,group:target==='shinkansen'?'shinkansen':group[v.category]});});
 root.GROUPS=[{id:'shinkansen',name:'しんかんせん'},{id:'train',name:'でんしゃ'},{id:'emergency',name:'きんきゅうしゃ'},{id:'work',name:'はたらく くるま'},{id:'car',name:'くるま'},{id:'sky',name:'そら'},{id:'sea',name:'うみ'}];
})(globalThis);
