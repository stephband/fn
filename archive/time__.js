

//	function createDate(value) {
//		// Test the Date constructor to see if it is parsing date
//		// strings as local dates, as per the ES6 spec, or as GMT, as
//		// per pre ES6 engines.
//		// developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date/parse#ECMAScript_5_ISO-8601_format_support
//		var date = new Date(value);
//		var json = date.toJSON();
//		var gmt =
//			// It's GMT if the string matches the same length of
//			// characters from it's JSONified version...
//			json.slice(0, value.length) === value &&
//
//			// ...and if all remaining numbers are 0.
//			!json.slice(value.length).match(rnonzeronumbers) ;
//
//		return typeof value !== 'string' ? new Date(value) :
//			// If the Date constructor parses to gmt offset the date by
//			// adding the date's offset in milliseconds to get a local
//			// date. getTimezoneOffset returns the offset in minutes.
//			gmt ? new Date(+date + date.getTimezoneOffset() * 60000) :
//
//			// Otherwise use the local date.
//			date ;
//	}

	function addTimeToDate(time, date) {
		var tokens = rtimestring.exec(time) ;

		if (!tokens) { throw new Error('Time: "' + time + '" does not parse as time.'); }

		var sign = tokens[1] ? -1 : 1 ;

		if (isDefined(tokens[4])) { date.setUTCMilliseconds(date.getUTCMilliseconds() + sign * parseFloat(tokens[4]) * 1000); }
		if (isDefined(tokens[3])) { date.setUTCMinutes(date.getUTCMinutes() + sign * parseInt(tokens[3], 10)); }
		if (isDefined(tokens[2])) { date.setUTCHours(date.getUTCHours() + sign * parseInt(tokens[2], 10)); }

		return date;
	}

	function addDateToDate(time, date) {
		var tokens = rdiff.exec(time) ;

		if (!tokens) { throw new Error('Time: "' + time + '" does not parse as date.'); }

		var sign = tokens[1] ? -1 : 1 ;

		if (isDefined(tokens[4])) { date.setUTCDate(date.getUTCDate() + sign * parseInt(tokens[4], 10)); }
		if (isDefined(tokens[3])) { date.setUTCMonth(date.getUTCMonth() + sign * parseInt(tokens[3], 10)); }
		if (isDefined(tokens[2])) { date.setUTCFullYear(date.getUTCFullYear() + sign * parseInt(tokens[2], 10)); }

		return date;
	}

