
import { mod }   from './maths/mod.js';
import curry     from './curry.js';
import choose    from './choose.js';
import id        from './id.js';
import overload  from './overload.js';
import toType    from './to-type.js';
import toClass   from './to-class.js';

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

/*
parseDate(date)
Parse a date, where, `date` may be:

- a string in ISO date format
- a number in seconds UNIX time
- a date object

Returns a date object, or *the* date object, if it validates.
*/

export const parseDate = overload(toType, {
	number:  secondsToDate,
	string:  exec(rdate, createDate),
	object:  function(date) {
		return isValidDate(date) ? date : undefined ;
	},
	default: function(date) {
        throw new TypeError('parseDate(date) date is not of a supported type (' + (typeof date) + ')');
    }
});

/*
parseDateLocal(date)
As `parseDate(date)`, but returns a date object with local time set to the
result of the parse (or the original date object, if it validates).
*/

export const parseDateLocal = overload(toType, {
	number:  secondsToDate,
	string:  exec(rdate, createDateLocal),
	object:  function(date) {
		return isValidDate(date) ? date : undefined ;
	},
	default: function(date) {
        throw new TypeError('parseDateLocal: date is not of a supported type (number, string, Date)');
    }
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
		throw new Error('createDateLocal() will not parse a string with a time zone "' + zone + '".');
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
	DDD:  function(data)       { return data.weekday.slice(0,3); },
	DDDD: function(data, lang) { return data.weekday; },
	hh:   function(data)       { return data.hour; },
	//hh:   function(data)       { return ('0' + data.hour % 12).slice(-2); },
	mm:   function(data)       { return data.minute; },
	ss:   function(data)       { return data.second; },
	//sss:  function(data)       { return (date.second + date.getMilliseconds() / 1000 + '').replace(/^\d\.|^\d$/, function($0){ return '0' + $0; }); },
	//ms:   function(data)       { return '' + date.getMilliseconds(); },
};

var componentKeys = {
	// Components, in order of appearance in the locale string
	'en-US': ['weekday', 'month', 'day', 'year', 'hour', 'minute', 'second'],
	// fr: "lundi 12/02/2018 à 18:54:09" (different in IE/Edge, of course)
	// de: "Montag, 12.02.2018, 19:28:39" (different in IE/Edge, of course)
	default: ['weekday', 'day', 'month', 'year', 'hour', 'minute', 'second']
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

var rtoken    = /([YZMDdhmswz]{2,4}|D|\+-)/g;
var rusdate   = /\w{3,}|\d+/g;
var rdatejson = /^"(-?\d{4,}-\d\d-\d\d)/;

function matchEach(regex, fn, text) {
	var match = regex.exec(text);
	if (!match) { return; }
	fn.apply(null, match);
	matchEach(regex, fn, text);
}

function toLocaleString(timezone, locale, date) {
	options.timeZone = timezone || 'UTC';
	var string = date.toLocaleString(locale, options);
	return string;
}

function toLocaleComponents(timezone, locale, date) {
	var localedate = toLocaleString(timezone, locale, date);
	var components = {};
	var keys       = componentKeys[locale] || componentKeys.default;
	var i          = 0;

	matchEach(rusdate, function(value) {
		components[keys[i++]] = value;
	}, localedate);

	components.milliseconds = +date % 1000;
	return components;
}

function _formatDate(string, timezone, locale, date) {
	// Derive lang from locale
	var lang = locale ? locale.slice(0,2) : document.documentElement.lang ;

	// Todo: only en-US and fr supported for the time being
	locale = locale === 'en' ? 'en-US' :
		locale ? locale :
		'en-US';

	var data    = toLocaleComponents(timezone, locale, date);
	var formats = componentFormatters;

	return string.replace(rtoken, function($0) {
		return formats[$0] ?
			formats[$0](data, lang) :
			$0 ;
	});
}

/*
formatDateLocal(format, locale, date)
*/

export function formatDateLocal(string, locale, date) {
	var formatters = dateFormatters;
	var lang = locale.slice(0, 2);

	// Use date formatters to get time as current local time
	return string.replace(rtoken, function($0) {
		return formatters[$0] ? formatters[$0](date, lang) : $0 ;
	});
}

/*
formatDateISO(date)
Formats `date` (a string or a number or date accepted by `parseDate(date)`) as
a string in the ISO date format.
*/

export function formatDateISO(date) {
	return rdatejson.exec(JSON.stringify(parseDate(date)))[1];
}

/*
formatDateTimeISO(date)
Formats `date` (a string or a number or date accepted by `parseDate(date)`) as
a string in the ISO datetime format.
*/

export function formatDateTimeISO(date) {
	return JSON.stringify(parseDate(date)).slice(1,-1);
}


// Time operations

var days   = {
	mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6, sun: 0
};

var dayMap = [6,0,1,2,3,4,5];

/*
toDay(date)
Returns day of week as a number, where monday is `0`.
*/

export function toDay(date) {
	return dayMap[date.getDay()];
}

/*
cloneDate(date)
Returns new date object set to same time.
*/

export function cloneDate(date) {
	return new Date(+date);
}

function addDateComponents(sign, yy, mm, dd, date) {
	date.setUTCFullYear(date.getUTCFullYear() + sign * parseInt(yy, 10));

	if (!mm) { return; }

	// Adding and subtracting months can give weird results with the JS
	// date object. For example, taking a montha way from 2018-03-31 results
	// in 2018-03-03 (or the 31st of February), whereas adding a month on to
	// 2018-05-31 results in the 2018-07-01 (31st of June).
	//
	// To mitigate this weirdness track the target month and roll days back
	// until the month is correct, like Python's relativedelta utility:
	// https://dateutil.readthedocs.io/en/stable/relativedelta.html#examples
	var month       = date.getUTCMonth();
	var monthDiff   = sign * parseInt(mm, 10);
	var monthTarget = mod(12, month + monthDiff);

	date.setUTCMonth(month + monthDiff);

	// If the month is too far in the future scan backwards through
	// months until it fits. Setting date to 0 means setting to last
	// day of previous month.
	while (date.getUTCMonth() > monthTarget) { date.setUTCDate(0); }

	if (!dd) { return; }

	date.setUTCDate(date.getUTCDate() + sign * parseInt(dd, 10));
}

function _addDate(duration, date) {
	// Don't mutate the original date
	date = cloneDate(date);

	// First parse the date portion duration and add that to date
	var tokens = rdatediff.exec(duration) ;
	var sign = 1;

	if (tokens) {
		sign = tokens[1] === '-' ? -1 : 1 ;
		addDateComponents(sign, tokens[2], tokens[3], tokens[4], date);

		// If there is no 'T' separator go no further
		if (!tokens[5]) { return date; }

		// Prepare duration for time parsing
		duration = duration.slice(tokens[0].length);

		// Protect against parsing a stray sign before time
		if (duration[0] === '-') { return date; }
	}

	// Then parse the time portion and add that to date
	var time = parseTimeDiff(duration);
	if (time === undefined) { return; }

	date.setTime(date.getTime() + sign * time * 1000);
	return date;
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

function _diffDateDays(date1, date2) {
	var d1 = parseDate(date1);
	var d2 = parseDate(date2);

	return d2 > d1 ?
		// 3rd argument mutates, so make sure we get a clean date if we
		// have not just made one.
		diff(0, d1, d2 === date2 || d1 === d2 ? cloneDate(d2) : d2) :
		diff(0, d2, d1 === date1 || d2 === d1 ? cloneDate(d1) : d1) * -1 ;
}

function floorDateByGrain(token, date) {
	var diff, week;

	if (token === 'ms') { return date; }

	date.setUTCMilliseconds(0);
	if (token === 's') { return date; }

	date.setUTCSeconds(0);
	if (token === 'm') { return date; }

	date.setUTCMinutes(0);
	if (token === 'h') { return date; }

	date.setUTCHours(0);
	if (token === 'd') { return date; }

	if (token === 'w') {
		date.setDate(date.getDate() - toDay(date));
		return date;
	}

	if (token === 'fortnight') {
		week = floorDateByDay(1, new Date());
		diff = mod(14, _diffDateDays(week, date));
		date.setUTCDate(date.getUTCDate() - diff);
		return date;
	}

	date.setUTCDate(1);
	if (token === 'M') { return date; }

	date.setUTCMonth(0);
	if (token === 'Y') { return date; }

	date.setUTCFullYear(0);
	return date;
}

function floorDateByDay(day, date) {
	var currentDay = date.getUTCDay();

	// If we are on the specified day, return this date
	if (day === currentDay) { return date; }

	var diff = currentDay - day;
	if (diff < 0) { diff = diff + 7; }
	return _addDate('-0000-00-0' + diff, date);
}

function _floorDate(token, date) {
	// Clone date before mutating it
	date = cloneDate(date);
	return typeof token === 'number' ? floorDateByDay(token, date) :
        days[token] ? floorDateByDay(days[token], date) :
	    floorDateByGrain(token, date) ;
}

export function nowDate() {
	return new Date();
}

export function dateDiff(d1, d2) {
	return +parseDate(d2) - +parseDate(d1);
}

export function toTimestamp(date) {
	return date.getTime() / 1000;
}

/*
addDate(diff, date)
Sums `diff` and `date`, where `diff` is a string in ISO date format. Returns
a new date object.

```
const addWeek = addDate('0000-00-07');
const sameTimeNextWeek = addWeek(new Date());
```
*/

export const addDate = curry(function(diff, date) {
	return _addDate(diff, parseDate(date));
});

export const diffDateDays = curry(_diffDateDays);

/*
floorDate(token, date)
Floors date to the start of nearest calendar point in time indicated by `token`:

- `'Y'`   Year
- `'M'`   Month
- `'w'`   Week
- `'d'`   Day
- `'h'`   Hour
- `'m'`   Minute
- `'s'`   Second
- `'mon'` Monday
- `'tue'` Tuesday
- `'wed'` Wednesday
- `'thu'` Thursday
- `'fri'` Friday
- `'sat'` Saturday
- `'sun'` Sunday

```
const dayCounts = times.map(floorTime('days'));
```
*/

export const floorDate = curry(function(token, date) {
	return _floorDate(token, parseDate(date));
});

/*
formatDate(locale, timezone, format, date)
Formats `date` (a string or number or date accepted by `parseDate(date)`)
to the format of the string `format`. The format string may contain the tokens:

- `'YYYY'` years
- `'YY'`   2-digit year
- `'MM'`   month, 2-digit
- `'MMM'`  month, 3-letter
- `'MMMM'` month, full name
- `'D'`    day of week
- `'DD'`   day of week, two-digit
- `'DDD'`  weekday, 3-letter
- `'DDDD'` weekday, full name
- `'hh'`   hours
- `'mm'`   minutes
- `'ss'`   seconds

```
const date = formatDate('en', '', 'YYYY', new Date());   // 2020
```
*/

export const formatDate = curry(function (timezone, locale, format, date) {
	return format === 'ISO' ?
		formatDateISO(parseDate(date)) :
	timezone === 'local' ?
		formatDateLocal(format, locale, date) :
	_formatDate(format, timezone, locale, parseDate(date)) ;
});


// Time

// Decimal places to round to when comparing times
var precision = 9;

export function millisecondsToSeconds(n) { return n / 1000; }
export function minutesToSeconds(n) { return n * 60; }
export function hoursToSeconds(n) { return n * 3600; }
export function daysToSeconds(n) { return n * 86400; }
export function weeksToSeconds(n) { return n * 604800; }

export function secondsToMilliseconds(n) { return n * 1000; }
export function secondsToMinutes(n) { return n / 60; }
export function secondsToHours(n) { return n / 3600; }
export function secondsToDays(n) { return n / 86400; }
export function secondsToWeeks(n) { return n / 604800; }

/* Months and years are not fixed durations – these are approximate */
export function secondsToMonths(n) { return n / 2629800; }
export function secondsToYears(n) { return n / 31557600; }


function prefix(n) {
	return n >= 10 ? '' : '0';
}

// Hours:   00-23 - 24 should be allowed according to spec
// Minutes: 00-59 -
// Seconds: 00-60 - 60 is allowed, denoting a leap second

//                sign   hh       mm           ss
var rtime     = /^([+-])?(\d{2,}):([0-5]\d)(?::((?:[0-5]\d|60)(?:.\d+)?))?$/;
var rtimediff = /^([+-])?(\d{2,}):(\d{2,})(?::(\d{2,}(?:.\d+)?))?$/;

/*
parseTime(time)

Where `time` is a string it is parsed as a time in ISO time format: as
hours `'13'`, with minutes `'13:25'`, with seconds `'13:25:14'` or with
decimal seconds `'13:25:14.001'`. Returns a number in seconds.

```
const time = parseTime('13:25:14.001');   // 48314.001
```

Where `time` is a number it is assumed to represent a time in seconds
and is returned directly.

```
const time = parseTime(60);               // 60
```
*/

export const parseTime = overload(toType, {
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

var _floorTime = choose({
	week:   function(time) { return time - mod(604800, time); },
	day:    function(time) { return time - mod(86400, time); },
	hour:   function(time) { return time - mod(3600, time); },
	minute: function(time) { return time - mod(60, time); },
	second: function(time) { return time - mod(1, time); }
});


function createTime(match, sign, hh, mm, sss) {
	var time = hoursToSeconds(parseInt(hh, 10))
        + (mm ? minutesToSeconds(parseInt(mm, 10))
            + (sss ? parseFloat(sss, 10) : 0)
        : 0) ;

	return sign === '-' ? -time : time ;
}

function formatTimeString(string, time) {
	return string.replace(rtoken, function($0) {
		return timeFormatters[$0] ? timeFormatters[$0](time) : $0 ;
	}) ;
}

function _formatTimeISO(time) {
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


export const nowTime = function() {
	return window.performance.now();
};

/*
formatTime(format, time)
Formats `time` (an 'hh:mm:sss' time string or a number in seconds) to match
`format`, a string that may contain the tokens:

- `'±'`   Sign, renders '-' if time is negative, otherwise nothing
- `'Y'`   Years, approx.
- `'M'`   Months, approx.
- `'MM'`  Months, remainder from years (max 12), approx.
- `'w'`   Weeks
- `'ww'`  Weeks, remainder from months (max 4)
- `'d'`   Days
- `'dd'`  Days, remainder from weeks (max 7)
- `'h'`   Hours
- `'hh'`  Hours, remainder from days (max 24), 2-digit format
- `'m'`   Minutes
- `'mm'`  Minutes, remainder from hours (max 60), 2-digit format
- `'s'`   Seconds
- `'ss'`  Seconds, remainder from minutes (max 60), 2-digit format
- `'sss'` Seconds, remainder from minutes (max 60), fractional
- `'ms'`  Milliseconds, remainder from seconds (max 1000), 3-digit format

```
const time = formatTime('±hh:mm:ss', 3600);   // 01:00:00
```
*/

var timeFormatters = {
	'±': function sign(time) {
		return time < 0 ? '-' : '';
	},

	Y: function Y(time) {
		time = time < 0 ? -time : time;
		return Math.floor(secondsToYears(time));
	},

	M: function M(time) {
		time = time < 0 ? -time : time;
		return Math.floor(secondsToMonths(time));
	},

	MM: function MM(time) {
		time = time < 0 ? -time : time;
		return Math.floor(secondsToMonths(time % 31557600));
	},

	W: function W(time) {
		time = time < 0 ? -time : time;
		return Math.floor(secondsToWeeks(time));
	},

	WW: function WW(time) {
		time = time < 0 ? -time : time;
		return Math.floor(secondsToDays(time % 2629800));
	},

	d: function dd(time) {
		time = time < 0 ? -time : time;
		return Math.floor(secondsToDays(time));
	},

	dd: function dd(time) {
		time = time < 0 ? -time : time;
		return Math.floor(secondsToDays(time % 604800));
	},

	h: function hhh(time) {
		time = time < 0 ? -time : time;
		return Math.floor(secondsToHours(time));
	},

	hh: function hh(time) {
		time = time < 0 ? -time : time;
		var hours = Math.floor(secondsToHours(time % 86400));
		return prefix(hours) + hours;
	},

	m: function mm(time) {
		time = time < 0 ? -time : time;
		var minutes = Math.floor(secondsToMinutes(time));
		return prefix(minutes) + minutes;
	},

	mm: function mm(time) {
		time = time < 0 ? -time : time;
		var minutes = Math.floor(secondsToMinutes(time % 3600));
		return prefix(minutes) + minutes;
	},

	s: function s(time) {
		time = time < 0 ? -time : time;
		return Math.floor(time);
	},

	ss: function ss(time) {
		time = time < 0 ? -time : time;
		var seconds = Math.floor(time % 60);
		return prefix(seconds) + seconds;
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
				'00' + ms;
	}
};

export const formatTime = curry(function(string, time) {
	return string === 'ISO' ?
		_formatTimeISO(parseTime(time)) :
		formatTimeString(string, parseTime(time)) ;
});

/*
formatTimeISO(time)
Formats `time` (a string or a number accepted by `parseTime(time)`) as
a string in the ISO time format.
```
*/

export function formatTimeISO(time) {
	// Undefined causes problems by outputting dates full of NaNs
	return time === undefined ? undefined : _formatTimeISO(time);
}

/*
addTime(time1, time2)
Sums `time2` and `time1`, returning UNIX time as a number in seconds.
If `time1` is a string, it is parsed as a duration, where numbers
are accepted outside the bounds of 0-24 hours or 0-60 minutes or seconds.
For example, to add 72 minutes to a list of times:

```
const laters = times.map(addTime('00:72'));
```
*/

export const addTime = curry(function(time1, time2) {
	return parseTime(time2) + parseTimeDiff(time1);
});

export const subTime = curry(function(time1, time2) {
	return parseTime(time2) - parseTimeDiff(time1);
});

export const diffTime = curry(function(time1, time2) {
	return parseTime(time1) - parseTime(time2);
});

/*
floorTime(token, time)
Floors `time` to the nearest `token`, where `token` is one of: `'week'`, `'day'`,
`'hour'`, `'minute'` or `'second'`. `time` may be an ISO time string or a time
in seconds. Returns a time in seconds.

```
const hourCounts = times.map(floorTime('hour'));
```
*/

export const floorTime = curry(function(token, time) {
	return _floorTime(token, parseTime(time));
});
