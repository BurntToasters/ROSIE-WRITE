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
      if (tag === 'ul' || tag === 'ol') {
        if (child.nodeName.toLowerCase() === 'li') {
          childContent += processNode(child, tag, listLevel);
        } else {
          childContent += processNode(child, listType, listLevel);
        }
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
      case 'pre': return '```\n' + childContent + '\n```\n\n';
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