/*	function Time(time) {
		// If time is a time object, don't make a new one, return it
		if (time instanceof Time) { return time; }

		// Time has not been called with `new` do that now
		if (!Time.prototype.isPrototypeOf(this)) {
			return new Time(time);
		}

		Object.defineProperty(this, 'timestamp', {
			enumerable: true,

			value: time === undefined ? 0 :
				// Accept time in seconds
				typeof time === 'number' ? time :
				// Accept date objects.
				time instanceof Date ? +time / 1000 :
				// Accept time strings
				rtimestring.test(time) ? +addTimeToDate(time, new Date(0)) / 1000 :
				// Accept date strings
				+new Date(time) / 1000
		});

		// Check now for invalid times
		if (Number.isNaN(this.timestamp)) {
			throw new Error('Time: Invalid argument: ' + typeof time + ' ' + time);
		}
	}

	function create(seconds) {
		// A fast way of creating times without all the bothersome type checking
		return Object.create(Time.prototype, {
			timestamp: {
				enumerable: true,
				value: seconds
			}
		});
	}

	Object.assign(Time.prototype, {
		add: function(time) {
			return create(
				// Accept time in seconds
				typeof time === "number" ? time + this.timestamp :
				// Accept date string
				rdiff.test(time) ? +addDateToDate(time, this.toDate()) / 1000 :
				// Accept time string
				+addTimeToDate(time, this.toDate()) / 1000
			);
		},

		floor: function(grain) {
			// Take a day string or number, find the last matching day
			var day = typeof grain === 'number' ?
				grain :
				days[grain] ;

			var date = this.toDate();
			var diff;

			if (!isDefined(day)) {
				if (grain === 'ms') { return this; }

				date.setUTCMilliseconds(0);
				if (grain === 's') { return new Time(date); }

				date.setUTCSeconds(0);
				if (grain === 'm') { return new Time(date); }

				date.setUTCMinutes(0);
				if (grain === 'h') { return new Time(date); }

				date.setUTCHours(0);
				if (grain === 'day') { return new Time(date); }

				if (grain === 'week') {
					date.setDate(date.getDate() - toDay(date));
					return new Time(date);
				}

				if (grain === 'fortnight') {
					var week = Time.nowTime().floor('mon').date;
					diff = Fn.mod(14, diffDateDays(week, date));
					date.setUTCDate(date.getUTCDate() - diff);
					return new Time(date);
				}

				date.setUTCDate(1);
				if (grain === 'month') { return new Time(date); }

				date.setUTCMonth(0);
				if (grain === 'year') { return new Time(date); }

				date.setUTCFullYear(0);
				return new Time(date);
			}

			var currentDay = date.getUTCDay();

			// If we are on the specified day, return this date
			if (day === currentDay) { return this; }

			diff = currentDay - day;

			if (diff < 0) { diff = diff + 7; }

			return this.add('-0000-00-0' + diff);
		},

		render: (function() {
			// Todo: this regex should be stricter
			var rtoken = /(th|ms|[YZMDdHhmsz]{1,4}|[a-zA-Z])/g;

			return function render(string, lang) {
				var date = this.toDate();
				return string.replace(rtoken, function($0, $1) {
					return Time.format[$1] ? Time.format[$1](date, lang) : $1 ;
				});
			};
		})(),

		valueOf: function() {
			return this.timestamp;
		},

		toDate: function() {
			return new Date(this.valueOf() * 1000);
		},

		toString: function() {
			return this.valueOf() + '';
		},

		toJSON: function() {
			return this.toDate().toJSON();
		},

		to: function(unit) {
			return unit === 'ms' ? Time.secToMs(this.timestamp) :
				unit === 'months' ? Time.secToMonths(this.timestamp) :
				// Accept string starting with...
				unit[0] === 's' ? this.timestamp :
				unit[0] === 'm' ? Time.secToMins(this.timestamp) :
				unit[0] === 'h' ? Time.secToHours(this.timestamp) :
				unit[0] === 'd' ? Time.secToDays(this.timestamp) :
				unit[0] === 'w' ? Time.secToWeeks(this.timestamp) :
				unit[0] === 'y' ? Time.secToYears(this.timestamp) :
				undefined ;
		}
	});

	Object.defineProperties(Time.prototype, {
		date: {
			get: function() {
				return this.toJSON().slice(0, 10);
			}
		},

		time: {
			get: function() {
				return this.toJSON().slice(11, -1);
			}
		}
	});

	// Here are the types requested for certain operations, and
	// the methods they fall back to when Symbol.toPrimitive does
	// not exist. For consistency, it's probably best not to change
	// the results of these operations with Symbol.toPrimitive after
	// all.
	//
	// +Time()          type: "number"   method: valueOf
	// Time() * 4       type: "number"   method: valueOf
	// Time() + 4       type: "default"  method: valueOf
	// Time() < 0       type: "number"   method: valueOf
	// [Time()].join()  type: "string"   method: toString
	// Time() + ''      type: "default"  method: valueOf
	// new Date(Time()) type: "default"  method: valueOf
	//
	// if (Symbol.toPrimitive) {
	//	Time.prototype[Symbol.toPrimitive] = function(type) {
	//		return type === 'number' ?
	//			this.timestamp :
	//			this.toJSON() ;
	//	};
	// }

	Object.assign(Time, {
		of: function of(time) {
			return new Time(time);
		},

		nowTime: function() {
			return new Time(new Date());
		},

		format: {
			YYYY: function(date)       { return ('000' + date.getFullYear()).slice(-4); },
			YY:   function(date)       { return ('0' + date.getFullYear() % 100).slice(-2); },
			MM:   function(date)       { return ('0' + (date.getMonth() + 1)).slice(-2); },
			MMM:  function(date, lang) { return this.MMMM(date, lang).slice(0,3); },
			MMMM: function(date, lang) { return langs[lang || Time.lang].months[date.getMonth()]; },
			D:    function(date)       { return '' + date.getDate(); },
			DD:   function(date)       { return ('0' + date.getDate()).slice(-2); },
			ddd:  function(date, lang) { return this.dddd(date, lang).slice(0,3); },
			dddd: function(date, lang) { return langs[lang || Time.lang].days[date.getDay()]; },
			hh:   function(date)       { return ('0' + date.getHours()).slice(-2); },
			//hh:   function(date)       { return ('0' + date.getHours() % 12).slice(-2); },
			HH:   function(date)       { return ('0' + date.getHours()).slice(-2); },
			mm:   function(date)       { return ('0' + date.getMinutes()).slice(-2); },
			ss:   function(date)       { return ('0' + date.getSeconds()).slice(-2); },
			sss:  function(date)       { return (date.getSeconds() + date.getMilliseconds() / 1000 + '').replace(/^\d\.|^\d$/, function($0){ return '0' + $0; }); },
			ms:   function(date)       { return '' + date.getMilliseconds(); },

			// Experimental
			am:   function(date) { return date.getHours() < 12 ? 'am' : 'pm'; },
			zz:   function(date) {
				return (date.getTimezoneOffset() < 0 ? '+' : '-') +
					 ('0' + Math.round(100 * Math.abs(date.getTimezoneOffset()) / 60)).slice(-4) ;
			},
			th:   function(date, lang) { return langs[lang || Time.lang].ordinals[date.getDate()]; },
			n:    function(date) { return +date; },
			ZZ:   function(date) { return -date.getTimezoneOffset() * 60; }
		},

		locales: langs
	});

	Object.defineProperty(Time, 'lang', {
		get: function() {
			var lang = document.documentElement.lang;
			return lang && langs[lang] ? lang : 'en';
		},

		enumerable: true
	});

*/
