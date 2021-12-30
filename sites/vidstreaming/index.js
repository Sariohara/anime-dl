import fetch from 'node-fetch';
import cheerio from 'cheerio';
import video from '../../utils/video.js';
import Source from '../../utils/source.js';
import { makeURLRegex } from '../../utils/url.js';

const URL = "https://gogoplay1.com";
const DOWNLOAD_URL = "https://gogoplay1.com/download"
const VIDEO_URL = URL + '/videos'
const videoURLRegex = makeURLRegex(VIDEO_URL);
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/94.0.4606.81 Safari/537.36 Edg/94.0.992.50";
const commonFetch = {
    "headers": {
        "Cookie": "tvshow=8srvmggsochisdd5hv9cjpqjv3; token=61c3ae0b5a08f",
        "User-Agent": UA,
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
        "Upgrade-Insecure-Requests": "1",
        "Sec-Fetch-Dest": "document",
        "Sec-Fetch-Mode": "navigate",
        "Sec-Fetch-Site": "same-origin",
        "Sec-Fetch-User": "?1",
        "Cache-Control": "max-age=0"
    }
}


const source = class Vidstreaming extends Source {
    constructor(argsObj) {
        super();
        this.argsObj = argsObj;
        this.urls = null;
        this.id = null;
        this.episodesNumber = null;
        this.rawUrlObj = [];
    }

    async getEpisodes(id) {
        if(id.error) {
            return id;
        }
        global.logger.debug(`id is ${id}`);
        const req = await fetch(`${VIDEO_URL}/${id}-episode-1`, commonFetch);
        const episodeHtml = await req.text();
        const $ = cheerio.load(episodeHtml);
        let episodesNumber = Number($('ul.listing.items.lists')[0].children.filter(tag => tag.attribs ? tag.attribs.class.includes('video-block') ? true : false : false).length);
        let urls = [];
        if(episodesNumber <= 1) {
            episodesNumber = 1;
        } 
        this.episodesNumber = episodesNumber;
        for (var i = 0; i < episodesNumber; i++) {
            let epSlug = `${id}-episode-${i+1}`;
            
            this.emit('urlSlugProgress', {
                slug: epSlug,
                current: i+1,
                total: episodesNumber
            })
            let epPage = await fetch(`${VIDEO_URL}/${epSlug}`, commonFetch);
            let epHtml = await epPage.text();
            let ep$ = cheerio.load(epHtml);
            let downloadQuery = ep$('iframe')[0].attribs.src.split('?')[1]
            let downloadReq = await fetch(`${DOWNLOAD_URL}?${downloadQuery}`, commonFetch);
            global.logger.debug(`${DOWNLOAD_URL}?${downloadQuery}`);
            let dwnHtml = await downloadReq.text();
            let dwn$ = cheerio.load(dwnHtml);
            
            let downloadURL = Array.from(dwn$(".dowload").slice(0, 4))
            let availableResolutions = downloadURL.map((el, i) => [el.children[0].attribs.href, el.children[0].children[0].data.split('Download\n            (')[1].split('P - mp4)')[0]]);
            this.rawUrlObj.push(availableResolutions);
            let argRes = availableResolutions.filter(res => (res[1] === this.argsObj.downloadRes) || ((res[1] + 'p') === this.argsObj.downloadRes))[0];
            const highestRes = availableResolutions[availableResolutions.length-1];
            let desiredRes = (this.argsObj.downloadRes == 'highest') || (!this.argsObj.downloadRes)
                 ? highestRes 
                 : argRes ? argRes : 
                    (() => { 
                        process.stdout.write(` "${this.argsObj.downloadRes}" resolution not avaliable, defaulting to highest (${highestRes[1]})... `); 
                        return highestRes 
                    })();
            urls.push(desiredRes[0]);    
            this.emit('urlProgressDone');
        }
        if(this.argsObj.listRes) {
            let resolutions = [];
            await urls.asyncForEach(async (url, i) => {
                if((!url.endsWith('.m3u8'))) {
                    const urlRes = this.rawUrlObj[i];
                    resolutions.push(urlRes.map(res => `\n\t${res[1]}p (${res[0]})`).join(''));
                    return;
                }
                let videoRes = await video.listResolutions(url)
                resolutions.push(videoRes);
            })
            console.log('\n\n'+resolutions.map((resolution, i) => `Available resolutions for episode #${i+1}: ${resolution}`).join('\n\n'))
        }
        this.urls = [...urls];
        return urls;
    }

    async download() {
        return video.downloadWrapper({
            urls: this.urls,
            slug: `${this.id}-episode-%current%`,
        })
    }

    async search(term) {
        if(videoURLRegex.test(term)) {
            return term.split('/').slice(-1)[0].split('-episode')[0];
        }
        const req = await fetch(`${URL}/search.html?keyword=${term.split(' ').join('+')}`, commonFetch);
        const content = await req.text();
        const $ = cheerio.load(content);
        try {
            const id = $('.video-block')[0].children.filter(tag => tag.name === "a")[0].attribs.href.split('/videos/')[1].split('-episode')[0];
            this.id = id;
            return id;
        } catch(err) {
            return {
                error: `Could not find the desired term in vidstreaming, try with a more specific search (${err})`
            };
        }
    }
}

const data = {
    name: 'Vidstreaming',
    website: 'gogoplay1.com',
    description: 'Vidstreaming - Watch anime online anywhere',
    language: 'English',
    _SEARCHREGEX: videoURLRegex
}

export default { source, data }