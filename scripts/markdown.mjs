// A deliberately small, escaped Markdown renderer for this collection's authored
// notes. Supports the blocks used here; raw HTML is always text, never execution.
export const escapeHtml = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));

export function inline(markdown, resolveLink = value => value) {
  let output = '';
  for (let index = 0; index < markdown.length;) {
    const rest = markdown.slice(index);
    let match;
    if ((match = rest.match(/^(`+)([\s\S]*?[^`])\1(?!`)/))) {
      output += `<code>${escapeHtml(match[2])}</code>`; index += match[0].length; continue;
    }
    if ((match = rest.match(/^\[\[([^\]]+)\]\]/))) {
      output += `<code>${escapeHtml(match[1])}</code>`; index += match[0].length; continue;
    }
    // Images are deliberately linked rather than embedded: reading a study
    // must not download third-party images or silently republish sample media.
    if ((match = rest.match(/^!?\[([^\]]+)\]\(([^\s)]+(?:\([^)]*\)[^\s)]*)*)\)/))) {
      const destination = resolveLink(match[2]);
      const label = inline(match[1], resolveLink);
      output += safeLink(destination) ? `<a href="${escapeHtml(destination)}">${label}</a>` : label;
      index += match[0].length; continue;
    }
    if ((match = rest.match(/^<(https?:\/\/[^>]+)>/))) {
      output += `<a href="${escapeHtml(match[1])}">${escapeHtml(match[1])}</a>`;
      index += match[0].length; continue;
    }
    if ((match = rest.match(/^(https?:\/\/[^\s<>]+)/))) {
      const url = match[1].replace(/[.,;:!?]+$/, '');
      output += `<a href="${escapeHtml(url)}">${escapeHtml(url)}</a>`;
      index += url.length; continue;
    }
    if ((match = rest.match(/^(\*\*|__)(\S(?:.*?\S)?)\1/))) {
      output += `<strong>${inline(match[2], resolveLink)}</strong>`; index += match[0].length; continue;
    }
    if ((match = rest.match(/^(\*|_)(\S(?:.*?\S)?)\1/))) {
      output += `<em>${inline(match[2], resolveLink)}</em>`; index += match[0].length; continue;
    }
    if ((match = rest.match(/^~~(\S(?:.*?\S)?)~~/))) {
      output += `<del>${inline(match[1], resolveLink)}</del>`; index += match[0].length; continue;
    }
    if (rest[0] === '\\' && /[\\`*{}\[\]()#+.!_|>~-]/.test(rest[1] || '')) {
      output += escapeHtml(rest[1]); index += 2; continue;
    }
    output += escapeHtml(rest[0]); index++;
  }
  return output;
}

function safeLink(value) {
  return typeof value === 'string' && value.length > 0 &&
    !/[\u0000-\u0020\u007f]/.test(value) &&
    !value.startsWith('//') &&
    (!/^[a-z][a-z\d+.-]*:/i.test(value) || /^(https?:|mailto:)/i.test(value));
}

function cells(line) {
  const row = line.trim().replace(/^\|/, '').replace(/(?<!\\)\|$/, '');
  return row.split(/(?<!\\)\|/).map(cell => cell.trim());
}

export function renderMarkdown(source, { resolveLink } = {}) {
  const markdown = source.replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n').replace(/^---\n[\s\S]*?\n---(?:\n|$)/, '');
  const headings = new Map();
  const format = text => inline(text, resolveLink);
  function blocks(lines) {
    const rendered = [];
    const startsBlock = (line, next = '') => /^(?: {0,3}#{1,6}\s| {0,3}(?:`{3,}|~{3,})|\s*>|\s*(?:[-+*]|\d+[.)])\s|\s*(?:---+|\*\*\*+|___+)\s*$)/.test(line) ||
      (line.includes('|') && /^\s*\|?\s*:?-{3,}:?\s*(?:\|\s*:?-{3,}:?\s*)+\|?\s*$/.test(next));
    for (let index = 0; index < lines.length;) {
      const line = lines[index];
      let match;
      if (!line.trim()) { index++; continue; }
      if ((match = line.match(/^ {0,3}(`{3,}|~{3,})(\S*)\s*$/))) {
        const delimiter = match[1], language = match[2], code = [];
        index++;
        while (index < lines.length && !new RegExp(`^ {0,3}${delimiter[0]}{${delimiter.length},}\\s*$`).test(lines[index])) code.push(lines[index++]);
        index++;
        rendered.push(`<pre><code${language ? ` class="language-${escapeHtml(language)}"` : ''}>${escapeHtml(code.join('\n'))}</code></pre>`); continue;
      }
      if ((match = line.match(/^ {0,3}(#{1,6})\s+(.+?)\s*#*$/))) {
        const base = match[2].toLowerCase().replace(/[`*_]/g, '').replace(/[^\p{L}\p{N}\s-]/gu, '').trim().replace(/\s+/g, '-') || 'section';
        const count = headings.get(base) || 0;
        headings.set(base, count + 1);
        const id = count ? `${base}-${count + 1}` : base;
        rendered.push(`<h${match[1].length} id="${escapeHtml(id)}">${format(match[2])}</h${match[1].length}>`); index++; continue;
      }
      if (/^\s*(?:---+|\*\*\*+|___+)\s*$/.test(line)) { rendered.push('<hr>'); index++; continue; }
      if (line.includes('|') && /^\s*\|?\s*:?-{3,}:?\s*(?:\|\s*:?-{3,}:?\s*)+\|?\s*$/.test(lines[index + 1] || '')) {
        const headers = cells(line), rows = []; index += 2;
        while (index < lines.length && lines[index].includes('|') && lines[index].trim()) rows.push(cells(lines[index++]));
        rendered.push(`<div class="table-scroll" role="region" aria-label="Comparison table" tabindex="0"><table><thead><tr>${headers.map(cell => `<th scope="col">${format(cell)}</th>`).join('')}</tr></thead><tbody>${rows.map(row => `<tr>${headers.map((_, col) => `<td>${format(row[col] || '')}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`); continue;
      }
      if (/^\s*>/.test(line)) {
        const quote = [];
        while (index < lines.length && /^\s*>/.test(lines[index])) quote.push(lines[index++].replace(/^\s*> ?/, ''));
        rendered.push(`<blockquote>${blocks(quote)}</blockquote>`); continue;
      }
      if ((match = line.match(/^(\s*)([-+*]|\d+[.)])\s+(.*)$/))) {
        const indent = match[1].length, ordered = /^\d/.test(match[2]), items = [], start = parseInt(match[2], 10);
        while (index < lines.length) {
          const item = lines[index].match(/^(\s*)([-+*]|\d+[.)])\s+(.*)$/);
          if (!item || item[1].length !== indent || /^\d/.test(item[2]) !== ordered) break;
          const content = [item[3]], padding = item[1].length + item[2].length + 1;
          index++;
          while (index < lines.length) {
            if (!lines[index].trim()) {
              if (lines[index + 1] && /^\s/.test(lines[index + 1]) && lines[index + 1].search(/\S/) > indent) { content.push(''); index++; continue; }
              break;
            }
            const leading = lines[index].search(/\S/);
            if (leading <= indent) break;
            content.push(lines[index++].slice(Math.min(padding, leading)));
          }
          items.push(`<li>${blocks(content)}</li>`);
        }
        const tag = ordered ? 'ol' : 'ul';
        rendered.push(`<${tag}${ordered && start !== 1 ? ` start="${start}"` : ''}>${items.join('')}</${tag}>`); continue;
      }
      const paragraph = [line]; index++;
      while (index < lines.length && lines[index].trim() && !startsBlock(lines[index], lines[index + 1])) paragraph.push(lines[index++]);
      rendered.push(`<p>${format(paragraph.join('\n')).replace(/ {2}\n/g, '<br>\n')}</p>`);
    }
    return rendered.join('\n');
  }
  return blocks(markdown.split('\n'));
}
