(function(window) {
	var Fn = window.Fn;

	// Be generous with the input we accept.
	var rdate     = /^(-)?(\d+)-(\d+)-(\d+)$/;
	var rtime     = /^(-)?(\d+):(\d+)(?::(\d+(?:\.\d+)?))?$/;
	var rdatetime = /^(-)?(\d+)-(0[0-9]|1[12])-([0-2][0-9]|3[01])T([01][0-9]|2[0-3]):([0-5][0-9])(?::([0-5][0-9](?:\.\d+)?))?/;

	var days = { mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6, sun: 0 };

	function addTimeToDate(time, date) {
		var tokens = rtime.exec(time) ;

		if (!tokens) { throw new Error('Time: "' + time + '" does not parse as time.'); }

		var sign = tokens[1] ? -1 : 1 ;
		var adds = tokens.slice(2).map(parseFloat);

		if (adds[2]) {
			date.setUTCMilliseconds(date.getUTCMilliseconds() + sign * adds[2] * 1000);
		}

		date.setUTCMinutes(date.getUTCMinutes() + sign * adds[1]);
		date.setUTCHours(date.getUTCHours() + sign * adds[0]);
		return date;
	}

	function addDateToDate(time, date) {
		var tokens = rdate.exec(time) ;

		if (!tokens) { throw new Error('Time: "' + time + '" does not parse as date.'); }

		var sign   = tokens[1] ? -1 : 1 ;
		var adds   = tokens.slice(2).map(parseFloat);

		date.setUTCDate(date.getUTCDate() + sign * adds[2]);
		date.setUTCMonth(date.getUTCMonth() + sign * adds[1]);
		date.setUTCFullYear(date.getUTCFullYear() + sign * adds[0]);
		return date;
	}

	function Time(time) {
		if (!Time.prototype.isPrototypeOf(this)) { return new Time(time); }

		var date = time === undefined ? new Date(0) :
			time instanceof Date ? time :
			rtime.test(time) ? addTimeToDate(time, new Date(0)) :
			new Date(time) ;

		this.toDate = function() { return date; }
	}

	Object.assign(Time.prototype, {
		toJSON: function() {
			return this.toDate().toJSON();
		},

		add: function(time) {
			var tokens = rdate.exec(time);
			var date  = new Date(this.toDate());

			return new Time(rdate.test(time) ?
				addDateToDate(time, date) :
				addTimeToDate(time, date)
			);
		},

		floor: function(grain) {
			// Take a day string or number, find the last matching day
			if (typeof grain === 'number' ) {
				var day = grain;
			}

			if (typeof grain === 'string' && days[grain]) {
				var day = days[grain];
			}

			var date = this.toDate();
			var currentDay = date.getUTCDay();

			// If we are on the specified day, return this date
			if (day === currentDay) { return this; }

			var diff = currentDay - day;

			if (diff < 0) { diff = diff + 7; }

			return this.add('-0000-00-0' + diff);
		}
	});

	Object.defineProperties(Time.prototype, {
		date: {
			get: function() {
				return this.toJSON().slice(0, 10);
			},
			enumerable: true
		},

		time: {
			get: function() {
				return this.toJSON().slice(11, -1);
			},
			enumerable: true
		}
	})

	Object.assign(Time, {
		now: function() {
			return Time(new Date());
		}
	});

	window.Time = Time;
})(this);
