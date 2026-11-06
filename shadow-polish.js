/* のりもの かげあて：絵と正解/不正解フィードバックを磨く */
(function(){
  'use strict';
  if(!/\/games\/shadow\//.test(location.pathname)) return;
  if(window.__shadowPolishInstalled) return;
  window.__shadowPolishInstalled=true;

  function wrap(body){return '<svg viewBox="0 0 320 160" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">'+body+'</svg>';}
  function wheel(x,y,r){return '<circle cx="'+x+'" cy="'+y+'" r="'+r+'" fill="#27323b"/><circle cx="'+x+'" cy="'+y+'" r="'+(r*.45)+'" fill="#bfc9d0"/>';}
  var road='<rect x="10" y="140" width="300" height="5" rx="2.5" fill="#b7bec4"/>';

  var ART={
    'くるま':wrap(road+'<path d="M25 108c0-13 8-20 24-23l48-7 30-30c7-7 16-10 28-10h55c14 0 25 6 34 18l20 26 30 6c14 3 21 10 21 23v12H25z" fill="#ef6b5c"/><path d="M137 49h43v31h-73zM188 49h19c10 0 17 4 24 14l12 17h-55z" fill="#bfe7f4"/><path d="M39 95h39" stroke="#ffd46a" stroke-width="5" stroke-linecap="round"/>'+wheel(82,122,19)+wheel(246,122,19)),
    'バス':wrap(road+'<rect x="18" y="34" width="282" height="92" rx="20" fill="#f2bc43"/><rect x="32" y="48" width="52" height="38" rx="6" fill="#9dd5e9"/><rect x="92" y="48" width="52" height="38" rx="6" fill="#9dd5e9"/><rect x="152" y="48" width="52" height="38" rx="6" fill="#9dd5e9"/><rect x="212" y="48" width="70" height="38" rx="6" fill="#8ac7df"/><rect x="234" y="92" width="47" height="34" rx="5" fill="#f7e7b8"/><path d="M18 101h282" stroke="#fff4c8" stroke-width="7"/>'+wheel(73,124,18)+wheel(244,124,18)),
    'でんしゃ':wrap(road+'<path d="M18 44h245c22 0 34 10 38 32l7 50H18z" fill="#5fb66e"/><rect x="32" y="57" width="48" height="36" rx="5" fill="#c3e8f4"/><rect x="90" y="57" width="48" height="36" rx="5" fill="#c3e8f4"/><rect x="148" y="57" width="48" height="36" rx="5" fill="#c3e8f4"/><rect x="206" y="57" width="42" height="36" rx="5" fill="#c3e8f4"/><path d="M258 55h23c10 0 17 10 19 24h-42z" fill="#a7d9e8"/><path d="M18 103h290" stroke="#f4dc66" stroke-width="8"/><path d="M120 44l18-18 18 18M128 27h21" fill="none" stroke="#65717a" stroke-width="3" stroke-linecap="round"/><rect x="48" y="123" width="64" height="10" rx="5" fill="#313a42"/><rect x="208" y="123" width="64" height="10" rx="5" fill="#313a42"/>),
    'しょうぼうしゃ':wrap(road+'<rect x="24" y="73" width="270" height="51" rx="8" fill="#e94f47"/><path d="M194 73h70l-21-30h-49z" fill="#e94f47"/><path d="M202 49h34l14 20h-48z" fill="#a6dcea"/><rect x="42" y="53" width="145" height="12" rx="6" fill="#edf1f3"/><path d="M48 47h134M58 59h123" stroke="#7f8a93" stroke-width="3"/><rect x="202" y="31" width="37" height="11" rx="5" fill="#ffd04c"/><rect x="55" y="84" width="80" height="24" rx="4" fill="#d9413b"/><circle cx="98" cy="96" r="7" fill="#f7d05b"/>'+wheel(78,124,19)+wheel(246,124,19)),
    'きゅうきゅうしゃ':wrap(road+'<path d="M24 54h194c18 0 28 7 39 25l29 11c12 4 18 12 18 25v9H24z" fill="#f8f8f2" stroke="#c6ccd1" stroke-width="2"/><path d="M42 79h124" stroke="#ef5e5a" stroke-width="10"/><path d="M201 63h32c10 0 16 5 23 17l8 12h-63z" fill="#acddeb"/><rect x="139" y="39" width="44" height="12" rx="5" fill="#ed5b58"/><path d="M103 84h15V69h12v15h15v12h-15v15h-12V96h-15z" fill="#ed5b58"/><circle cx="289" cy="105" r="5" fill="#ffe07a"/>'+wheel(80,124,19)+wheel(246,124,19)),
    'ひこうき':wrap('<g transform="translate(5 5)"><path d="M28 88c0-10 10-16 26-17l129-7 63-41h24l-35 39 43-2c16-1 29 8 31 18 1 10-11 20-28 22l-45 4 32 31h-23l-59-28-131 8c-17 1-28-7-27-17z" fill="#f7f8f6" stroke="#aeb8bf" stroke-width="2"/><path d="M188 66l55-43h25l-38 42z" fill="#4f9ed8"/><path d="M177 101l64 34h-30l-77-29z" fill="#6db2df"/><path d="M64 76l-31-30h21l51 27z" fill="#5ba5db"/><path d="M68 78h131" stroke="#6baed8" stroke-width="5"/><g fill="#73b9dc"><circle cx="116" cy="73" r="3"/><circle cx="132" cy="72" r="3"/><circle cx="148" cy="71" r="3"/><circle cx="164" cy="70" r="3"/></g><ellipse cx="170" cy="111" rx="18" ry="9" fill="#d6dde1"/><ellipse cx="220" cy="108" rx="16" ry="8" fill="#d6dde1"/></g>'),
    'ふね':wrap('<path d="M22 106h277l-30 35H57z" fill="#397fa9"/><path d="M55 128h226" stroke="#e7f5fb" stroke-width="5"/><rect x="82" y="62" width="151" height="45" rx="7" fill="#f5f2ea"/><rect x="106" y="42" width="103" height="23" rx="5" fill="#e9e4d9"/><rect x="137" y="20" width="31" height="24" rx="4" fill="#df7453"/><g fill="#8cc7df"><rect x="99" y="75" width="25" height="15" rx="3"/><rect x="136" y="75" width="25" height="15" rx="3"/><rect x="173" y="75" width="25" height="15" rx="3"/></g><path d="M26 149c23-8 44-8 67 0 23-8 44-8 67 0 23-8 44-8 67 0 23-8 44-8 67 0" fill="none" stroke="#7fc8df" stroke-width="6" stroke-linecap="round"/>),
    'ショベルカー':wrap(road+'<rect x="35" y="119" width="181" height="25" rx="13" fill="#39434a"/><circle cx="72" cy="132" r="9" fill="#68747d"/><circle cx="180" cy="132" r="9" fill="#68747d"/><rect x="68" y="80" width="113" height="43" rx="9" fill="#f1bc35"/><path d="M104 80V48h57c12 0 21 8 21 20v12z" fill="#f1bc35"/><path d="M117 55h35c9 0 15 5 17 17h-52z" fill="#9ed7e8"/><path d="M173 80l69-48 18 13-59 61" fill="none" stroke="#f1bc35" stroke-width="17" stroke-linecap="round" stroke-linejoin="round"/><path d="M247 39l50 18-12 45-49-19z" fill="#e9ae29" stroke="#c98e17" stroke-width="2"/>)
  };

  function sameSvg(a,b){return !!(a&&b&&a.isEqualNode&&a.isEqualNode(b));}
  function polish(){
    var shadow=document.getElementById('shadow'),box=document.getElementById('choices');
    if(!shadow||!box) return;
    var shadowSvg=shadow.querySelector('svg');
    if(!shadowSvg) return;
    var buttons=Array.prototype.slice.call(box.querySelectorAll('.choice'));
    var answer='';
    buttons.some(function(btn){var s=btn.querySelector('svg');if(sameSvg(shadowSvg,s)){answer=btn.getAttribute('aria-label')||'';return true;}return false;});
    if(answer&&ART[answer]) shadow.innerHTML=ART[answer];
    buttons.forEach(function(btn){
      var name=btn.getAttribute('aria-label')||'';
      if(ART[name]){
        var tmp=document.createElement('div');tmp.innerHTML=ART[name];
        var old=btn.querySelector('svg');if(old) old.replaceWith(tmp.firstElementChild);
      }
      if(btn.dataset.polishWatch==='1') return;
      btn.dataset.polishWatch='1';
      var mo=new MutationObserver(function(){
        if(btn.classList.contains('correct')&&!btn.dataset.correctFx){
          btn.dataset.correctFx='1';
          if(window.NoriFeedback){
            NoriFeedback.correct();
            var r=btn.getBoundingClientRect();
            NoriFeedback.burst(r.left+r.width/2,r.top+r.height/2,14);
          }
        }
        if(btn.classList.contains('wrong')&&!btn.dataset.wrongFx){
          btn.dataset.wrongFx='1';
          if(window.NoriFeedback) NoriFeedback.retry();
          setTimeout(function(){delete btn.dataset.wrongFx;},380);
        }
      });
      mo.observe(btn,{attributes:true,attributeFilter:['class']});
    });
  }

  var choices=document.getElementById('choices');
  if(choices){new MutationObserver(function(){requestAnimationFrame(polish);}).observe(choices,{childList:true});}
  requestAnimationFrame(polish);
})();
