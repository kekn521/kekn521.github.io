import importlib.util
from pathlib import Path
import unittest

spec = importlib.util.spec_from_file_location('build_news', Path(__file__).resolve().parents[1] / 'scripts/build_news.py')
news = importlib.util.module_from_spec(spec)
spec.loader.exec_module(news)


def entry(**changes):
    return dict(date='2026', category='Research', title='Paper accepted', summary='A research update.') | changes


class NewsTests(unittest.TestCase):
    def test_precise_dates_sort_newest_first_and_ties_keep_input_order(self):
        rows = news.validate([entry(title='Year'), entry(date='2026-02', title='Month'), entry(date='2026-02-02', title='Day'), entry(date='2026-02-02', title='Tie')])
        self.assertEqual([r['title'] for r in rows], ['Day', 'Tie', 'Month', 'Year'])
        self.assertEqual(news.date_label('2026'), '2026')
        self.assertEqual(news.date_label('2024-02-29'), '29 Feb 2024')

    def test_text_and_link_attributes_are_escaped(self):
        feed, latest = news.render([entry(category='Life', title='<script>title</script>', summary='Coffee & friends', url='https://example.com/?a="value"&b=2')])
        self.assertNotIn('<script>', feed + latest)
        self.assertIn('&lt;script&gt;', feed)
        self.assertIn('Coffee &amp; friends', feed)
        self.assertIn('&quot;value&quot;&amp;b=2', feed)
        self.assertIn('Life', feed)

    def test_bad_dates_links_and_missing_fields_are_rejected(self):
        for changes in [{'date':'2026-02-29'}, {'date':'2026-13'}, {'date':'0000'}, {'date':'tomorrow'}, {'url':'javascript:alert(1)'}, {'url':'https://user:pass@example.com/'}, {'category':'Other'}, {'title':''}, {'linkLabel':'Read more'}, {'summary':None}]:
            with self.subTest(changes=changes), self.assertRaises(ValueError):
                news.validate([entry(**changes)])
        with self.assertRaises(ValueError):
            news.validate({})

    def test_empty_feed_has_honest_state_and_news_link(self):
        feed, latest = news.render([])
        self.assertIn('Updates will appear here.', feed)
        self.assertNotIn('<article', feed)
        self.assertIn('href="#news"', latest)

    def test_generation_is_idempotent_and_preserves_surroundings(self):
        template = 'BEFORE<!-- LATEST_NEWS:START -->old<!-- LATEST_NEWS:END -->BETWEEN<!-- NEWS_ENTRIES:START -->old<!-- NEWS_ENTRIES:END -->AFTER'
        result = news.build_html(template, [entry()])
        self.assertEqual(news.build_html(result, [entry()]), result)
        self.assertTrue(result.startswith('BEFORE'))
        self.assertTrue(result.endswith('AFTER'))
        self.assertIn('BETWEEN', result)
        with self.assertRaises(ValueError):
            news.build_html('missing markers', [entry()])


if __name__ == '__main__':
    unittest.main()
