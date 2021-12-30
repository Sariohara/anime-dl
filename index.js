import commands from './commands.js';
import sources from './utils/sources.js';
import asyncForEach from './utils/asyncForEach.js';
import video from './utils/video.js';
import log from './utils/log.js';
import readline from 'readline';
import path from 'path';
import { fileURLToPath } from 'url';

global.NO_WARNS = true;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// TODO: Move to another file
const {emitWarning} = process;
    
process.emitWarning = (warning, ...args) => {
    if (args[0] === 'ExperimentalWarning') {
        return;
    }
    
    if (args[0] && typeof args[0] === 'object' && args[0].type === 'ExperimentalWarning') {
        return;
    }
    
    return emitWarning(warning, ...args);
};

const defaultSource = "vidstreaming";
const defaultDownloadFormat = "%episodenumber%-%name%-%res%.%ext%";

const displayCommands = () => {
    global.logger.info(`Commands:\n${commands.sort((a,b) => (a.option > b.option) ? 1 : ((b.option > a.option) ? -1 : 0))
    .map(cmd => `${cmd.option} ${cmd.requiresArgs ? cmd.displayArgs + ' ' : ''}- ${cmd.description}`).join('\n')}`);;
    process.exit();
}

const findCommand = find => command => (command.option === find) || (command.aliases.indexOf(find) !== -1);
const helpFindCommand = find => {
    find = "-" + find
    return command => (command.option === find) || (command.aliases.indexOf(find) !== -1);
} 

const showHelpAndQuit = () => {
    console.log(`\nUse -help (or -h) for a list of commands`);
    process.exit();
}

const commandHelp = (helpCmd) => {
    const command = commands.find(helpFindCommand(helpCmd.toLowerCase()));
    if(command) {
        global.logger.info(`${command.option}${command.displayArgs ? ' ' + command.displayArgs : ''}:\n\tDescription: ${command.description}\n\tAliases: ${command.aliases.join(', ')}`)
    } else {
        global.logger.info(`Unknown command "${helpCmd}".`);
    }
    showHelpAndQuit();
}

const isSpecified = arg => ((arg) || (arg === null))

