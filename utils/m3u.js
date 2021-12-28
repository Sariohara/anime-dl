// made this whole thing a mess bc encryption sorry :3

const encryptionTable = {
    'AES-128': 'aes-128-cbc'
}

const parse = (m3u) => {
    // THICC codeblock i really dont like it but meh
    let lines = m3u.split('\n');
    let result = {};
    let instrs = [];
    lines.forEach((line, i) => {
        let instr = line.split("#");
        let res;
        if(instr.length > 1) {
            instr = instr[1].split(':');
            let args = instr.slice(1).join(':').split(',');
            let instrName = instr[0];

            switch(instrName) {
                case "EXT-X-STREAM-INF":
                    let info = {};
                    let l = line.split(',');
                    l.shift();
                    l.forEach(inf => {
                        info[inf.split('=')[0]] = inf.split('=')[1];
                    })
                    info.FILE = lines[i+1]
                    if(info.NAME) {
                        info.NAME = info.NAME.replace(/"/g, '');
                    }
                    res = {type: 'header', info}
                    break;
                case "EXTINF":
                    res = {
                        type: 'tsfile', 
                        info: { 
                            NAME: lines[i+1]
                        }
                    };
                    break;
                case "EXT-X-KEY":
                    let key = args[1].split('=')[1];
                    let url;
                    if(key.startsWith("\"") && key.endsWith("\"")) {
                        url = key.slice(1, -1) 
                        key = null;
                    }
                    result.encryption = {
                        method: encryptionTable[args[0].split('=')[1]],
                        key, url
                    }
                    break;
                default:
                    res = {
                        type: instrName,
                        info: {
                            args
                        }
                    }
            }

            instrs.push(res);
        }
    })
    result.instrs = instrs.filter(l => l !== undefined);
    return result;
}

export default { parse }