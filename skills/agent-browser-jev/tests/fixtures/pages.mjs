// Local, synthetic UI only. DOM events are independently recorded by the test
// server; the production helper never imports this file or its expected results.
export function page(pathname) {
  const card = name => `<article><h2>${name}</h2><p>Project ${name} reference material.</p><button onclick="details('${name}')">Details</button></article>`;
  const catalog = pathname === '/reordered' ? ['Beta', 'Alpha'] : ['Alpha', 'Beta'];
  const content = pathname === '/form' ? `
    <h1>Draft editor</h1><label>Title <input id="title" value="Keep this title" oninput="inputEvent('title',this.value)"></label>
    <label>Message <textarea id="message" oninput="inputEvent('message',this.value)"></textarea></label>
    <button onclick="record({type:'publish'})">Publish</button><p>Draft changes remain local until published.</p>` : pathname === '/delayed' ? `
    <h1>Preview viewer</h1><button onclick="loadPreview(this)">Load preview</button>
    <p id="status">Preview not loaded</p><button id="dismiss" hidden onclick="dismiss()">Dismiss</button>` : `
    <h1>Project catalog</h1><main>${catalog.map(card).join('')}</main>
    <dialog id="detail"><h2 id="detail-title"></h2><p>Read-only project details.</p><button onclick="closeDetails()">Close</button></dialog>`;
  return `<!doctype html><html lang="en"><meta charset="utf-8"><title>Browser acceptance fixture</title>
  <style>body{font:18px sans-serif;margin:32px}article,label{display:block;padding:16px;margin:12px;border:1px solid #bbb}button{font:inherit}textarea{display:block;width:500px;height:100px}</style>
  ${content}<script>
  const record = event => fetch('/events',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(event)});
  let active;
  function details(name){active=name;document.querySelector('#detail-title').textContent=name+' details';document.querySelector('#detail').showModal();record({type:'open',item:name});}
  function closeDetails(){document.querySelector('#detail').close();record({type:'close',item:active});}
  function inputEvent(field,value){record({type:'input',field,value});}
  function loadPreview(button){button.disabled=true;document.querySelector('#status').textContent='Loading preview…';record({type:'load'});setTimeout(()=>{document.querySelector('#status').textContent='Preview ready';document.querySelector('#dismiss').hidden=false;record({type:'ready'});},1200);}
  function dismiss(){document.querySelector('#dismiss').hidden=true;document.querySelector('#status').textContent='Preview dismissed';record({type:'dismiss'});}
  </script></html>`;
}
