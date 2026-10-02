// Lexical evidence only. Jev decides whether a span is a goal requirement.
// Unsupported number phrases stay whole and unknown; never offer a supported
// substring as though it represented the caller's complete expression.
const units=['zero','one','two','three','four','five','six','seven','eight','nine',
  'ten','eleven','twelve','thirteen','fourteen','fifteen','sixteen','seventeen','eighteen','nineteen'];
const tens={twenty:20,thirty:30,forty:40,fifty:50,sixty:60,seventy:70,eighty:80,ninety:90};
const ordinals={first:'one',second:'two',third:'three',fourth:'four',fifth:'five',sixth:'six',seventh:'seven',eighth:'eight',ninth:'nine',tenth:'ten',eleventh:'eleven',twelfth:'twelve',thirteenth:'thirteen',fourteenth:'fourteen',fifteenth:'fifteen',sixteenth:'sixteen',seventeenth:'seventeen',eighteenth:'eighteen',nineteenth:'nineteen',twentieth:'twenty',thirtieth:'thirty',fortieth:'forty',fiftieth:'fifty',sixtieth:'sixty',seventieth:'seventy',eightieth:'eighty',ninetieth:'ninety',hundredth:'hundred',thousandth:'thousand',millionth:'million'};
const scales={thousand:1000,million:1000000};
const numericWords=new Set([...units,...Object.keys(tens),...Object.keys(ordinals),'hundred',...Object.keys(scales),'minus','negative','point','half','quarter','billion','trillion']);
function normalize(text){
  const literal=text.replace(/(?:st|nd|rd|th)$/i,'');
  if(/^[+-]?(?:\d+|\d{1,3}(?:,\d{3})+)(?:\.\d+)?$/.test(literal)){
    const value=Number(literal.replaceAll(',',''));return Number.isFinite(value)?value:null;
  }
  let words=text.toLowerCase().split(/[\s-]+/),sign=1;
  if(['minus','negative'].includes(words[0])){sign=-1;words=words.slice(1);}
  if(words.some((word,i)=>Object.hasOwn(ordinals,word)&&i!==words.length-1))return null;
  words=words.map(word=>ordinals[word]??word);
  if(words.includes('point')||words.includes('half')||words.includes('quarter'))return null;
  let sum=0,group=0,previous=null,lastScale=Infinity;
  for(let i=0;i<words.length;i++){
    const word=words[i],unit=units.indexOf(word);
    if(word==='and'){
      if(i===0||i===words.length-1||previous==='and'||!['hundred','scale'].includes(previous))return null;
      previous='and';continue;
    }
    if(unit>=0){
      if(previous==='unit'||(previous==='tens'&&(unit===0||unit>=10)))return null;
      group+=unit;previous='unit';
    }else if(Object.hasOwn(tens,word)){
      if(['unit','tens'].includes(previous))return null;
      group+=tens[word];previous='tens';
    }else if(word==='hundred'){
      if(previous!=='unit'||group<1||group>9)return null;
      group*=100;previous='hundred';
    }else if(Object.hasOwn(scales,word)){
      const scale=scales[word];if(!group||scale>=lastScale)return null;
      sum+=group*scale;group=0;lastScale=scale;previous='scale';
    }else return null;
  }
  const value=sign*(sum+group);return words.length&&Number.isSafeInteger(value)?value:null;
}
export function goalSpans(goal){
  const spans=[];
  for(const match of goal.matchAll(/[^;\n.!?]+(?:[.!?]|$)/g)){
    const text=match[0].trim();if(!text)continue;
    const start=match.index+match[0].indexOf(text);spans.push({text,start,end:start+text.length});
  }
  return spans.length<=16?spans:[{text:goal,start:0,end:goal.length}];
}
export function goalLiterals(goal){
  const numbers=[],texts=[],textSpans=[];
  const tokens=[...goal.matchAll(/[+-]?(?:\d[\d,]*(?:\.\d+)?(?:st|nd|rd|th)?)|[A-Za-z]+/gi)];
  for(let i=0;i<tokens.length;i++){
    const token=tokens[i],start=token.index;
    if(/[A-Za-z0-9_]/.test(goal[start-1]??''))continue;
    let end=start+token[0].length,text=token[0],word=text.toLowerCase();
    if(!numericWords.has(word)&&!/^[-+]?\d/.test(text))continue;
    if(numericWords.has(word)){
      while(i+1<tokens.length){
        const next=tokens[i+1],nextWord=next[0].toLowerCase(),gap=goal.slice(end,next.index);
        if(!/^[\s-]+$/.test(gap))break;
        // 'and' joins a scale to its suffix, not independent requested values.
        if(nextWord==='and'&&!Object.hasOwn(scales,word)&&word!=='hundred')break;
        if(!numericWords.has(nextWord)&&nextWord!=='and')break;
        i++;word=nextWord;end=next.index+next[0].length;
      }
      text=goal.slice(start,end);
    }
    if(/[A-Za-z0-9_]/.test(goal[end]??''))continue;
    const value=normalize(text),last=text.toLowerCase().split(/[\s-]+/).at(-1);
    numbers.push({text,value,ordinal:Object.hasOwn(ordinals,last)||/\d(?:st|nd|rd|th)$/i.test(text),
      start,end,representation:value===null?'unrepresented':'exact',context:goal.slice(Math.max(0,start-35),end+35)});
  }
  for(const match of goal.matchAll(/"([^"\n]{1,160})"|'([^'\n]{1,160})'|“([^”\n]{1,160})”/g)){
    const text=match[1]??match[2]??match[3];if(texts.includes(text))continue;
    const start=match.index+1;texts.push(text);textSpans.push({text,start,end:start+text.length});
  }
  return {numbers:numbers.slice(0,12),texts:texts.slice(0,12),textSpans:textSpans.slice(0,12),
    limited:numbers.length>12||texts.length>12};
}
