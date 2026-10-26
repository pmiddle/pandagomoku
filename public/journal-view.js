import {posts} from './journal.js';

function text(tag,value,className=''){const element=document.createElement(tag);element.textContent=value;if(className)element.className=className;return element;}
function external(label,url,className=''){const link=text('a',label,className);link.href=url;link.target='_blank';link.rel='noopener noreferrer';return link;}

export function renderJournal(container){
  const player=document.createElement('section');player.id='journal-player';player.className='insight-player';player.hidden=true;player.setAttribute('aria-label','Selected panda video');
  const selections=[];let selected=null;
  function closePlayer(){player.replaceChildren();player.hidden=true;selected=null;selections.forEach(({button})=>{button.setAttribute('aria-expanded','false');button.setAttribute('aria-pressed','false');});}
  for(const post of posts){
    const article=document.createElement('article');article.className='journal-card'+(post.id==='panda-101'?' panda-guide':'');article.id=post.id;
    const content=document.createElement('div');content.className='journal-content';
    const heading=text('h3',post.name);
    if(post.id!=='panda-101'){const [english,chinese]=post.name.split(' · ');heading.replaceChildren(text('span',english),text('span',chinese,'panda-name-cn'));heading.lastChild.lang='zh';}
    content.append(text('p',post.category,'journal-category'),heading,text('p',post.subtitle,'journal-subtitle'),text('p',post.excerpt,'journal-excerpt'));
    const body=document.createElement('div');body.className='journal-body';
    const facts=document.createElement('ul');facts.className='journal-facts';post.facts.forEach(fact=>facts.append(text('li',fact)));body.append(facts);post.paragraphs.forEach(paragraph=>body.append(text('p',paragraph)));
    const sources=document.createElement('div');sources.className='journal-sources';sources.append(text('p','Further reading'));post.sources.forEach(source=>sources.append(external(source.label+' ↗',source.url)));body.append(sources);
    if(post.id==='panda-101'){
      const columns=document.createElement('div');columns.className='guide-columns';
      const factsSection=document.createElement('section');factsSection.append(text('h4','A bear, a forest, a future.'),body);
      const conservation=document.createElement('section');conservation.className='conservation';conservation.append(text('p','CARE BEYOND THE CUTE','journal-category'),text('h4','Loving pandas means protecting their world.'));
      for(const paragraph of post.conservation.paragraphs)conservation.append(text('p',paragraph));
      const actions=document.createElement('ul');post.conservation.actions.forEach(action=>actions.append(text('li',action)));conservation.append(actions);
      const links=document.createElement('div');links.className='conservation-links';post.conservation.links.forEach(link=>links.append(external(link.label+' ↗',link.url)));conservation.append(links);columns.append(factsSection,conservation);content.append(columns);
    }else{
      const details=document.createElement('details'),summary=document.createElement('summary');summary.append(text('span','Read the story'),text('span','↗','journal-read-arrow'));details.append(summary,body);content.append(details);
    }
    if(post.reels?.length){
      const insights=document.createElement('section');insights.className='panda-insights';insights.setAttribute('aria-label',`Insights of ${post.id==='bao-li'?'Bao Li':'Qing Bao'}`);insights.append(text('h4',`Insights of ${post.id==='bao-li'?'Bao Li':'Qing Bao'}`),text('p','A little glimpse of panda life.','insights-note'));
      const options=document.createElement('div');options.className='insight-options';
      post.reels.forEach(reel=>{
        const button=text('button',reel.caption+' ▷');button.type='button';button.setAttribute('aria-expanded','false');button.setAttribute('aria-pressed','false');button.setAttribute('aria-controls','journal-player');selections.push({button});
        button.onclick=()=>{
          if(selected===reel.id){closePlayer();return;}
          closePlayer();selected=reel.id;button.setAttribute('aria-expanded','true');button.setAttribute('aria-pressed','true');
          const header=document.createElement('div');header.className='insight-player-header';const title=text('h4',`${post.name} · ${reel.caption}`);title.id='insight-player-title';player.setAttribute('aria-labelledby',title.id);
          const close=text('button','Close ×','insight-close');close.type='button';close.setAttribute('aria-label','Close panda video');close.onclick=()=>{closePlayer();button.focus();};header.append(title,close);
          const frame=document.createElement('iframe');frame.className='instagram-frame';frame.src=`https://www.instagram.com/reel/${reel.id}/embed/`;frame.title=`${post.name}: ${reel.caption} — Instagram video`;frame.allow='encrypted-media; picture-in-picture; fullscreen';frame.setAttribute('allowfullscreen','');frame.referrerPolicy='strict-origin-when-cross-origin';
          player.append(header,frame,external('Watch on Instagram ↗',`https://www.instagram.com/reel/${reel.id}/`,'reel-fallback'));player.hidden=false;
          player.scrollIntoView({block:'nearest',behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});
        };options.append(button);
      });insights.append(options);content.append(insights);
    }
    article.append(content);if(post.id==='panda-101')container.append(player);container.append(article);
  }
}
