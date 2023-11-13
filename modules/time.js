
import { mod }   from './mod.js';
import curry     from './curry.js';
import choose    from './choose.js';
import exec      from './exec.js';
import id        from './id.js';
import overload  from './overload.js';
import toType    from './to-type.js';


// Time

// Decimal places to round to when comparing times
const precision = 9;

// Find template tokens for replacement
var rtoken = /(`[^`]*`)|(ms|[YMwdhms]{1,3}|±)/g;

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

// Months and years are not fixed durations – these are approximate
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

/**
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
**/

export const parseTime = overload(toType, {
	number:  id,
	string:  exec(rtime, createTime),
	default: function(object) {
		throw new Error('parseTime() does not accept objects of type ' + (typeof object));
	}
});

export const parseTimeDiff = overload(toType, {
	number:  id,
	string:  exec(rtimediff, createTime),
	default: function(object) {
		throw new Error('parseTime() does not accept objects of type ' + (typeof object));
	}
});


function createTime(match) {
	const [unused, sign, hh, mm, sss] = match;
	var time = hoursToSeconds(parseInt(hh, 10))
        + (mm ? minutesToSeconds(parseInt(mm, 10))
            + (sss ? parseFloat(sss, 10) : 0)
        : 0) ;

	return sign === '-' ? -time : time ;
}

function formatTimeString(string, time) {
	return string.replace(rtoken, ($0, $1, $2) =>
		$1 ?
			$1.slice(1, -1) :
			timeFormatters[$0] ? timeFormatters[$0](time) : $0
	) ;
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


/**
formatTime(format, time)
Formats `time`, an 'hh:mm:ss' time string or a number in seconds, to match
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

To include words in the format that contain letters used by the formatter,
quote them using backticks.

```
const hours = formatTime('h `hours`', 3600);   // 1 hours
```
**/

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

	w: function W(time) {
		time = time < 0 ? -time : time;
		return Math.floor(secondsToWeeks(time));
	},

	ww: function WW(time) {
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
		return minutes;
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

export const formatTime = curry(function(format, time) {
	return format === 'ISO' ?
		_formatTimeISO(parseTime(time)) :
		formatTimeString(format, parseTime(time)) ;
});

/**
formatTimeISO(time)
Formats `time`, an 'hh:mm:sss' time string or a number in seconds, as a string
in the ISO time format.
```
**/

export function formatTimeISO(time) {
	// Undefined causes problems by outputting dates full of NaNs
	return time === undefined ? undefined : _formatTimeISO(time);
}

/**
addTime(time1, time2)

Sums `time2` and `time1`, which may be 'hh:mm:sss' time strings or numbers in
seconds, and returns time as a number in seconds. `time1` may contain hours
outside the range 0-24 or minutes or seconds outside the range 0-60. For
example, to add 75 minutes to a list of times you may write:

```
const laters = times.map(addTime('00:75'));
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

/**
floorTime(token, time)

Floors time to the start of the nearest `token`, where `token` is one of:

- `'w'`   Week
- `'d'`   Day
- `'h'`   Hour
- `'m'`   Minute
- `'s'`   Second
- `'ms'`  Millisecond

`time` may be an ISO time string or a time in seconds. Returns a time in seconds.

```
const hourCounts = times.map(floorTime('h'));
```
**/

var _floorTime = choose({
	w:  function(time) { return time - mod(604800, time); },
	d:  function(time) { return time - mod(86400, time); },
	h:  function(time) { return time - mod(3600, time); },
	m:  function(time) { return time - mod(60, time); },
	s:  function(time) { return time - mod(1, time); },
	ms: function(time) { return time - mod(0.001, time); }
});

export const floorTime = curry(function(token, time) {
	return _floorTime(token, parseTime(time));
});
