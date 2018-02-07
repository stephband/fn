
(function(window) {
    var map = {};

    function Stats(name, object) {
        var store = Object.create(null);
        map[name] = store;

        return new Proxy(object, {
            get: function trapGet(target, name, self) {
                store[name] = store[name] ? store[name] + 1 : 1 ;
                return target[name];
            }
        });
    }

    Stats.log = function() {
        console.table(map);
    };

    window.Stats = Stats;
})(this)
