// Only literal benchmark-goal text may become a caller-supplied value.
// The autocomplete prefix is a search query, not a guessed final selection.
export function suppliedValuesForGoal(taskName, goal) {
  if (taskName === 'enter-text') {
    const match = /^Enter "([^"]+)" into the text field and press Submit\.$/.exec(goal);
    if (!match) throw new Error('Unexpected enter-text benchmark goal');
    return { value: match[1] };
  }
  if (taskName === 'use-autocomplete') {
    const match = /^Enter an item that starts with "([^"]+)" and ends with "([^"]+)"\.$/.exec(goal);
    if (!match) throw new Error('Unexpected use-autocomplete benchmark goal');
    return { query: match[1] };
  }
  if (taskName === 'search-engine') {
    const match = /^Use the textbox to enter "([^"]+)" and press "Search", then find and click the \d+(?:st|nd|rd|th) search result\.$/.exec(goal);
    if (!match) throw new Error('Unexpected search-engine benchmark goal');
    return { query: match[1] };
  }
  if (taskName === 'sign-agreement' && /enter the name/.test(goal)) {
    const match = /^Scroll to the bottom of the textarea, enter the name "([^"]+)" then press "(?:Cancel|Submit)"$/.exec(goal);
    if (!match) throw new Error('Unexpected sign-agreement benchmark goal');
    return { name: match[1] };
  }
  if (taskName === '399') {
    const match=/^Change my bio to "([^"]+)" in the discussion forum$/.exec(goal);
    if(!match)throw new Error('Unexpected WebArena-Verified biography goal');
    return {biography:match[1]};
  }
  if (taskName === '404') {
    const match=/^Upvote the newest post in ([a-zA-Z0-9 _-]+) forum$/.exec(goal);
    if(!match)throw new Error('Unexpected WebArena-Verified forum goal');
    return {forum:match[1]};
  }
  if (taskName === '595') {
    const match=/^Subscribe to the "([^"]+)" forum from the page of the hottest post in that forum\.$/.exec(goal);
    if(!match)throw new Error('Unexpected WebArena-Verified subscription goal');
    return {forum:match[1]};
  }
  if (taskName === '650') {
    const match=/^Reply to the post on this page with my comment "([^"]+)"$/.exec(goal);
    if(!match)throw new Error('Unexpected WebArena-Verified reply goal');
    return {comment:match[1]};
  }
  return {};
}
