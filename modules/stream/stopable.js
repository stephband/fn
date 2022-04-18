
const assign = Object.assign;

function stopOne(stopable) {
    return stopable.stop ?
        stopable.stop() :
        stopable() ;
}

function stopAll(stopables) {
    stopables.forEach(stopOne);
    stopables.length = 0;
}


/**
Stopable()
**/

export default function Stopable() {}

assign(Stopable.prototype, {
    stop: function stop() {
        this.stopables && stopAll(this.stopables);
    },

    done: function done(fn) {
        const stopables = this.stopables || (this.stopables = []);
        stopables.push(fn);
    }
});
