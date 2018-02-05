(function(window) {
	"use strict";

	var Fn        = window.Fn;

	var assign    = Object.assign;
	var curry     = Fn.curry;
	var choose    = Fn.choose;
	var id        = Fn.id;
	var isDefined = Fn.isDefined;
	var mod       = Fn.mod;
	var noop      = Fn.noop;
	var overload  = Fn.overload;
	var toType    = Fn.toType;
	var toClass   = Fn.toClass;


	// Be generous with the input we accept.
	var rdiff =       /^(-)?(\d{4})(?:-(\d+))?(?:-(\d+))?$/;
	var rtimestring = /^(-)?(\d+):(\d+)(?::(\d+(?:\.\d+)?))?$/;
	//var rdatetime = /^(-)?(\d+)-(0[0-9]|1[12])-([0-2][0-9]|3[01])T([01][0-9]|2[0-3]):([0-5][0-9])(?::([0-5][0-9](?:\.\d+)?))?/;
	//var rtimestringzone = /(?:Z|[+-]\d{2}:\d{2})$/;
	//var rnonzeronumbers = /[1-9]/;

	function createOrdinals(ordinals) {
		var array = [], n = 0;

		while (n++ < 31) {
			array[n] = ordinals[n] || ordinals.n;
		}

		return array;
	}

	var langs = {
		'en': {
			days:     ('Sunday Monday Tuesday Wednesday Thursday Friday Saturday').split(' '),
			months:   ('January February March April May June July August September October November December').split(' '),
			ordinals: createOrdinals({ n: 'th', 1: 'st', 2: 'nd', 3: 'rd', 21: 'st', 22: 'nd', 23: 'rd', 31: 'st' })
		},

		'fr': {
			days:     ('dimanche lundi mardi mercredi jeudi vendredi samedi').split(' '),
			months:   ('janvier février mars avril mai juin juillet août septembre octobre novembre décembre').split(' '),
			ordinals: createOrdinals({ n: "ième", 1: "er" })
		},

		'de': {
			days:     ('Sonntag Montag Dienstag Mittwoch Donnerstag Freitag Samstag').split(' '),
			months:   ('Januar Februar März April Mai Juni Juli Oktober September Oktober November Dezember').split(' '),
			ordinals: createOrdinals({ n: "er" })
		},

		'it': {
			days:     ('domenica lunedì martedì mercoledì giovedì venerdì sabato').split(' '),
			months:   ('gennaio febbraio marzo aprile maggio giugno luglio agosto settembre ottobre novembre dicembre').split(' '),
			ordinals: createOrdinals({ n: "o" })
		}
	};


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

	function Time(time) {
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
					diff = Fn.mod(14, Time.dateDiff(week, date));
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














	// Date string parsing
	//
	// Don't parse date strings with the JS Date object. It has variable
	// time zone behaviour. Set up our own parsing.
	//
	// Accept BC dates by including leading '-'.
	// (Year 0000 is 1BC, -0001 is 2BC.)
	// Limit months to 01-12
	// Limit dates to 01-31

	var rdate     = /^(-?\d{4})(?:-(0[1-9]|1[012])(?:-(0[1-9]|[12]\d|3[01])(?:T([01]\d|2[0-3])(?::([0-5]\d)(?::([0-5]\d)(?:.(\d+))?)?)?)?)?)?([+-]([01]\d|2[0-3]):?([0-5]\d)?|Z)?$/;
	//                sign   year        month       day               T or -
	var rdatediff = /^([+-])?(\d{2,})(?:-(\d{2,})(?:-(\d{2,}))?)?(?:([T-])|$)/;

	var parseDate = overload(toType, {
		number:  secondsToDate,
		string:  exec(rdate, createDate),
		object:  function(date) {
			return isValidDate(date) ? date : undefined ;
		},
		default: noop
	});

	var parseDateLocal = overload(toType, {
		number:  secondsToDate,
		string:  exec(rdate, createDateLocal),
		object:  function(date) {
			return date instanceof Date ? date : undefined ;
		},
		default: noop
	});

	function isValidDate(date) {
		return toClass(date) === "Date" && !Number.isNaN(date.getTime()) ;
	}

	function createDate(match, year, month, day, hour, minute, second, ms, zone, zoneHour, zoneMinute) {
		// Month must be 0-indexed for the Date constructor
		month = parseInt(month, 10) - 1;

		var date = new Date(
			ms ?     Date.UTC(year, month, day, hour, minute, second, ms) :
			second ? Date.UTC(year, month, day, hour, minute, second) :
			minute ? Date.UTC(year, month, day, hour, minute) :
			hour ?   Date.UTC(year, month, day, hour) :
			day ?    Date.UTC(year, month, day) :
			month ?  Date.UTC(year, month) :
			Date.UTC(year)
		);

		if (zone && (zoneHour !== '00' || (zoneMinute !== '00' && zoneMinute !== undefined))) {
			setTimeZoneOffset(zone[0], zoneHour, zoneMinute, date);
		}

		return date;
	}

	function createDateLocal(year, month, day, hour, minute, second, ms, zone) {
		if (zone) {
			throw new Error('Time.parseDateLocal() will not parse a string with a time zone "' + zone + '".');
		}

		// Month must be 0-indexed for the Date constructor
		month = parseInt(month, 10) - 1;

		return ms ?  new Date(year, month, day, hour, minute, second, ms) :
			second ? new Date(year, month, day, hour, minute, second) :
			minute ? new Date(year, month, day, hour, minute) :
			hour ?   new Date(year, month, day, hour) :
			day ?    new Date(year, month, day) :
			month ?  new Date(year, month) :
			new Date(year) ;
	}

	function exec(regex, fn, error) {
		return function exec(string) {
			var parts = regex.exec(string);
			if (!parts && error) { throw error; }
			return parts ?
				fn.apply(null, parts) :
				undefined ;
		};
	}

	function secondsToDate(n) {
		return new Date(secondsToMilliseconds(n));
	}

	function setTimeZoneOffset(sign, hour, minute, date) {
		if (sign === '+') {
			date.setUTCHours(date.getUTCHours() - parseInt(hour, 10));
			if (minute) {
				date.setUTCMinutes(date.getUTCMinutes() - parseInt(minute, 10));
			}
		}
		else if (sign === '-') {
			date.setUTCHours(date.getUTCHours() + parseInt(hour, 10));
			if (minute) {
				date.setUTCMinutes(date.getUTCMinutes() + parseInt(minute, 10));
			}
		}

		return date;
	}



	// Date object formatting
	//
	// Use the internationalisation methods for turning a date into a UTC or
	// locale string, the date object for turning them into a local string.

	var dateFormatters = {
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
	};

	var componentFormatters = {
		YYYY: function(data)       { return data.year; },
		YY:   function(data)       { return ('0' + data.year).slice(-2); },
		MM:   function(data)       { return data.month; },
		MMM:  function(data, lang) { return this.MMMM(data, lang).slice(0,3); },
		MMMM: function(data, lang) { return langs[lang].months[data.month - 1]; },
		D:    function(data)       { return parseInt(data.day, 10) + ''; },
		DD:   function(data)       { return data.day; },
		ddd:  function(data, lang) { return data.weekday.slice(0,3); },
		dddd: function(data, lang) { return data.weekday; },
		hh:   function(data)       { return data.hour; },
		//hh:   function(data)       { return ('0' + data.hour % 12).slice(-2); },
		mm:   function(data)       { return data.minute; },
		ss:   function(data)       { return data.second; },
		//sss:  function(data)       { return (date.second + date.getMilliseconds() / 1000 + '').replace(/^\d\.|^\d$/, function($0){ return '0' + $0; }); },
		//ms:   function(data)       { return '' + date.getMilliseconds(); },
	};

	var componentKeys = {
		// Components, in order of appearance in the locale string
		'en-US': ['weekday', 'month', 'day', 'year', 'hour', 'minute', 'second']
	};

	var options = {
		// Time zone
		timeZone:      'UTC',
		// Use specified locale matcher
		formatMatcher: 'basic',
		// Use 24 hour clock
		hour12:        false,
		// Format string components
		weekday:       'long',
		year:          'numeric',
		month:         '2-digit',
		day:           '2-digit',
		hour:          '2-digit',
		minute:        '2-digit',
		second:        '2-digit',
		//timeZoneName:  'short'
	};

	var rtoken  = /([YZMDdhmswz]{2,4}|\+-)/g;
	var rusdate = /\w+|\d+/g;

	function matchEach(regex, fn, text) {
		var match = regex.exec(text);

		return match ? (
			fn.apply(null, match),
			matchEach(regex, fn, text)
		) :
		undefined ;
	}

	function toLocaleString(timezone, locale, date) {
		options.timeZone = timezone || 'UTC';
		var string = date.toLocaleString(locale, options);
		return string;
	}

	function toLocaleComponents(timezone, locale, date) {
		var localedate = toLocaleString(timezone, locale, date);
		var components = {};
		var keys       = componentKeys[locale];
		var i          = 0;

		matchEach(rusdate, function(value) {
			components[keys[i++]] = value;
		}, localedate);

		return components;
	}

	function formatDateLocal(string, locale, date) {
		var formatters = dateFormatters;
		var lang = locale.slice(0, 2);

		// Use date formatters to get time as current local time
		return string.replace(rtoken, function($0) {
			return formatters[$0] ? formatters[$0](date, lang) : $0 ;
		});
	}

	function formatDate(string, timezone, locale, date) {
		if (timezone === 'local') {
			return formatDateLocal(string, locale, date);
		}

		// Derive lang from locale
		var lang = locale.slice(0,2);

		// Todo: only en-US supported for the time being
		locale = 'en-US';

		var data    = toLocaleComponents(timezone, locale, date);
		var formats = componentFormatters;

		return string.replace(rtoken, function($0) {
			return formats[$0] ? formats[$0](data, lang) : $0 ;
		});
	}

	function formatDateISO(date) {
		return JSON.stringify(parseDate(date));
	}


	// Time operations

	var days   = {
		mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6, sun: 0
	};

	var dayMap = [6,0,1,2,3,4,5];

	function toDay(date) {
		return dayMap[date.getDay()];
	}

	function cloneDate(date) {
		return new Date(+date);
	}

	function addDateComponents(sign, yy, mm, dd, date) {
		date.setUTCFullYear(date.getUTCFullYear() + sign * parseInt(yy, 10));

		if (!mm) { return; }
		date.setUTCMonth(date.getUTCMonth() + sign * parseInt(mm, 10));

		if (!dd) { return; }
		date.setUTCDate(date.getUTCDate() + sign * parseInt(dd, 10));
	}

	function diff(t, d1, d2) {
		var y1 = d1.getUTCFullYear();
		var m1 = d1.getUTCMonth();
		var y2 = d2.getUTCFullYear();
		var m2 = d2.getUTCMonth();

		if (y1 === y2 && m1 === m2) {
			return t + d2.getUTCDate() - d1.getUTCDate() ;
		}

		t += d2.getUTCDate() ;

		// Set to last date of previous month
		d2.setUTCDate(0);

		return diff(t, d1, d2);
	}

	function floor(grain, date) {
		// Clone date before mutating it
		date = cloneDate(date);

		// Take a day string or number, find the last matching day
		var day = typeof grain === 'number' ?
			grain :
			days[grain] ;

		var diff, week;

		if (!isDefined(day)) {
			if (grain === 'ms') { return date; }

			date.setUTCMilliseconds(0);
			if (grain === 'second') { return date; }

			date.setUTCSeconds(0);
			if (grain === 'minute') { return date; }

			date.setUTCMinutes(0);
			if (grain === 'hour') { return date; }

			date.setUTCHours(0);
			if (grain === 'day') { return date; }

			if (grain === 'week') {
				date.setDate(date.getDate() - toDay(date));
				return date;
			}

			if (grain === 'fortnight') {
				week = floor('mon', new Date());
				diff = Fn.mod(14, Time.dateDiff(week, date));
				date.setUTCDate(date.getUTCDate() - diff);
				return date;
			}

			date.setUTCDate(1);
			if (grain === 'month') { return date; }

			date.setUTCMonth(0);
			if (grain === 'year') { return date; }

			date.setUTCFullYear(0);
			return date;
		}

		//var currentDay = date.getUTCDay();

		// If we are on the specified day, return this date
		//if (day === currentDay) { return this; }

		//diff = currentDay - day;

		//if (diff < 0) { diff = diff + 7; }

		//return this.add('-0000-00-0' + diff);
	}



	assign(Fn, {
		nowDate: function() {
			return new Date();
		},

		parseDate:      parseDate,
		parseDateLocal: parseDateLocal,

		formatDate: curry(function(string, timezone, locale, date) {
			return string === 'ISO' ?
				formatDateISO(parseDate(date)) :
				formatDate(string, timezone, locale, parseDate(date)) ;
		}),

		formatDateISO: formatDateISO,
		formatDateLocal: curry(formatDateLocal),

		addDate: curry(function(diff, date) {
			// Don't mutate the original date
			date = cloneDate(date);

			// First parse the date portion diff and add that to date
			var tokens = rdatediff.exec(diff) ;
			var sign = 1;

			if (tokens) {
				sign = tokens[1] === '-' ? -1 : 1 ;
				addDateComponents(sign, tokens[2], tokens[3], tokens[4], date);

				// If there is no 'T' separator go no further
				if (!tokens[5]) { return date; }

				// Prepare diff for time parsing
				diff = diff.slice(tokens[0].length);

				// Protect against parsing a stray sign before time
				if (diff[0] === '-') { return date; }
			}

			// Then parse the time portion and add that to date
			var time = parseTimeDiff(diff);
			if (time === undefined) { return; }

			date.setTime(date.getTime() + sign * time * 1000);
			return date;
		}),

		cloneDate: cloneDate,

		dateDiff: function(date1, date2) {
			var d1 = typeof date1 === 'string' ? parseDate(date1) : date1 ;
			var d2 = typeof date2 === 'string' ? parseDate(date2) : date2 ;

			return d2 > d1 ?
				// 3rd argument mutates, so make sure we get a clean date if we
				// have not just made one.
				diff(0, d1, d2 === date2 ? new Date(d2.getFullYear(), d2.getMonth(), d2.getDate()) : d2) :
				diff(0, d2, d1 === date1 ? new Date(d1.getFullYear(), d1.getMonth(), d1.getDate()) : d1) * -1 ;
		},

		diffDate: curry(function(date1, date2) {
			var d1 = typeof date1 === 'string' ? parseDate(date1) : date1 ;
			var d2 = typeof date2 === 'string' ? parseDate(date2) : date2 ;

			return d2 > d1 ?
				// 3rd argument mutates, so make sure we get a clean date if we
				// have not just made one.
				diff(0, d1, d2 === date2 ? new Date(d2.getFullYear(), d2.getMonth(), d2.getDate()) : d2) :
				diff(0, d2, d1 === date1 ? new Date(d1.getFullYear(), d1.getMonth(), d1.getDate()) : d1) * -1 ;
		}),

		floorDate: curry(floor),

		toDay: toDay,

		toTimestamp: function(date) {
			return date.getTime() / 1000;
		}
	});




	// Time

	var precision = 9;

	function millisecondsToSeconds(n) { return n / 1000; }
	function minutesToSeconds(n) { return n * 60; }
	function hoursToSeconds(n) { return n * 3600; }
	function daysToSeconds(n) { return n * 86400; }
	function weeksToSeconds(n) { return n * 604800; }

	function secondsToMilliseconds(n) { return n * 1000; }
	function secondsToMinutes(n) { return n / 60; }
	function secondsToHours(n) { return n / 3600; }
	function secondsToDays(n) { return n / 86400; }
	function secondsToWeeks(n) { return n / 604800; }

	function prefix(n) {
		return n >= 10 ? '' : '0';
	}

	// Hours:   00-23 - 24 should be allowed according to spec
	// Minutes: 00-59 -
	// Seconds: 00-60 - 60 is allowed, denoting a leap second

	//var rtime   = /^([+-])?([01]\d|2[0-3])(?::([0-5]\d)(?::([0-5]\d|60)(?:.(\d+))?)?)?$/;
	//                sign   hh       mm           ss
	var rtime     = /^([+-])?(\d{2,}):([0-5]\d)(?::((?:[0-5]\d|60)(?:.\d+)?))?$/;
	var rtimediff = /^([+-])?(\d{2,}):(\d{2,})(?::(\d{2,}(?:.\d+)?))?$/;

	var parseTime = overload(toType, {
		number:  id,
		string:  exec(rtime, createTime),
		default: function(object) {
			throw new Error('parseTime() does not accept objects of type ' + (typeof object));
		}
	});

	var parseTimeDiff = overload(toType, {
		number:  id,
		string:  exec(rtimediff, createTime),
		default: function(object) {
			throw new Error('parseTime() does not accept objects of type ' + (typeof object));
		}
	});

	var floorTime = choose({
		week:   function(time) { return time - mod(604800, time); },
		day:    function(time) { return time - mod(86400, time); },
		hour:   function(time) { return time - mod(3600, time); },
		minute: function(time) { return time - mod(60, time); },
		second: function(time) { return time - mod(1, time); }
	});

	var timeFormatters = {
		'+-': function sign(time) {
			return time < 0 ? '-' : '' ;
		},

		www: function www(time) {
			time = time < 0 ? -time : time;
			var weeks = Math.floor(secondsToWeeks(time));
			return prefix(weeks) + weeks;
		},

		dd: function dd(time) {
			time = time < 0 ? -time : time;
			var days = Math.floor(secondsToDays(time));
			return prefix(days) + days;
		},

		hhh: function hhh(time) {
			time = time < 0 ? -time : time;
			var hours = Math.floor(secondsToHours(time));
			return prefix(hours) + hours;
		},

		hh: function hh(time) {
			time = time < 0 ? -time : time;
			var hours = Math.floor(secondsToHours(time % 86400));
			return prefix(hours) + hours;
		},

		mm: function mm(time) {
			time = time < 0 ? -time : time;
			var minutes = Math.floor(secondsToMinutes(time % 3600));
			return prefix(minutes) + minutes;
		},

		ss: function ss(time) {
			time = time < 0 ? -time : time;
			var seconds = Math.floor(time % 60);
			return prefix(seconds) + seconds ;
		},

		sss: function sss(time) {
			time = time < 0 ? -time : time;
			var seconds = time % 60;
			return prefix(seconds) + toMaxDecimals(precision, seconds);
		},

		ms: function ms(time) {
			time = time < 0 ? -time : time;
			var ms = Math.floor(secondsToMilliseconds(time % 1));
			return ms >= 100 ? ms :
				ms >= 10 ? '0' + ms :
				'00' + ms ;
		}
	};

	function createTime(match, sign, hh, mm, sss) {
		var time = hoursToSeconds(parseInt(hh, 10)) + (
			mm ? minutesToSeconds(parseInt(mm, 10)) + (
				sss ? parseFloat(sss, 10) : 0
			) : 0
		);

		return sign === '-' ? -time : time ;
	}

	function formatTime(string, time) {
		return string.replace(rtoken, function($0) {
			return timeFormatters[$0] ? timeFormatters[$0](time) : $0 ;
		}) ;
	}

	function formatTimeISO(time) {
		var sign = time < 0 ? '-' : '' ;

		if (time < 0) { time = -time; }

		var hours = Math.floor(time / 3600);
		var hh = prefix(hours) + hours ;
		time = time % 3600;
		if (time === 0) { return sign + hh + ':00'; }

		var minutes = Math.floor(time / 60);
		var mm = prefix(minutes) + minutes ;
		time = time % 60;
		if (time === 0) { return sign + hh + ':' + mm; }

		var sss = prefix(time) + toMaxDecimals(precision, time);
		return sign + hh + ':' + mm + ':' + sss;
	}

	function toMaxDecimals(precision, n) {
		// Make some effort to keep rounding errors under control by fixing
		// decimals and lopping off trailing zeros
		return n.toFixed(precision).replace(/\.?0+$/, '');
	}

	assign(Fn, {
		nowTime: function() {
			return window.performance.now();
		},

		parseTime: parseTime,

		formatTime: curry(function(string, time) {
			return string === 'ISO' ?
				formatTimeISO(parseTime(time)) :
				formatTime(string, parseTime(time)) ;
		}),

		formatTimeISO: function(time) {
			// Undefined causes problems by outputting dates full of NaNs
			return time === undefined ? undefined : formatTimeISO(time);
		},

		addTime: curry(function(time1, time2) {
			return parseTime(time2) + parseTimeDiff(time1);
		}),

		subTime: curry(function(time1, time2) {
			return parseTime(time2) - parseTimeDiff(time1);
		}),

		diffTime: curry(function(time1, time2) {
			return parseTime(time1) - parseTime(time2);
		}),

		floorTime: curry(function(token, time) {
			return floorTime(token, parseTime(time));
		}),

		secondsToMilliseconds: secondsToMilliseconds,
		secondsToMinutes:      secondsToMinutes,
		secondsToHours:        secondsToHours,
		secondsToDays:         secondsToDays,
		secondsToWeeks:        secondsToWeeks,

		millisecondsToSeconds: millisecondsToSeconds,
		minutesToSeconds:      minutesToSeconds,
		hoursToSeconds:        hoursToSeconds,
		daysToSeconds:         daysToSeconds,
		weeksToSeconds:        weeksToSeconds,
	});


	// Export

	/* A bad idea, probably, extending Date.prototype. Tempting, though.

	assign(Date.prototype, {
		add: function(datetime) {
			return addDate(datetime, this);
		},

		floor: function(token) {
			return floorDate(token, this);
		}
	});

	*/

	window.Time = Time;

})(this);
