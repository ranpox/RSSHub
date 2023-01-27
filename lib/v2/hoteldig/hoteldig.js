const got = require('@/utils/got');
const cheerio = require('cheerio');
const { parseDate } = require('@/utils/parse-date');

module.exports = async (ctx) => {
    const rootUrl = 'https://www.hoteldig.com/category/hotel-loyalty-program-benefit-guide/';
    const response = await got({
        method: 'get',
        url: rootUrl,
    });

    const $ = cheerio.load(response.data);

    let items = $('.list-body')
        .toArray()
        .map((item) => {
            item = $(item);

            return {
                title: item.find('.list-title').text(),
                link: item.find('.list-title').attr('href'),
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
                item.description = content('.post-content').html();
                item.pubDate = parseDate(content('.author-name').find('time').text());
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
