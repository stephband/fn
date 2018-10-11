

export default function throttle(fn, request, cancel) {
    request = request || window.requestAnimationFrame;
    cancel  = cancel  || window.cancelAnimationFrame;

    var queue = schedule;
    var context, args, id;

    function schedule() {
        queue = noop;
        id = request(update);
    }

    function update() {
        queue = schedule;
        fn.apply(context, args);
    }

    function stop(callLast) {
        // If there is an update queued apply it now
        //if (callLast !== false && queue === noop) { update(); }

        // An update is queued
        if (queue === noop && id !== undefined) {
            cancel(id);
        }

        // Don't permit further changes to be queued
        queue = noop;
    }

    function throttle() {
        // Store the latest context and arguments
        context = this;
        args    = arguments;

        // Queue the update
        queue();
    }

    throttle.cancel = stop;
    return throttle;
}
