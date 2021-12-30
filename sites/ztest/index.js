// Example class. You can also see the vidstreaming class for a complete example.
import { EventEmitter } from 'events';
import Source from '../../utils/source.js';

/* 
    Required, or else the module wont be recognized by vidstreamdownloader.
    This class should have these methods (or else something bad might happen!): 

    getEpisodes(searchTerm - basically argsObj.searchTerm) - Returns an array with the chapters. 
    Should also emit events chapterDone and chapterProgress when required.

    download() - This should return an array with failed urls, in case there were one.

    Events:
        "urlSlugProgress" is used for giving the user information about the download in the format of "Getting url for ${slug} (${current}/${total})...", it should emit an object with the following parameters:
            slug - The slug/anime name/episode
            current - The current URL thats being fetched
            total - The number of total URLS/episodes that will be fetched

        "urlProgressDone" is used to let the user know that the current url is done fetching. Outputs "Done!" in green color to the console.
        
*/
const source = class ExampleSource extends Source {
    /* 
    anime-dl passes two arguments to the constructor
      argsObj - An object with command line arguments and their values
    */
    constructor(argsObj) {
        super();
    }

    getEpisodes(episode) {
        // If there was an error with the search
        // you should always return the error as an object with the error parameter.
        // The prefered way of doing that is this:
        if(episode.error) { 
            return episode;
        }
        
        // If there were no errors, get the episode URLs normally.
        const getChapter = (episode) => {
            // do stuff to get the episode 
            this.emit('urlSlugProgress', { // emit urlSlugProgress when starting to get a new episode
                slug: episode,
                current: 2,
                total: 2
            })
            // emit urlProgressDone when done with current episode
            this.emit('urlProgressDone')
            return `www.animesite.com/videos/${episode}.mp4`;
        }
        let chapterURL = getChapter(episode)
        
        // Once all the chapters are get, return their url
        return [chapterURL]
    }

    // This function is used by -global-search to search in all sources.
    // It will also be used as a parameter to your source's getEpisodes() function
    // It should return data that can be used by your own source as an argument to the getEpisodes() function.
    // In case of errors (for example, not finding any results), you should return an object with an error parameter explaining what happened
    // To support URLs for searching see utils/url.js and other downloaders' search function for examples.
    search(term) {
        // Instead of doing this you would be doing a request to the site's search page, parsing it, and returning the values needed.
        if(term === 'test class') {
            return 'chapter2';
        }

        return {
            error: "This is a example class."
        };
    }

    async download() {
        let episodesToDownload = ['episode 1', 'episode 2']
        let failedEpisodes = ['episode 3'];
        // In practice you would use the function "downloadWrapper" from utils/video.js (see the source for usage and see other downloaders for examples)
        await episodesToDownload.asyncForEach(async e => {
            process.stdout.write(`Downloading ${e}... `);
            return new Promise((res, rej) => {
                setTimeout(() => {
                    process.stdout.write('Done!\n');
                    res();
                }, 2000)
            })
            
        })
        return failedEpisodes;
    }
}

/* 
    module.exports.data is optional.
    it also might have as much parameters as you want. They will all be displayed on the 
    -lsc.
*/
const data = {
    name: 'mysitename',
    description: 'Cool anime site',
    // modules.exports.data can also have private parameters that start with _. These parameters will not be displayed in -list-sources
    // The usage for this type of parameters is to have a _SEARCHREGEX parameter that has a regular expression 
    // made with the utils/url.js makeURLRegex() function which should also be the same regex used in 
    // your sources' search function. This parameter is used for autodetecting an URL's source when a source
    // is not specified by the user.
    // If this sounds too confusing, look at the other sources code for an idea of how this is used.
    _SEARCHREGEX: /www.testregexanimesite.com/
}

export default { source, data }; 