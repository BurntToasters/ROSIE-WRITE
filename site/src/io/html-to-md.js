// Convert an HTML string to Markdown. Ported from v1 (scr.js convertToMarkdown).
export function convertToMarkdown(html) {
  const tempElement = document.createElement('div');
  tempElement.innerHTML = html;

  const processNode = (node, listType = null, listLevel = 0) => {
    if (node.nodeType === Node.TEXT_NODE) return node.textContent;
    if (node.nodeType !== Node.ELEMENT_NODE) return '';

    const tag = node.nodeName.toLowerCase();
    let childContent = '';
    for (const child of node.childNodes) {
      const childTag = child.nodeName.toLowerCase();
      if (tag === 'ul' || tag === 'ol') {
        childContent += processNode(child, childTag === 'li' ? tag : listType, listLevel);
      } else if (tag === 'li' && (childTag === 'ul' || childTag === 'ol')) {
        // A list inside a list item is one level deeper. Without this the
        // indent stayed at 0 and nested bullets flattened on export.
        childContent += processNode(child, childTag, listLevel + 1);
      } else {
        childContent += processNode(child, listType, listLevel);
      }
    }

    switch (tag) {
      case 'h1': return '# ' + childContent.trim() + '\n\n';
      case 'h2': return '## ' + childContent.trim() + '\n\n';
      case 'h3': return '### ' + childContent.trim() + '\n\n';
      case 'h4': return '#### ' + childContent.trim() + '\n\n';
      case 'h5': return '##### ' + childContent.trim() + '\n\n';
      case 'h6': return '###### ' + childContent.trim() + '\n\n';
      case 'p': return childContent.trim() + '\n\n';
      case 'br': return '\n';
      case 'strong':
      case 'b': return '**' + childContent + '**';
      case 'em':
      case 'i': return '*' + childContent + '*';
      case 'u': return '<u>' + childContent + '</u>';
      case 'ul': return childContent + '\n';
      case 'ol': return childContent + '\n';
      case 'li': {
        const indent = '  '.repeat(listLevel);
        if (listType === 'ul') return indent + '- ' + childContent.trim() + '\n';
        if (listType === 'ol') return indent + '1. ' + childContent.trim() + '\n';
        return '- ' + childContent.trim() + '\n';
      }
      case 'blockquote':
        return '> ' + childContent.trim().replace(/\n/g, '\n> ') + '\n\n';
      case 'code': return '`' + childContent + '`';
      // Use the raw text, not childContent: a <pre><code> pair would otherwise
      // arrive already wrapped in inline backticks and end up fenced *and*
      // backticked (```` ```\`code\`\n``` ````).
      case 'pre': return '```\n' + node.textContent + '\n```\n\n';
      case 'a': {
        const href = node.getAttribute('href') || '';
        return '[' + childContent + '](' + href + ')';
      }
      case 'img': {
        const src = node.getAttribute('src') || '';
        const alt = node.getAttribute('alt') || '';
        return '![' + alt + '](' + src + ')';
      }
      case 'hr': return '\n---\n\n';
      case 'div': return childContent.trim() ? childContent + '\n' : childContent;
      default: return childContent;
    }
  };

  let markdown = processNode(tempElement);
  return markdown.replace(/\n{3,}/g, '\n\n').trim();
}
