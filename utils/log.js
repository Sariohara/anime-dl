import util from 'util';

class Logger {
    constructor(logLevel=0) {
        this.logLevel = logLevel;
    }
    
    inspect(msgs) {
        return (msgs.map(msg => typeof msg !== "string" ? util.inspect(msg) : msg).join(' '));
    }


    debug(...msgs) {
        if(this.logLevel >= 2) console.log(`[debug] ${this.inspect(msgs)}`)
    }
    
    info(...msgs) {
        console.log(`[info] ${this.inspect(msgs)}`)
    }
    
    error(...msgs) {
        console.warn(`[error] ${this.inspect(msgs)}`)
    }
    
    warn(...msgs) {
        if(this.logLevel >= 1) console.warn(`[warn] ${this.inspect(msgs)}`)
    }
}

export default Logger;