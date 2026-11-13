#!/usr/bin/env python3
"""Render validated news.json entries into the two marked index.html regions."""
import argparse
from datetime import date
from html import escape
import json
from pathlib import Path
import re
from urllib.parse import urlsplit

ROOT = Path(__file__).resolve().parents[1]
MONTHS = ('Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec')
FIELDS = {'date', 'category', 'kind', 'title', 'summary', 'url', 'linkLabel'}


def date_parts(value):
    if not isinstance(value, str) or not re.fullmatch(r'[0-9]{4}(?:-[0-9]{2}(?:-[0-9]{2})?)?', value):
        raise ValueError('date must be YYYY, YYYY-MM, or YYYY-MM-DD')
    parts = tuple(map(int, value.split('-')))
    date(parts[0], parts[1] if len(parts) > 1 else 1, parts[2] if len(parts) > 2 else 1)
    return parts


def date_label(value):
    parts = date_parts(value)
    if len(parts) == 1:
        return value
    if len(parts) == 2:
        return f'{MONTHS[parts[1] - 1]} {parts[0]}'
    return f'{parts[2]} {MONTHS[parts[1] - 1]} {parts[0]}'


def validate(entries):
    if not isinstance(entries, list):
        raise ValueError('news.json must contain a list')
    result = []
    for index, item in enumerate(entries):
        try:
            if not isinstance(item, dict) or set(item) - FIELDS:
                raise ValueError('entry must be an object using the documented fields')
            for field in ('date', 'category', 'title', 'summary'):
                if not isinstance(item.get(field), str) or not item[field].strip():
                    raise ValueError(f'{field} must be a nonempty string')
            date_parts(item['date'])
            if item['category'] not in ('Research', 'Life'):
                raise ValueError('category must be Research or Life')
            for field in ('kind', 'url', 'linkLabel'):
                if field in item and (not isinstance(item[field], str) or not item[field].strip()):
                    raise ValueError(f'{field} must be a nonempty string when provided')
            if 'linkLabel' in item and 'url' not in item:
                raise ValueError('linkLabel requires url')
            if 'url' in item:
                url = item['url']
                parsed = urlsplit(url)
                if parsed.scheme not in ('http', 'https') or not parsed.hostname or parsed.username or parsed.password or any(c.isspace() or ord(c) < 32 for c in url):
                    raise ValueError('url must be an absolute HTTP(S) link without credentials or whitespace')
            result.append(dict(item))
        except (ValueError, TypeError) as error:
            raise ValueError(f'News entry {index + 1}: {error}') from error
    return sorted(result, key=lambda item: date_parts(item['date']) + (0,) * (3 - len(date_parts(item['date']))), reverse=True)


def render(entries):
    entries = validate(entries)
    if not entries:
        return ('<p class="news-empty">Updates will appear here.</p>',
                '<a class="destination destination-news latest-news" href="#news" data-route="news" draggable="false" aria-describedby="node-drag-help"><svg class="news-object" viewBox="0 0 80 58" aria-hidden="true" focusable="false"><rect x="4" y="3" width="62" height="49" rx="2" fill="var(--surface)" stroke="currentColor" stroke-width="1.5"/><path d="M66 12h9v35a5 5 0 0 1-5 5H61" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M13 13h44" stroke="currentColor" stroke-width="3"/><rect x="13" y="22" width="17" height="14" fill="currentColor" opacity=".18"/><path d="M37 23h20M37 29h20M37 35h20M13 43h44" stroke="currentColor" stroke-width="1.5"/></svg><span class="destination-title">News <span aria-hidden="true">↗</span></span><span class="destination-note latest-news-title">Research &amp; life updates</span></a>')
    rows = []
    for index, item in enumerate(entries):
        kind = ' · ' + escape(item['kind']) if item.get('kind') else ''
        link = ''
        if item.get('url'):
            link = f'<a class="plain-link news-link" href="{escape(item["url"], quote=True)}">{escape(item.get("linkLabel", "Read more"))} <span aria-hidden="true">↗</span></a>'
        rows.append(f'<li><article class="news-entry" aria-labelledby="news-title-{index}"><div class="news-date"><time datetime="{item["date"]}">{date_label(item["date"])}</time></div><div class="news-copy"><p class="news-meta">{escape(item["category"])}{kind}</p><h3 id="news-title-{index}">{escape(item["title"])}</h3><p class="news-summary">{escape(item["summary"])}</p>{link}</div></article></li>')
    title = escape(entries[0]['title'])
    latest = f'<a class="destination destination-news latest-news" href="#news" data-route="news" draggable="false" aria-describedby="node-drag-help"><svg class="news-object" viewBox="0 0 80 58" aria-hidden="true" focusable="false"><rect x="4" y="3" width="62" height="49" rx="2" fill="var(--surface)" stroke="currentColor" stroke-width="1.5"/><path d="M66 12h9v35a5 5 0 0 1-5 5H61" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M13 13h44" stroke="currentColor" stroke-width="3"/><rect x="13" y="22" width="17" height="14" fill="currentColor" opacity=".18"/><path d="M37 23h20M37 29h20M37 35h20M13 43h44" stroke="currentColor" stroke-width="1.5"/></svg><span class="destination-title">News <span aria-hidden="true">↗</span></span><span class="destination-note latest-news-title">{title}</span></a>'
    return '<ol class="news-list">\n' + '\n'.join(rows) + '\n</ol>', latest


def build_html(template, entries):
    feed, latest = render(entries)
    for name, content in (('NEWS_ENTRIES', feed), ('LATEST_NEWS', latest)):
        start, end = f'<!-- {name}:START -->', f'<!-- {name}:END -->'
        if template.count(start) != 1 or template.count(end) != 1:
            raise ValueError(f'Expected exactly one pair of {name} markers')
        begin, finish = template.index(start) + len(start), template.index(end)
        if finish < begin:
            raise ValueError(f'{name} markers are reversed')
        template = template[:begin] + '\n' + content + '\n' + template[finish:]
    return template


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--data', type=Path, default=ROOT / 'news.json')
    parser.add_argument('--html', type=Path, default=ROOT / 'index.html')
    parser.add_argument('--check', action='store_true', help='Fail if generated HTML is stale; do not write.')
    args = parser.parse_args()
    try:
        current = args.html.read_text(encoding='utf-8')
        generated = build_html(current, json.loads(args.data.read_text(encoding='utf-8')))
        if args.check and current != generated:
            parser.exit(1, 'News HTML is stale. Run python3 scripts/build_news.py\n')
        if not args.check and current != generated:
            args.html.write_text(generated, encoding='utf-8')
        print('News HTML is up to date.' if args.check else 'News HTML generated.')
    except (ValueError, OSError) as error:
        parser.exit(1, f'{error}\n')


if __name__ == '__main__':
    main()
