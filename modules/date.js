
import mod       from './mod.js';
import curry     from './curry.js';
import overload  from './overload.js';
import toType    from './to-type.js';
import toClass   from './to-class.js';
import exec      from './exec.js';
import { parseTimeDiff } from './time.js';

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

/**
parseDate(date)

Parse a date, where, `date` may be:

- a string in ISO date format
- a number in seconds UNIX time
- a date object

Returns a date object (or *the* date object, if it represents a valid date).
**/

export const parseDate = overload(toType, {
	number:  secondsToDate,
	string:  exec(rdate, createDate),
	object:  function(date) {
		return isValidDate(date) ?
			date : 
			undefined ;
	},
	default: function(date) {
        throw new TypeError('parseDate(date) date is not of a supported type (' + (typeof date) + ')');
    }
});

/**
parseDateLocal(date)

As `parseDate(date)`, but returns a date object with local time set to the
result of the parse.
**/

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

function createDate(match) {
	const [unused, year, mon, day, hour, minute, second, ms, zone, zoneHour, zoneMinute] = match;

	// Month must be 0-indexed for the Date constructor
	const month = parseInt(mon, 10) - 1;

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

function createDateLocal(match) {
	const [unused, year, mon, day, hour, minute, second, ms, zone] = match;

	if (zone) {
		throw new Error('createDateLocal() will not parse a string with a time zone "' + zone + '".');
	}

	// Month must be 0-indexed for the Date constructor
	const month = parseInt(mon, 10) - 1;

	return ms ?  new Date(year, month, day, hour, minute, second, ms) :
		second ? new Date(year, month, day, hour, minute, second) :
		minute ? new Date(year, month, day, hour, minute) :
		hour ?   new Date(year, month, day, hour) :
		day ?    new Date(year, month, day) :
		month ?  new Date(year, month) :
		new Date(year) ;
}

function secondsToDate(n) {
	return new Date(n * 1000);
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
	MMMM: function(date, lang) { return langs[lang].months[date.getMonth()]; },
	D:    function(date)       { return '' + date.getDate(); },
	DD:   function(date)       { return ('0' + date.getDate()).slice(-2); },
	ddd:  function(date, lang) { return this.dddd(date, lang).slice(0,3); },
	dddd: function(date, lang) { return langs[lang].days[date.getDay()]; },
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
	th:   function(date, lang) { return langs[lang].ordinals[date.getDate()]; },
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

/**
formatDate(format, locale, timezone, date)
Formats `date`, an ISO string or number in seconds or a JS date object,
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

The `locale` string may be `'en'` or `'fr'`. The `'timezone'` parameter is
either `'UTC'` or an IANA timezone such as '`Europe/Zurich`'
([timezones on Wikipedia](https://en.wikipedia.org/wiki/List_of_tz_database_time_zones)).

```
const date = formatDate('YYYY', 'en', 'UTC', new Date());   // 2020
```
*/

export const formatDate = curry(function (format, locale, timezone, date) {
	return format === 'ISO' ?
		formatDateISO(parseDate(date)) :
	timezone === 'local' ?
		formatDateLocal(format, locale, date) :
	_formatDate(format, timezone, locale, parseDate(date)) ;
});

/**
formatDateLocal(format, locale, date)

As `formatDate()`, but returns a date object with local time set to the
result of the parse.
**/

export function formatDateLocal(format, locale, date) {
	var formatters = dateFormatters;
	var lang = locale.slice(0, 2);

	// Use date formatters to get time as current local time
	return format.replace(rtoken, function($0) {
		return formatters[$0] ? formatters[$0](date, lang) : $0 ;
	});
}

/**
formatDateISO(date)
Formats `date` (a string or a number or date accepted by `parseDate()`) as
a string in the ISO date format.
*/

export function formatDateISO(date) {
	return rdatejson.exec(JSON.stringify(parseDate(date)))[1];
}

/**
formatDateTimeISO(date)
Formats `date` (a string or a number or date accepted by `parseDate()`) as
a string in the ISO datetime format.
*/

export function formatDateTimeISO(date) {
	return JSON.stringify(parseDate(date)).slice(1,-1);
}



// Time operations

var days   = {
	mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6, sun: 0
};



/*
toDay(date)
Returns day of week as a number, where monday is `0`.
*/

const dayMap = [6,0,1,2,3,4,5];

export function toDay(date) {
	return dayMap[date.getDay()];
}

/*
cloneDate(date)
Returns new date object set to same date.
*/

export function cloneDate(date) {
	return new Date(+date);
}

function addDateComponents(sign, yy, mm, dd, date) {
	date.setUTCFullYear(date.getUTCFullYear() + sign * parseInt(yy, 10));

	if (!mm) { return; }

	// Adding and subtracting months can give weird results with the JS
	// date object. For example, taking a month away from 2018-03-31 results
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

/**
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

/**
floorDate(token, date)
Floors date to the start of nearest calendar point in increment indicated
by `token`:

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
const dayCounts = times.map(floorDate('d'));
```
*/

export const floorDate = curry(function(token, date) {
	return _floorDate(token, parseDate(date));
});
