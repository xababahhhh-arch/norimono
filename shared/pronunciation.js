/* Display strings remain child-friendly. These entries are for pronunciation only.
   Whole sentences go to the speaker; never join independently spoken syllables. */
(function(root){
  const words={
    'ゴミしゅうしゅうしゃ':'ごみ収集車','ごみしゅうしゅうしゃ':'ごみ収集車','しょうぼうしゃ':'消防車','きゅうきゅうしゃ':'救急車',
    'しんかんせん':'新幹線','じょうききかんしゃ':'蒸気機関車','しゃりょうきち':'車両基地',
    'バスえいぎょうしょ':'バス営業所','せいそうしゃこ':'清掃車庫','しょうぼうしょ':'消防署',
    'けいさつしょ':'警察署','じてんしゃ':'自転車','ひこうき':'飛行機','でんしゃ':'電車',
    'せんしゃじょう':'洗車場','のりもの':'乗り物','トラック':'トラック','パトカー':'パトカー',
    'ショベルカー':'ショベルカー','せんろ':'線路','びょういん':'病院','せつめい':'説明'
  };
  const phrases={
    'しょうぼうしゃをタッチ':'消防車をタッチしてね。',
    'ひをタッチしてみずをかけよう':'火をタッチして、水をかけてね。',
    'ひかるすきまにせんろをつなごう':'光っている隙間に、線路をつなげよう。',
    'みずでぬらそう':'水で濡らそう。','あわをつけよう':'泡をつけよう。',
    'ブラシでこすろう':'ブラシでこすろう。','みずでながそう':'水で流そう。',
    'にもつをタッチしてのせよう':'荷物をタッチして、トラックに載せよう。',
    'さわっててらしてみつけよう':'触って照らして、乗り物を見つけよう。',
    'つながった！しゅっぱつ！':'つながったね。出発！',
    'いっぱいのったね。しゅっぱつ！':'いっぱい載ったね。出発！',
    'すごい！ぜんぶできたね。':'すごいね。全部できたね！'
  };
  const ordered=Object.entries(words).sort((a,b)=>b[0].length-a[0].length);
  function text(display){
    let value=String(display).normalize('NFC').replace(/[\s\u3000]+/g,'').replace(/[⭐✨🎉👆👇🔊⏭▶️🙂]/gu,'').trim();
    const progress=value.match(/^みつけた[!！](\d+)\/(\d+)$/);if(progress){const left=Number(progress[2])-Number(progress[1]);return left>0?`${progress[1]}台見つけたね。あと${left}台探してみよう。`:'全部見つけたね。';}
    if(phrases[value])return phrases[value];
    for(const [from,to]of ordered)value=value.split(from).join(to);
    return value;
  }
  root.NoriPronunciation={text,words,phrases};
})(globalThis);
