(function(window) {
	"use strict";

	var Fn = window.Fn;

	// Be generous with the input we accept.
	var rdate     = /^(-)?(\d{4})(?:-(\d+))?(?:-(\d+))?$/;
	var rtime     = /^(-)?(\d+):(\d+)(?::(\d+(?:\.\d+)?))?$/;
	//var rdatetime = /^(-)?(\d+)-(0[0-9]|1[12])-([0-2][0-9]|3[01])T([01][0-9]|2[0-3]):([0-5][0-9])(?::([0-5][0-9](?:\.\d+)?))?/;
	//var rtimezone = /(?:Z|[+-]\d{2}:\d{2})$/;
	//var rnonzeronumbers = /[1-9]/;

	var days = { mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6, sun: 0 };

	function createList(ordinals) {
		var array = [], n = 0;

		while (n++ < 31) {
			array[n] = ordinals[n] || ordinals.n;
		}

		return array;
	}

	var locales = {
		'en': {
			days:     ('Sunday Monday Tuesday Wednesday Thursday Friday Saturday').split(' '),
			months:   ('January February March April May June July August September October November December').split(' '),
			ordinals: createList({ n: 'th', 1: 'st', 2: 'nd', 3: 'rd', 21: 'st', 22: 'nd', 23: 'rd', 31: 'st' })
		},

		'fr': {
			days:     ('dimanche lundi mardi mercredi jeudi vendredi samedi').split(' '),
			months:   ('janvier février mars avril mai juin juillet août septembre octobre novembre décembre').split(' '),
			ordinals: createList({ n: "ième", 1: "er" })
		},

		'de': {
			days:     ('Sonntag Montag Dienstag Mittwoch Donnerstag Freitag Samstag').split(' '),
			months:   ('Januar Februar März April Mai Juni Juli Oktober September Oktober November Dezember').split(' '),
			ordinals: createList({ n: "er" })
		},

		'it': {
			days:     ('domenica lunedì martedì mercoledì giovedì venerdì sabato').split(' '),
			months:   ('gennaio febbraio marzo aprile maggio giugno luglio agosto settembre ottobre novembre dicembre').split(' '),
			ordinals: createList({ n: "o" })
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
		var tokens = rtime.exec(time) ;

		if (!tokens) { throw new Error('Time: "' + time + '" does not parse as time.'); }

		var sign = tokens[1] ? -1 : 1 ;

		if (Fn.isDefined(tokens[4])) { date.setUTCMilliseconds(date.getUTCMilliseconds() + sign * parseFloat(tokens[4]) * 1000); }
		if (Fn.isDefined(tokens[3])) { date.setUTCMinutes(date.getUTCMinutes() + sign * parseInt(tokens[3], 10)); }
		if (Fn.isDefined(tokens[2])) { date.setUTCHours(date.getUTCHours() + sign * parseInt(tokens[2], 10)); }

		return date;
	}

	function addDateToDate(time, date) {
		var tokens = rdate.exec(time) ;

		if (!tokens) { throw new Error('Time: "' + time + '" does not parse as date.'); }

		var sign = tokens[1] ? -1 : 1 ;

		if (Fn.isDefined(tokens[4])) { date.setUTCDate(date.getUTCDate() + sign * parseInt(tokens[4], 10)); }
		if (Fn.isDefined(tokens[3])) { date.setUTCMonth(date.getUTCMonth() + sign * parseInt(tokens[3], 10)); }
		if (Fn.isDefined(tokens[2])) { date.setUTCFullYear(date.getUTCFullYear() + sign * parseInt(tokens[2], 10)); }

		return date;
	}

	function Time(time) {
		if (!Time.prototype.isPrototypeOf(this)) {
			return new Time(time);
		}

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
			var date  = new Date(this.toDate());

			return new Time(rdate.test(time) ?
				addDateToDate(time, date) :
				addTimeToDate(time, date)
			);
		},

		floor: function(grain) {
			// Take a day string or number, find the last matching day
			var day = typeof grain === 'number' ?
				grain :
				days[grain] ;

			var date = new Date(this.toDate());

			if (!Fn.isDefined(day)) {
				date.setUTCMilliseconds(0);
				if (grain === 'second') { return new Time(date); }

				date.setUTCSeconds(0);
				if (grain === 'minute') { return new Time(date); }

				date.setUTCMinutes(0);
				if (grain === 'hour') { return new Time(date); }

				date.setUTCHours(0);
				if (grain === 'day') { return new Time(date); }

				// Todo: .floor('week')
				//date.setUTCHours(0);
				//if (grain === 'week') { return new Time(date); }

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

			var diff = currentDay - day;

			if (diff < 0) { diff = diff + 7; }

			return this.add('-0000-00-0' + diff);
		},

		render: (function() {
			var rletter = /(th|ms|[YZMDdHhmsz]{1,4}|[a-zA-Z])/g;

			return function render(string, lang) {
				var date = this.toDate();
				return string.replace(rletter, function($0, $1) {
					return Time.format[$1] ? Time.format[$1](date, lang) : $1 ;
				});
			};
		})(),

		toTimestamp: function() {
			return +this.toDate() / 1000;
		}
	});

	// .toString() enables comparisons of the genre time1 > time2,
	// but not equality checking (which does not coerce to string).
	Time.prototype.toString = Time.prototype.toJSON;

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
	});

	Object.assign(Time, {
		now: function() {
			return Time(new Date());
		},

		format: {
			YYYY: function(date) { return ('000' + date.getFullYear()).slice(-4); },
			YY:   function(date) { return ('0' + date.getFullYear() % 100).slice(-2); },
			MM:   function(date) { return ('0' + (date.getMonth() + 1)).slice(-2); },
			MMM:  function(date) { return this.MMMM(date).slice(0,3); },
			MMMM: function(date, lang) { return locales[lang || Time.lang].months[date.getMonth()]; },
			D:    function(date) { return '' + date.getDate(); },
			DD:   function(date) { return ('0' + date.getDate()).slice(-2); },
			ddd:  function(date) { return this.dddd(date).slice(0,3); },
			dddd: function(date, lang) { return locales[lang || Time.lang].days[date.getDay()]; },
			HH:   function(date) { return ('0' + date.getHours()).slice(-2); },
			hh:   function(date) { return ('0' + date.getHours() % 12).slice(-2); },
			mm:   function(date) { return ('0' + date.getMinutes()).slice(-2); },
			ss:   function(date) { return ('0' + date.getSeconds()).slice(-2); },
			sss:  function(date) { return (date.getSeconds() + date.getMilliseconds() / 1000 + '').replace(/^\d\.|^\d$/, function($0){ return '0' + $0; }); },
			ms:   function(date) { return '' + date.getMilliseconds(); },

			// Experimental
			am: function(date) { return date.getHours() < 12 ? 'am' : 'pm'; },
			zz: function(date) {
				return (date.getTimezoneOffset() < 0 ? '+' : '-') +
					 ('0' + Math.round(100 * Math.abs(date.getTimezoneOffset()) / 60)).slice(-4) ;
			},
			th: function(date, lang) { return locales[lang || Time.lang].ordinals[date.getDate()]; },
			n:  function(date) { return +date; },
			ZZ: function(date) { return -date.getTimezoneOffset() * 60; }
		},

		locales: locales
	});

	Object.defineProperty(Time, 'lang', {
		get: function() {
			var lang = document.documentElement.lang;
			return lang && Time.locales[lang] ? lang : 'en';
		},

		enumerable: true
	});

	window.Time = Time;
})(this);
