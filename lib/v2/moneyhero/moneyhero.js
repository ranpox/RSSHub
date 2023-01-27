const got = require('@/utils/got');
const cheerio = require('cheerio');
const { parseDate } = require('@/utils/parse-date');

module.exports = async (ctx) => {
    const rootUrl = 'https://www.moneyhero.com.hk/blog/zh/category/%E8%AD%98%E6%85%B3%E8%AD%98%E8%B3%BA';
    const response = await got({
        method: 'get',
        url: rootUrl,
    });

    const $ = cheerio.load(response.data);

    let items = $('.post-header')
        .toArray()
        .map((item) => {
            item = $(item);
            const title = item.find('h2').text();
            const link = item.find('a').attr('href');

            return {
                title,
                link,
            };
        });
    items = await Promise.all(
        items.map((item) =>
            ctx.cache.tryGet(item.link, async () => {
                const detailResponse = await got({
                    method: 'get',
                    url: item.link,
                });

                const content = cheerio.load(detailResponse.data);
                item.description = content('.post-body').html();
                item.pubDate = parseDate(content('.blog_date').text().replace('最後更新於 ', ''));
                return item;
            })
        )
    );
    ctx.state.data = {
        title: $('title').text(),
        link: rootUrl,
        description: $('meta[name="description"]').attr('content'),
        item: items,
    };
};
