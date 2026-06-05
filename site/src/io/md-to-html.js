// Convert a Markdown string to HTML. Ported from v1 (scr.js convertMarkdownToHtml).
export function convertMarkdownToHtml(markdown) {
  let html = markdown;

  html = html.replace(/```([\s\S]*?)```/g, (match, code) => {
    const escaped = code
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
    return '<pre><code>' + escaped + '</code></pre>';
  });

  html = html.replace(/`([^`]+?)`/g, (match, code) => {
    const escaped = code
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
    return '<code>' + escaped + '</code>';
  });

  html = html.replace(/^###### (.+)$/gm, '<h6>$1</h6>');
  html = html.replace(/^##### (.+)$/gm, '<h5>$1</h5>');
  html = html.replace(/^#### (.+)$/gm, '<h4>$1</h4>');
  html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
  html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
  html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');

  html = html.replace(/^---$/gm, '<hr>');
  html = html.replace(/^\*\*\*$/gm, '<hr>');

  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/__(.+?)__/g, '<strong>$1</strong>');
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
  html = html.replace(/_(.+?)_/g, '<em>$1</em>');

  html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1">');
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');

  const wrapList = (text, regex, openTag, closeTag) => {
    const lines = text.split('\n');
    let inList = false;
    const out = [];
    for (const line of lines) {
      const m = line.match(regex);
      if (m) {
        if (!inList) {
          out.push(openTag);
          inList = true;
        }
        out.push('<li>' + m[2] + '</li>');
      } else {
        if (inList) {
          out.push(closeTag);
          inList = false;
        }
        out.push(line);
      }
    }
    if (inList) out.push(closeTag);
    return out.join('\n');
  };

  html = wrapList(html, /^(\s*)[-*+] (.+)$/, '<ul>', '</ul>');
  html = wrapList(html, /^(\s*)\d+\. (.+)$/, '<ol>', '</ol>');

  // Blockquotes.
  const bqLines = html.split('\n');
  let inBq = false;
  const bqResult = [];
  for (const line of bqLines) {
    const m = line.match(/^> (.+)$/);
    if (m) {
      if (!inBq) {
        bqResult.push('<blockquote>');
        inBq = true;
      }
      bqResult.push(m[1]);
    } else {
      if (inBq) {
        bqResult.push('</blockquote>');
        inBq = false;
      }
      bqResult.push(line);
    }
  }
  if (inBq) bqResult.push('</blockquote>');
  html = bqResult.join('\n');

  html = html
    .split('\n\n')
    .map((para) => {
      para = para.trim();
      if (!para) return '';
      if (para.match(/^<(h[1-6]|ul|ol|blockquote|pre|hr)/)) return para;
      return '<p>' + para.replace(/\n/g, '<br>') + '</p>';
    })
    .join('\n');

  return html.replace(/\n{3,}/g, '\n\n');
}
