// Serializable rules: a scene can only finish after its physical task is complete.
export const definitions={
 garbage:{title:'ごみしゅうしゅうしゃで あつめよう',vehicle:'garbage',intro:'ごみ箱をタッチすると、ごみ収集車が集めるよ。全部集めたら、車をタッチして、ぎゅっと小さくしよう。'},
 dig:{title:'ショベルカーで あなをうめよう',vehicle:'excavator',intro:'砂をタッチして、すくおう。次に、穴をタッチして、砂を入れてね。道ができたら、車が通れるよ。'},
 lock:{title:'ふねと すいもん',vehicle:'boat',intro:'船をタッチして、水門に入れよう。ポンプをタッチすると、水と船が上がるよ。水の高さがそろったら、門を開けよう。'},
 flight:{title:'ひこうき そらへ',vehicle:'plane',intro:'飛行機をタッチして、出発しよう。もう一度タッチするたびに、速くなるよ。空へ飛んだら、雲をタッチして遊ぼう。'},
 busride:{title:'バスに のって しゅっぱつ',vehicle:'bus',intro:'バスをタッチして、ドアを開けよう。待っている人をタッチすると、バスに乗るよ。みんなが乗ったら、バスをタッチして出発しよう。'}
};
export function createState(kind,round,random=Math.random){return {kind,round,count:2+round,items:[],phase:kind==='dig'?'scoop':kind==='lock'?'enter':kind==='flight'?'runway':'collect',loads:0,water:0,speed:0,seed:Math.floor(random()*6),done:false};}
export function act(s,action,index){
 if(s.done)return false;
 if(s.kind==='garbage'){
  if(action==='bin'&&s.phase==='collect'&&Number.isInteger(index)&&index>=0&&index<s.count&&!s.items.includes(index)){s.items.push(index);if(s.items.length===s.count)s.phase='compact';return true;}
  if(action==='vehicle'&&s.phase==='compact'){s.phase='depart';s.done=true;return true;}
 }
 if(s.kind==='dig'){
  if(action==='sand'&&s.phase==='scoop'){s.phase='pour';return true;}
  if(action==='hole'&&s.phase==='pour'){s.loads++;s.phase=s.loads>=s.count?'depart':'scoop';s.done=s.phase==='depart';return true;}
 }
 if(s.kind==='lock'){
  if(action==='vehicle'&&s.phase==='enter'){s.phase='pump';return true;}
  if(action==='pump'&&s.phase==='pump'){s.water++;if(s.water===s.count)s.phase='gate';return true;}
  if(action==='gate'&&s.phase==='gate'){s.phase='depart';s.done=true;return true;}
 }
 if(s.kind==='flight'){
  if(action==='vehicle'&&s.phase==='runway'){s.speed++;if(s.speed===3)s.phase='sky';return true;}
  if(action==='cloud'&&s.phase==='sky'&&Number.isInteger(index)&&index>=0&&index<s.count&&!s.items.includes(index)){s.items.push(index);if(s.items.length===s.count){s.phase='depart';s.done=true;}return true;}
 }
 if(s.kind==='busride'){
  if(action==='vehicle'&&s.phase==='collect'){s.phase='board';return true;}
  if(action==='person'&&s.phase==='board'&&Number.isInteger(index)&&index>=0&&index<s.count&&!s.items.includes(index)){s.items.push(index);return true;}
  if(action==='vehicle'&&s.phase==='board'&&s.items.length===s.count){s.phase='depart';s.done=true;return true;}
 }
 return false;
}
export function prompt(s){
 if(s.done)return 'しゅっぱつ！';
 if(s.kind==='garbage')return s.phase==='collect'?'ごみ箱をタッチして、集めよう。':'車をタッチして、ぎゅっと小さくしよう。';
 if(s.kind==='dig')return s.phase==='scoop'?'砂をすくおう。':'穴に砂を入れよう。';
 if(s.kind==='lock')return {enter:'船をタッチして、水門に入れよう。',pump:'ポンプをタッチして、水を上げよう。',gate:'高さがそろったね。右の門を開けよう。'}[s.phase];
 if(s.kind==='flight')return s.phase==='runway'?'飛行機をタッチして、加速しよう。':'空に出たよ。雲をタッチしてみよう。';
 return s.phase==='collect'?'バスをタッチして、ドアを開けよう。':s.items.length===s.count?'みんな乗ったね。バスをタッチして、出発しよう。':'待っている人をタッチして、乗せよう。';
}
