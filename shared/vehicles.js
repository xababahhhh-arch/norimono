/* Original generic vehicle illustrations. Coordinates and repair anchors: 320 × 160.
   No copied vehicle outlines, brand palettes, logos, fonts or external images. */
(function (root) {
  'use strict';
  const palette = { ink:'#263e50', glass:'#a4d9e7', glassDark:'#42778a', cream:'#fff4db', metal:'#b9cbd0' };
  const catalog = {
    car:['くるま','車','road','#e87856'], bus:['バス','バス','road','#eebc4f'],
    fire:['しょうぼうしゃ','消防車','rescue','#de5a48'], ambulance:['きゅうきゅうしゃ','救急車','rescue','#ec7868'],
    police:['パトカー','パトカー','rescue','#465c78'], truck:['トラック','トラック','work','#4b9aab'],
    garbage:['ごみしゅうしゅうしゃ','ごみ収集車','work','#69a180'], excavator:['ショベルカー','ショベルカー','work','#e3b64c'],
    dump:['ダンプカー','ダンプカー','work','#d8914f'], tractor:['トラクター','トラクター','work','#79a270'],
    forklift:['フォークリフト','フォークリフト','work','#e6ae4d'], train:['でんしゃ','電車','rail','#6b9f98'],
    shinkansen:['しんかんせん','新幹線','rail','#6996aa'], locomotive:['エスエル','エスエル','rail','#4b5863'],
    plane:['ひこうき','飛行機','air','#7da3bc'], helicopter:['ヘリコプター','ヘリコプター','air','#70b1a0'],
    boat:['ふね','船','water','#648cab'], bicycle:['じてんしゃ','自転車','road','#cc896b'],
    motorbike:['バイク','バイク','road','#6a88a7'], taxi:['タクシー','タクシー','road','#e3b451'],
    rocket:['ロケット','ロケット','air','#cd806c']
  };
  const anchors={truck:{bed:{x:23,y:82,width:181,height:42,floorY:124}},train:{wheelContactY:144}};
  const rect=(x,y,w,h,r,fill,extra='')=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="${fill}" ${extra}/>`;
  const path=(d,fill,extra='')=>`<path d="${d}" fill="${fill}" ${extra}/>`;
  const line=(d,color=palette.ink,width=3)=>path(d,'none',`stroke="${color}" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round"`);
  const circle=(x,y,r,fill,extra='')=>`<circle cx="${x}" cy="${y}" r="${r}" fill="${fill}" ${extra}/>`;
  const wheel=(x,y=131,r=18)=>circle(x,y,r,palette.ink)+circle(x,y,r*.55,palette.metal)+circle(x,y,r*.23,'#f4f4e8')+line(`M${x-r*.3} ${y}h${r*.6}`,'#6c8791',2);
  const glass=(x,y,w,h)=>rect(x,y,w,h,5,palette.glass)+path(`M${x+4} ${y+4}h${w*.45}l-8 ${h-8}H${x+4}Z`,'#e6f4ed', 'opacity=".6"');
  const lights=(front=294,y=110)=>rect(front-7,y,10,7,3,'#ffe8a0')+rect(24,y,7,7,2,'#c76655');
  const bodyStroke='stroke="#35515c" stroke-opacity=".2" stroke-width="2"';
  function windows(xs,y=57,w=34,h=29){return xs.map(x=>glass(x,y,w,h)).join('');}
  function cab(color){return path('M211 66h48q12 0 20 12l20 28v20h-88Z',color,bodyStroke)+path('M224 75h27q9 0 15 10l12 17h-54Z',palette.glass)+line('M219 109v16','#ffffff',2)+rect(224,108,13,3,1,'#396376');}
  function artwork(id,options={}) {
    const v=catalog[id]; if(!v) throw new Error(`Unknown vehicle: ${id}`);
    const c=options.color||v[3]; let s='';
    if(['car','taxi','police'].includes(id)) {
      s=path('M22 112v-10q0-12 19-16l39-7 28-34q7-8 20-8h62q13 0 23 10l32 32 45 12q13 4 13 17v18H22Z',id==='police'?'#f8f6e9':c,bodyStroke);
      s+=path('M112 48h32v32H87Z',palette.glass)+path('M153 48h31q10 0 18 8l23 24h-72Z',palette.glass);
      s+=line('M149 46v78','#385764',2)+rect(162,89,16,3,1,'#547888')+path('M23 108h278v18H23Z',id==='police'?c:'#b95640',id==='police'?'':'opacity=".35"');
      if(id==='police')s+=rect(137,25,48,11,5,'#da6953')+rect(149,25,8,11,2,'#fff0d3')+circle(219,100,10,'#f2bf57');
      if(id==='taxi')s+=rect(137,25,45,11,4,'#f5df9e')+rect(146,28,27,4,2,'#5b747a');
      s+=lights()+wheel(77)+wheel(247)+rect(26,119,23,7,3,'#e6dfd0');
    } else if(id==='bus') {
      s=rect(19,37,281,91,15,c,bodyStroke)+rect(27,43,264,7,3,'#f8d991')+windows([32,80,128,176],55,39,32)+glass(237,55,49,32)+rect(235,91,51,36,4,'#e5cb8d')+line('M260 93v33','#977f4e',2)+line('M23 98h207','#fff0c4',7)+rect(33,106,53,9,3,'#c39c48')+lights()+wheel(76)+wheel(248);
    } else if(id==='fire') {
      s=rect(23,67,189,61,8,c,bodyStroke)+cab(c)+rect(37,78,67,41,4,'#b94d41')+rect(111,78,79,41,4,'#bd5245');
      s+=line('M41 87h58m-58 8h58m-58 8h58m-58 8h58','#eeb09b',2)+circle(148,98,16,'#f1d5a4')+circle(148,98,10,'#627e86')+line('M148 98h18v15','#f4dba7',4);
      s+=rect(55,36,159,10,4,'#c4d0cc')+line('M67 25h145M67 42h145','#f5e6c4',4)+[77,99,121,143,165,187,207].map(x=>line(`M${x} 25v17`,'#718892',3)).join('');
      s+=rect(225,51,31,10,4,'#ed8a63')+lights()+wheel(74)+wheel(253);
    } else if(id==='ambulance') {
      s=path('M22 62q0-17 18-17h160q13 0 18 16l10 17 41 8q27 6 29 25v17H22Z','#fff9e9',bodyStroke)+rect(23,100,274,11,2,c)+glass(222,72,37,25)+rect(94,27,62,13,5,c)+rect(107,29,11,9,2,'#fff0ce');
      s+=rect(40,63,57,27,5,'#e3eae1')+circle(144,79,18,'#edf1e6')+line('M128 79h9l5-9 6 17 5-8h8',c,3)+line('M199 62v65','#c8d4cc',2)+rect(204,91,9,3,1,'#6c8a92')+lights()+wheel(75)+wheel(249);
    } else if(id==='truck'||id==='dump'||id==='garbage') {
      if(id==='truck')s=path('M23 82v43h181V82','none',`stroke="${c}" stroke-width="8"`)+rect(26,100,177,26,2,c)+[40,92,144,192].map(x=>line(`M${x} 103v20`,'#b6d5cf',3)).join('');
      if(id==='dump')s=path('M20 57h184l-16 62H44Z',c,bodyStroke)+line('M31 64h160','#f1c386',6)+[58,97,136,175].map(x=>line(`M${x} 72l-7 35`,'#aa7545',3)).join('');
      if(id==='garbage')s=path('M23 55h156l26 32v39H23Z',c,bodyStroke)+rect(39,69,132,39,6,'#8cbaa0')+line('M52 112h120','#edf1ce',5)+path('M24 66h-10v46h14','#537c6f')+path('M13 76h24v39H13Z','#426b5e')+line('M15 76h21','#adcfb5',4)+path('m91 82 12-11 10 11h-7l4 8h-12l-4-8Zm31 9 7 15h-16l4-6-9-1 6-10Z','#e7edcd');
      s+=cab(id==='truck'?'#e3b253':c)+rect(31,124,264,8,3,'#586c71')+lights()+wheel(71)+wheel(172)+wheel(254);
    } else if(id==='train'||id==='shinkansen') {
      s=path(id==='train'?'M17 56q0-15 16-15h226q28 0 34 23l14 61H17Z':'M13 62q0-14 17-14h150q37 0 68 28l53 39q12 13-7 13H13Z','#f6f2df',bodyStroke);
      s+=path(id==='train'?'M18 47h245q20 0 26 17l5 24H18Z':'M14 55h161q39 0 68 24l24 20H14Z',c)+windows(id==='train'?[30,78,126,174]:[29,70,111],58,id==='train'?37:29,26);
      s+=path(id==='train'?'M226 56h32q17 0 20 13l4 16h-56Z':'M192 62q22 6 45 25h-42Z',palette.glassDark)+line('M19 103h264','#d99b62',6)+rect(29,117,242,9,3,'#b5c4c0');
      if(id==='train')s+=line('M110 40l27-22 26 22M129 17h23','#6f858b',3)+line('M70 52v67M218 52v67','#6b979b',2);
      s+=wheel(65,132,12)+wheel(91,132,12)+wheel(231,132,12)+wheel(257,132,12);
    } else if(id==='excavator') {
      s=rect(36,119,185,29,14,palette.ink)+rect(50,127,157,12,6,'#6e848b')+[63,93,123,153,183].map(x=>circle(x,133,5,'#c6d0c6')).join('');
      s+=rect(57,84,151,37,9,c,bodyStroke)+path('M88 84V44h65q13 0 15 16l4 24Z',c,bodyStroke)+glass(100,51,52,29)+line('M158 52v32','#536b73',3);
      s+=line('M180 88l51-61 40 57',c,17)+line('M184 83l42-47','#fff0be',4)+circle(231,28,7,'#aa8243')+path('M258 78l43 9-14 37h-42Z','#c9973f',bodyStroke)+line('M252 117l35 7','#5e6970',5);
    } else if(id==='tractor') {
      s=path('M72 73h109V47h49v60h49v20H78Z',c,bodyStroke)+glass(182,54,38,40)+rect(88,82,85,26,5,'#a6c095')+line('M107 76V51h11','#6b7d72',6)+rect(248,94,14,22,3,'#e6d6a4')+wheel(102,123,27)+wheel(256,134,16);
    } else if(id==='forklift') {
      s=rect(42,95,124,33,6,c)+line('M69 96V48h77v48','#4b6167',6)+rect(59,37,94,9,3,c)+rect(86,76,28,24,4,'#4c6267')+line('M184 38v89h65m-51-89v78h51','#657980',8)+wheel(73,133,16)+wheel(151,133,16);
    } else if(id==='plane') {
      s=path('M20 89q0-12 25-14l137-8 58-44h27l-33 42 45 3q24 2 28 18 2 14-25 18l-233 12q-27 0-29-15Z','#f7f5e8',bodyStroke);
      s+=path('M179 70l62-47h24l-34 43Z',c)+'<g data-nori-part="wing">'+path('M156 103l61 33h39l-38-34Z',c)+rect(167,111,36,13,6,'#a8bcc5')+'</g>'+path('M49 80 22 48h25l42 29Z',c)+line('M53 93h186','#dc986d',4)+[96,115,134,153,172].map(x=>circle(x,84,4,palette.glassDark)).join('')+path('M266 76q14 1 21 10h-24Z',palette.glassDark);
    } else if(id==='helicopter') {
      s=path('M71 103q-21-44 19-59h61q48 0 57 42l69-21 17 11-93 36H99Z',c,bodyStroke)+glass(121,51,43,32)+path('M171 54q22 8 27 29h-28Z',palette.glassDark)+line('M139 43V27M67 25h151','#4b6572',5)+line('M111 114v20m67-20v20M89 135h111','#5f7782',5)+line('M280 55v38','#78919b',4)+circle(280,75,5,'#f3d6a4');
    } else if(id==='boat') {
      s=path('M18 103h284l-34 38H58Z',c,bodyStroke)+line('M48 123h228','#e2e8dd',5)+rect(75,62,169,41,6,'#fff7e3')+rect(116,39,96,24,4,'#e8e9dc')+rect(144,17,28,23,3,'#ce8b68')+windows([91,129,167,205],74,25,17)+glass(164,44,35,13)+line('M13 150q23-8 46 0t46 0t46 0t46 0t46 0t46 0','#9ccbd0',5);
    } else if(id==='bicycle'||id==='motorbike') {
      s=wheel(73,123,26)+wheel(250,123,26)+line('M73 123l48-62 39 62H73l70-43 17 43 64-52 26 52',c,id==='bicycle'?6:11)+line('M107 59h29M223 72l-9-27h22','#4e6873',6);
      if(id==='motorbike')s+=path('M115 90q14-37 62-10l-16 28h-46Z',c)+rect(123,60,51,10,5,'#465e67')+circle(231,55,9,'#f4d99e');
    } else if(id==='locomotive') {
      s=rect(40,75,162,45,13,c)+rect(171,50,73,70,5,c)+glass(187,61,38,29)+rect(159,39,98,13,4,'#cc9565')+path('M71 74V35h29v40Z',c)+rect(62,26,46,11,3,'#65787e')+line('M42 112h220','#d3a16a',5)+wheel(69,132,18)+wheel(124,132,22)+wheel(183,132,22)+wheel(242,134,14);
    } else if(id==='rocket') {
      s=path('M120 121V61q0-32 40-51 40 19 40 51v60Z','#f7f0df',bodyStroke)+path('M120 61q0-32 40-51 40 19 40 51Z',c)+circle(160,75,17,palette.glassDark)+circle(160,75,11,palette.glass)+path('M120 91 91 130h29Zm80 0 29 39h-29Z',c)+path('M143 122l17 29 17-29Z','#e9b65b');
    }
    return `<svg viewBox="0 0 320 160" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${v[0]}" data-nori-vehicle="${id}">${s}</svg>`;
  }
  function get(id){const a=catalog[id];return a&&{id,name:a[0],say:a[1],category:a[2],color:a[3],image:'',sound:'',anchors:anchors[id]||{},svg:artwork(id)};}
  root.NoriVehicles={artwork,get,anchors,list:()=>Object.keys(catalog).map(get),catalog};
})(globalThis);
