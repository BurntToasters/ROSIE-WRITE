// Convert a Markdown string to HTML. Ported from v1 (scr.js convertMarkdownToHtml).
export function convertMarkdownToHtml(markdown) {
  let html = markdown;

  const escapeHtml = (text) => text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // Code must be pulled out before any other rule runs. Converting it in place
  // left the generated markup exposed to the emphasis and link replacements
  // below, so literal `*`, `_`, or `[..](..)` inside a code block got mangled.
  // Placeholders are restored last, once every other transform is done.
  const blocks = [];
  const inlines = [];

  // A <pre> placeholder keeps the paragraph wrapper from wrapping it in <p>,
  // and holds no newlines so the blank-line paragraph split can't break it.
  html = html.replace(/```([\s\S]*?)```/g, (match, code) => {
    blocks.push(escapeHtml(code));
    return `<pre data-md-block="${blocks.length - 1}"></pre>`;
  });

  html = html.replace(/`([^`]+?)`/g, (match, code) => {
    inlines.push(escapeHtml(code));
    return `\u0000md-inline-${inlines.length - 1}\u0000`;
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

  html = html.replace(
    /<pre data-md-block="(\d+)"><\/pre>/g,
    (match, index) => '<pre><code>' + blocks[Number(index)] + '</code></pre>'
  );
  html = html.replace(
    /\u0000md-inline-(\d+)\u0000/g,
    (match, index) => '<code>' + inlines[Number(index)] + '</code>'
  );

  return html.replace(/\n{3,}/g, '\n\n');
}
