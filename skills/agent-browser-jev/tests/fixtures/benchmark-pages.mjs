// Synthetic help center, support form and preferences. No production code uses these fixtures.
export function benchmarkPage(route) {
  const articles = route === '/reordered' ? ['Warranty', 'Shipping', 'Returns'] : ['Shipping', 'Returns', 'Warranty'];
  const content = route === '/support' ? `<h1>Contact support</h1>
    <label>Subject<input id="subject" oninput="record({type:'input',field:'subject',value:this.value})"></label>
    <label>Message<textarea id="message" oninput="record({type:'input',field:'message',value:this.value})"></textarea></label>
    <button onclick="record({type:'submit'})">Send request</button>` :
    route === '/preferences' ? `<h1>Preferences</h1><button onclick="document.querySelector('dialog').showModal();record({type:'open-settings'})">Edit notifications</button>
    <dialog><h2>Notifications</h2><label><input id="email" type="checkbox" onchange="record({type:'email',enabled:this.checked})">Email updates</label>
    <button onclick="document.querySelector('dialog').close();document.querySelector('#status').textContent='Preferences saved';record({type:'save',email:document.querySelector('#email').checked})">Save preferences</button></dialog><p id="status">No changes saved</p>` :
    route === '/search' ? `<h1>Help center search</h1><label>Search topics<input id="search" oninput="search(this.value)"></label><div id="results"></div>
    <dialog><h2>Account recovery</h2><p>Recover your account with your registered email.</p><button onclick="document.querySelector('dialog').close();record({type:'close-topic'})">Back to results</button></dialog>` :
    `<h1>Help articles</h1><main>${articles.map(name => `<article><h2>${name}</h2><p>Learn about our ${name.toLowerCase()} policy.</p><button onclick="openArticle('${name}')">Read article</button></article>`).join('')}</main>
    <dialog><h2 id="article-title"></h2><p>Help article content.</p><button onclick="document.querySelector('dialog').close();record({type:'back',article:active})">Back to articles</button></dialog>`;
  return `<!doctype html><html lang="en"><meta charset="utf-8"><title>Jev benchmark</title>
  <style>body{font:18px system-ui;margin:36px}article,label{display:block;padding:12px;margin:10px;border:1px solid #aaa}button,input,textarea{font:inherit}</style>
  ${content}<script>
  const record = event => fetch('/events',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(event)});
  let active;
  function openArticle(name){active=name;document.querySelector('#article-title').textContent=name;document.querySelector('dialog').showModal();record({type:'article',article:name});}
  function search(value){record({type:'search',value});document.querySelector('#results').innerHTML=value.toLowerCase().includes('account')?'<article><h2>Account recovery</h2><button onclick="openTopic()">Read topic</button></article>':'';}
  function openTopic(){document.querySelector('dialog').showModal();record({type:'topic',name:'Account recovery'});}
  </script></html>`;
}