if(process.argv.length <= 2) {
    console.log('Too few arguments.')
    showHelpAndQuit();
} else {
    let argsObj = {};
    process.argv.forEach((arg, i) => {
        let argument = arg.toLowerCase();
        let command = commands.find(findCommand(argument));
        if(command) {
            if(command.requiresArgs) {
                if(process.argv[i+1] ? process.argv[i+1].startsWith('-') : true) {
                    argsObj[command.setVar] = null;  
                } else {
                    argsObj[command.setVar] = process.argv[i+1] || null;
                }
            } else {
                argsObj[command.setVar] = true;
            }
        }
    });
    
    video.setParams(argsObj, defaultDownloadFormat)

    const level = Number(argsObj.logLevel);
    global.logger = new log(level);
    global.logger.debug(`Arguments: ${JSON.stringify(argsObj)}`);
    (async () => {
        const sites = await sources.readSourcesFrom(__dirname + '/sites');
        if(argsObj.helpCommand !== undefined) {
            typeof argsObj.helpCommand == "string" ? commandHelp(argsObj.helpCommand) : displayCommands();
        } else if(argsObj.lsc) {
            global.logger.info(`Sources:\n\n${sites.map(site => `${Object.keys(site.data).map(key => key.startsWith("_") ? null : `${key === 'name' ? '- ' : '\t'+key.charAt(0).toUpperCase() + key.slice(1)+': '}${site.data[key]}`).filter(k => k !== null).join('\n')}`).join('\n\n')}`)
            return;
        } else if(!argsObj.searchTerm) {
            global.logger.error('Please specify an anime to search with -search.');
            showHelpAndQuit();
        } else {
            const useSource = async (source, searchResult) => {
                source.on('urlSlugProgress', m => {
                    process.stdout.write(`Getting url for ${m.slug} (${m.current}/${m.total})...`)
                })
                source.on('urlProgressDone', () => {
                    process.stdout.write(` \u001b[32mDone!\u001b[0m\n`)
                })
                
                let searchRes = searchResult || (await source.search(argsObj.searchTerm))
                let episodes = await source.getEpisodes(searchRes);
                    
                if(episodes.error) {
                    console.log(episodes.error);
                    showHelpAndQuit();
                }
    
                if(argsObj.fileName) {
                    const fs = require('fs');
                    console.log('\nSaving into ' + argsObj.fileName);
                    fs.writeFileSync(argsObj.fileName, episodes.join('\n'));
                    console.log('Done!')
                }
    
                if(isSpecified(argsObj.download)) {
                    let failedUrls = await source.download();
                    if(failedUrls.length !== 0) {
                        console.log('\nSome downloads failed:\n');
                        console.log(failedUrls.join('\n'))
                    }
                } else if(!argsObj.listRes) {
                    console.log(`\n\nNext step is to copy these links into a text file and run youtube-dl!\nSample command: youtube-dl.exe -o "%(autonumber)${argsObj.searchTerm}.%(ext)s" -k --no-check-certificate -i -a dwnld.txt\n\n`);
                    console.log(episodes.join('\n'))
                }
            }

            if(isSpecified(argsObj.globalSearch)) {
                let sources = sites;
                if(argsObj.globalSearch !== null) {
                    let allowedSites = argsObj.globalSearch.toLowerCase().split(',');
                    sources = sites.filter(site => allowedSites.indexOf(site.data.name.toLowerCase()) !== -1);
                }
                global.logger.info(`Global searching on ${sources.map(src => src.data.name).join(', ')}`)
                let results = [];
                for(let site of sources) {
                    const src = new site.source(argsObj);
                    global.logger.info(`searching on ${site.data.name}`)
                    const searchResult = await src.search(argsObj.searchTerm);
                    if(!searchResult?.error) results.push({src, site, searchResult});
                };
                const rl = readline.createInterface({
                    input: process.stdin,
                    output: process.stdout
                });
                let selectedResult = results[0];
                if(results.length > 1) {
                    const askResult = () => rl.question(`Multiple results were found. Please select one:\n${results.map((result, i) => `[${i+1}] ${result.site.data.name} - ${result.searchResult?.slug ? result.searchResult.slug : result.searchResult}`).join('\n')}\nSource name or result number (1-${results.length}): `, selected => {
                        selectedResult = results.find((result, i) => result.site.data.name.toLowerCase() === selected.toLowerCase() || ((i+1) === parseInt(selected)));
                        if(!selectedResult) return askResult();
                        rl.close();
                        useSource(selectedResult.src, selectedResult.searchResult);
                    })
                    askResult();
                }
                return;
            } else {
                let source;
                if(!argsObj.source) {
                    if(/(^http(s|):\/\/)/.test(argsObj.searchTerm)) {
                        // bigger todo: make a internal library for interacting with the terminal. doing it this way is extremely painful, utils/video.js suffers from this too.
                        const overwriteLine = `\x1B[2K\r`;
                        const info = `[info] URL found and no source has been provided. `; // todo: make this use some sort of logger template
                        process.stdout.write(overwriteLine + info + 'Autodetecting...');
                        source = sites.find(site => site.data._SEARCHREGEX?.test(argsObj.searchTerm));
                        if(!source) {
                            argsObj.source = defaultSource;
                            process.stdout.write(`${overwriteLine}[info] Could not find a suitable source for this url. Using default source ${defaultSource}\n`); // todo: make this use some sort of logger template
                        } else {
                            process.stdout.write(`${overwriteLine}${info}Using ${source.data.name}\n`);
                        }
                    } else {
                        argsObj.source = defaultSource;
                        global.logger.info(`Using default source ${defaultSource}`);
                    }
                } 
                source = !source ? sites.find(site => site.data.name.toLowerCase() === argsObj.source.toLowerCase()) : source;
                if(!source) {
                    global.logger.error('Invalid source. Use -lsc to check the available sources.');
                    showHelpAndQuit();
                }

                source = new source.source(argsObj);
                useSource(source);
            }    
            
        }
    })()   
}