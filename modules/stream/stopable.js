
const assign = Object.assign;

function stop(stopable) {
    // If stopable has a .stop() method call it, otherwise call the stopable as
    // a function
    return stopable.stop ?
        stopable.stop() :
        stopable() ;
}


/**
Stopable()
**/

export default function Stopable() {}

assign(Stopable.prototype, {
    stop: function() {
        // It is possible that a stopable causes .stop() to be called on this.
        // I mean, we're not in control of what they do, here. To mitigate
        // recursion like this, the first thing to do is remove this.stopables.
        const stopables = this.stopables;
        this.stopables = undefined;

        if (stopables) {
            //console.log('STOP', this.id, stopables.length, stopables.map((o) => o.id).join(', '));
            stopables.forEach(stop);
        }

        return this;
    },

    done: function(stopable) {
        const stopables = this.stopables || (this.stopables = []);
        stopables.push(stopable);
        return this;
    }
});
