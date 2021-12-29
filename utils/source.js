import { EventEmitter } from 'events';

/**
 * Base source class with the methods that are obligatory for every source/site
 */
export default class Source extends EventEmitter {
    constructor(argsObj) {
        super();
    }

    getEpisodes(searchTerm) {
        return [];
    }

    search(term) {
        return {};
    }

    download() {
        return [];
    }
}
